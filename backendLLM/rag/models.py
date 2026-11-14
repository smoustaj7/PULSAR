"""The two small models behind the search: one turns text into meaning vectors, the other
reads a question and a passage together and scores how well the passage answers it."""

import torch
from huggingface_hub import snapshot_download
from transformers import AutoModel, AutoModelForSequenceClassification, AutoTokenizer


def device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def local_or_hub(model_id: str) -> str:
    """The downloaded copy when there is one, so starting needs no network."""
    try:
        return snapshot_download(model_id, local_files_only=True)
    except Exception:
        return model_id


class Embedder:
    """Meaning vectors, one per text, unit length so a dot product is cosine similarity."""

    def __init__(self, model_id: str, query_prefix: str = "", batch_size: int = 32):
        self.device = device()
        source = local_or_hub(model_id)
        self.tokenizer = AutoTokenizer.from_pretrained(source)
        dtype = torch.float32 if self.device == "cpu" else torch.float16
        self.model = AutoModel.from_pretrained(source, dtype=dtype).to(self.device).eval()
        self.query_prefix = query_prefix
        self.batch_size = batch_size
        # BGE models are trained to use the first token's state as the text's vector.
        self.pool_first = "bge" in model_id.lower()

    @torch.inference_mode()
    def encode(self, texts: list[str], progress: bool = False) -> torch.Tensor:
        vectors = []
        for start in range(0, len(texts), self.batch_size):
            batch = self.tokenizer(
                texts[start : start + self.batch_size], padding=True, truncation=True, max_length=512, return_tensors="pt"
            ).to(self.device)
            states = self.model(**batch).last_hidden_state
            if self.pool_first:
                pooled = states[:, 0]
            else:
                mask = batch["attention_mask"].unsqueeze(-1).to(states.dtype)
                pooled = (states * mask).sum(1) / mask.sum(1)
            vectors.append(torch.nn.functional.normalize(pooled.float(), dim=-1).cpu())
            if progress and (start // self.batch_size) % 20 == 0:
                print(f"  embedded {start + len(batch['input_ids'])}/{len(texts)} passages", flush=True)
        return torch.cat(vectors) if vectors else torch.empty(0)

    def encode_query(self, query: str) -> torch.Tensor:
        return self.encode([self.query_prefix + query])[0]


class Reranker:
    """A cross-encoder: question and passage go through the model together, so it can check
    that the passage actually answers the question rather than just sharing its words."""

    def __init__(self, model_id: str, batch_size: int = 16):
        self.device = device()
        source = local_or_hub(model_id)
        self.tokenizer = AutoTokenizer.from_pretrained(source)
        dtype = torch.float32 if self.device == "cpu" else torch.float16
        self.model = AutoModelForSequenceClassification.from_pretrained(source, dtype=dtype).to(self.device).eval()
        self.batch_size = batch_size

    @torch.inference_mode()
    def score(self, query: str, passages: list[str]) -> list[float]:
        scores: list[float] = []
        for start in range(0, len(passages), self.batch_size):
            chunk = passages[start : start + self.batch_size]
            batch = self.tokenizer(
                [query] * len(chunk), chunk, padding=True, truncation="only_second", max_length=512, return_tensors="pt"
            ).to(self.device)
            scores += self.model(**batch).logits[:, 0].float().cpu().tolist()
        return scores
