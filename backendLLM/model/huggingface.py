import os

import torch
from transformers import pipeline


MODEL_ID = "google/medgemma-1.5-4b-it"

def load_model():
    """Load MedGemma using an environment token or cached Hugging Face login."""
    token = os.getenv("HF_TOKEN")
    if torch.cuda.is_available():
        # NVIDIA GPU (the Windows setup in README.md).
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        placement = {"device_map": "auto"}
    elif torch.backends.mps.is_available():
        # Apple silicon: the GPU shares the Mac's memory. bfloat16 keeps the 4B model at
        # about 8-9 GB; float16 can overflow in Gemma's activations.
        dtype = torch.bfloat16
        placement = {"device": "mps"}
    else:
        dtype = torch.float32
        placement = {"device_map": "auto"}

    print(f"Loading {MODEL_ID} on {next(iter(placement.values()))} ({dtype})...", flush=True)
    return pipeline(
        "image-text-to-text",
        model=MODEL_ID,
        torch_dtype=dtype,
        token=token,
        **placement,
    )
