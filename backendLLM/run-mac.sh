#!/usr/bin/env bash
# Set up and run the MedGemma backend on a Mac with Apple silicon.
#   ./backendLLM/run-mac.sh            set up (first run only) and start on http://localhost:8000
#   ./backendLLM/run-mac.sh --setup    set up only
# The first start downloads the model (about 8.6 GB) to ~/.cache/huggingface.
set -euo pipefail
cd "$(dirname "$0")"

VENV=.venv
REQS=requirements-mac.txt

# PyTorch has no wheels yet for the newest Pythons, so pick the newest supported one.
PY=""
for v in 3.13 3.12 3.11 3.10; do
  if command -v "python$v" >/dev/null 2>&1; then PY="python$v"; break; fi
done
if [ -z "$PY" ]; then
  echo "Needs Python 3.10–3.13. Install one with:  brew install python@3.13" >&2
  exit 1
fi

# Install (again) only when the requirements have changed since the last setup.
if [ ! -x "$VENV/bin/python" ] || ! cmp -s "$REQS" "$VENV/.installed"; then
  echo "Setting up the Python environment with $($PY --version)..."
  [ -x "$VENV/bin/python" ] || "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip --quiet
  "$VENV/bin/python" -m pip install -r "$REQS"
  cp "$REQS" "$VENV/.installed"
fi

"$VENV/bin/python" -c "import torch; print('PyTorch', torch.__version__, '| Apple GPU (MPS):', torch.backends.mps.is_available())"
[ "${1:-}" = "--setup" ] && { echo "Setup done. Run ./backendLLM/run-mac.sh to start."; exit 0; }

# MedGemma is gated: accept its terms at https://huggingface.co/google/medgemma-1.5-4b-it,
# then use a token with "Read access to contents of all public gated repos you can access".
if [ -z "${HF_TOKEN:-}" ] && [ ! -f "${HF_HOME:-$HOME/.cache/huggingface}/token" ]; then
  read -rsp "Hugging Face token (hf_..., hidden as you type): " HF_TOKEN || true
  echo
  if [ -z "$HF_TOKEN" ]; then
    echo "No token entered. Create one at https://huggingface.co/settings/tokens and rerun." >&2
    exit 1
  fi
  export HF_TOKEN
fi

# Check the token and access before loading anything, so a refusal reads as a fix to make
# rather than a stack trace ending in "Application startup failed".
"$VENV/bin/python" - <<'PY' || exit 1
import os, sys
from huggingface_hub import HfApi, login
from huggingface_hub.utils import GatedRepoError

MODEL = "google/medgemma-1.5-4b-it"
token = os.getenv("HF_TOKEN") or None
api = HfApi()
try:
    who = api.whoami(token=token)["name"]
except Exception:  # an invalid token raises a plain requests HTTPError here
    sys.exit("Hugging Face didn't accept that token. Copy it again in full (it starts with hf_) and rerun.")
try:
    api.auth_check(MODEL, token=token)
except GatedRepoError:
    sys.exit(
        f"Signed in to Hugging Face as {who}, but this account can't download MedGemma yet.\n"
        f"  1. Open https://huggingface.co/{MODEL} while signed in as {who} and accept the terms.\n"
        "  2. If the token is fine-grained, give it 'Read access to contents of all public gated repos you can access'.\n"
        "Then rerun this script."
    )
print(f"Hugging Face: signed in as {who}; access to MedGemma confirmed.")
if token and sys.stdin.isatty() and input("Save this token for next time? [y/N] ").strip().lower() == "y":
    login(token=token, add_to_git_credential=False)
PY

# Operations the Apple GPU doesn't support yet run on the CPU instead of failing.
export PYTORCH_ENABLE_MPS_FALLBACK=1
exec "$VENV/bin/python" main.py
