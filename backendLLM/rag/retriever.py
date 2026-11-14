"""Finds the passages of the NASA reference library that answer a question.

  1. Keyword search (BM25) finds exact terms: "SANS", "CO2", "bisphosphonate".
  2. Meaning search (embeddings) finds the same idea in other words: "trouble sleeping" for
     "sleep loss".
  3. Hybrid: reciprocal rank fusion merges the two into 30 candidates.
  4. A cross-encoder rereads the question with each candidate and ranks them by how well they
     answer it. That ranking joins the other two in a final fusion, rather than replacing
     them: on rag/evaluate.py's questions the cross-encoder alone ranks slightly worse than
     hybrid, but as a third vote it puts an answer first more often than hybrid does
     (MRR 0.97 against 0.94). Its score also gates what is used: a passage scoring below the
     gate isn't relevant, so an off-topic question gets no passages at all.

Messages with nothing to look up (greetings, thanks) aren't searched at all. At most three
passages come from one document, and never two overlapping neighbours.
"""

import gzip
import hashlib
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path

import torch

from .index import BM25, Passage, make_passages, reciprocal_rank_fusion, tokenize, top

HERE = Path(__file__).parent
CORPUS = HERE / "corpus.jsonl.gz"
CACHE = HERE / ".cache"

EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "BAAI/bge-base-en-v1.5")
RERANK_MODEL = os.getenv("RAG_RERANK_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
# BGE models expect short questions to carry this instruction; passages go in as they are.
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
# The cross-encoder's score for the best candidate, below which nothing in the library is
# relevant. On rag/evaluate.py's questions the weakest real one scores about -0.3 and
# off-topic requests about -7 or lower.
GATE = float(os.getenv("RAG_GATE", "-3"))
# Words that carry nothing to look up: a message made only of these (and stopwords) is small talk.
SMALL_TALK = frozenset(
    "hi hello hey thank thx ok okay yes yeah no nope bye goodbye good great cool nice awesome fine "
    "morning afternoon evening night today please sure joke tell lol sorry welcome cheer help again".split()
)


def has_content(query: str) -> bool:
    return any(word not in SMALL_TALK for word in tokenize(query))


@dataclass
class Hit:
    passage: Passage
    score: float  # the cross-encoder's: above 0 the passage likely answers the question


def load_documents(path: Path = CORPUS) -> list[dict]:
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return [json.loads(line) for line in f]


class Library:
    def __init__(
        self,
        documents: list[dict] | None = None,
        embed_model: str = EMBED_MODEL,
        rerank_model: str = RERANK_MODEL,
        embedder=None,
        reranker=None,
        cache: Path | None = CACHE,
    ):
        """The library, ready to search. Tests pass their own `embedder` and `reranker` (any
        object with the same methods) and `cache=None`."""
        started = time.time()
        if embedder is None or reranker is None:
            from .models import Embedder, Reranker  # torch models load only when they're needed

            embedder = embedder or Embedder(embed_model, query_prefix=QUERY_PREFIX if "bge" in embed_model.lower() else "")
            reranker = reranker or Reranker(rerank_model)
        self.passages = make_passages(documents if documents is not None else load_documents())
        self.bm25 = BM25([p.searchable for p in self.passages])
        self.embedder, self.reranker = embedder, reranker
        self.vectors = self._vectors(embed_model, cache)
        docs = len({p.doc_id for p in self.passages})
        print(f"NASA library: {len(self.passages)} passages from {docs} documents, ready in {time.time() - started:.0f}s", flush=True)

    def _vectors(self, model_id: str, cache: Path | None) -> torch.Tensor:
        """Every passage's vector, computed once per library and model, then read from disk."""
        digest = hashlib.sha1(model_id.encode())
        for p in self.passages:
            digest.update(p.searchable.encode())
        path = cache / f"vectors-{digest.hexdigest()[:16]}.pt" if cache else None
        if path and path.exists():
            return torch.load(path)
        print(f"Embedding {len(self.passages)} passages with {model_id} (first start only)...", flush=True)
        vectors = self.embedder.encode([p.searchable for p in self.passages], progress=True).half()
        if path:
            path.parent.mkdir(exist_ok=True)
            torch.save(vectors, path)
        return vectors

    # The steps, kept separate so each can be measured on its own (see rag/evaluate.py).

    def keyword(self, query: str, n: int = 40) -> list[int]:
        return top(self.bm25.scores(query), n, matches_only=True)

    def semantic(self, query: str, n: int = 40) -> list[int]:
        similarity = self.vectors.float() @ self.embedder.encode_query(query)
        return top(similarity.numpy(), n)

    def hybrid(self, query: str, n: int = 40) -> list[int]:
        return reciprocal_rank_fusion([self.keyword(query, n), self.semantic(query, n)])

    def rerank(self, query: str, ids: list[int]) -> list[Hit]:
        scores = self.reranker.score(query, [self.passages[i].searchable for i in ids])
        hits = [Hit(self.passages[i], s) for i, s in zip(ids, scores)]
        return sorted(hits, key=lambda h: -h.score)

    def search(self, query: str, k: int = 4, candidates: int = 30, gate: float = GATE, per_document: int = 3) -> list[Hit]:
        """The k passages that best answer the query; none when nothing in the library is relevant."""
        if not has_content(query):
            return []
        keyword, semantic = self.keyword(query), self.semantic(query)
        pool = reciprocal_rank_fusion([keyword, semantic])[:candidates]
        reranked = self.rerank(query, pool)
        if not reranked or reranked[0].score < gate:
            return []
        hits = {h.passage.id: h for h in reranked}
        chosen: list[Hit] = []
        per_doc: dict[str, int] = {}
        for i in reciprocal_rank_fusion([keyword, semantic, [h.passage.id for h in reranked]]):
            p = hits[i].passage if i in hits else None
            # Only candidates the cross-encoder read and found relevant; a question with one good
            # passage gets one, not one and three distractors.
            if p is None or hits[i].score < gate or per_doc.get(p.doc_id, 0) >= per_document:
                continue
            if any(abs(c.passage.id - i) == 1 and c.passage.doc_id == p.doc_id for c in chosen):
                continue
            chosen.append(hits[i])
            per_doc[p.doc_id] = per_doc.get(p.doc_id, 0) + 1
            if len(chosen) == k:
                break
        return chosen
