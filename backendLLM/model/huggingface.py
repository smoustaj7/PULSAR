import os

import torch
from transformers import pipeline


MODEL_ID = "google/medgemma-1.5-4b-it"

def load_model():
    """Load MedGemma using an environment token or cached Hugging Face login."""
    token = os.getenv("HF_TOKEN")
    if torch.cuda.is_available():
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    else:
        dtype = torch.float32

    return pipeline(
        "image-text-to-text",
        model=MODEL_ID,
        torch_dtype=dtype,
        device_map="auto",
        token=token,
    )
