## MedGemma backend
Super cool tutorial of how to use medgamma~

### On a Mac (Apple silicon)

One script sets everything up the first time and starts the server on http://localhost:8000:

```bash
./backendLLM/run-mac.sh
```

It needs Python 3.10–3.13 (`brew install python@3.13` if you only have a newer one), runs the
model on the Mac's GPU, and asks for your Hugging Face token if you aren't signed in (accept the
model's terms on its Hugging Face page first). The first start downloads the model, about
8.6 GB; 16 GB of memory is enough. `./backendLLM/run-mac.sh --setup` installs without starting.

The deployed site (https://pulsar-health.pages.dev) can use the model running on your own
computer too: start the backend, open the site, and if the browser asks to let the site connect
to devices on your local network, allow it. Ad and tracker blockers (Dia's "Block Ads & Trackers",
uBlock Origin and others) stop websites from contacting your computer, so turn them off for this site.

#### Share it with everyone using the site

To let anyone on the deployed site (judges included) use the model on your Mac, with nothing
to install on their side, start the backend and then, in a second terminal:

```bash
./backendLLM/share.sh
```

It opens a free Cloudflare tunnel (no plan or card needed) and saves the tunnel's address in
Cloudflare KV, where the site's `/api/chat` finds it. Answers come from your Mac until you press
Ctrl+C; then the site says the assistant is offline. Your Mac must stay on and awake: the
script keeps it from sleeping while it runs, but closing the lid on battery still sleeps it.
It needs `brew install cloudflared` and Wrangler signed in (`npx wrangler@4 login`) once.
While it runs, anyone with the site's address can ask questions, and their questions and
readings are processed on your Mac. Cloudflare's free tunnels drop requests that take longer
than about 100 seconds, so very long answers can fail.

### NASA reference library

Dr.Jarvis answers questions about health in space from NASA's research, not just from what the
model remembers, and cites it: each answer lists the documents it used, linked, and a PDF opens
at the right page. The library is built from the
[challenge's resources](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources):
NASA's hazards, risks and ongoing-research pages, the pages they link to, and the PDFs those
link to (Human Research Program evidence reports, Human System Risk Board narratives and risk
records, NASA technical briefs), plus the two Canadian Space Agency articles. That's 147
documents, about 700,000 words, cut into 3,970 passages of about 200 words.

For each question the backend (`rag/`):

1. searches by keyword (BM25), which finds exact terms like "SANS", "CO2" or "bisphosphonate";
2. searches by meaning (embeddings, `BAAI/bge-base-en-v1.5`), which finds the same idea in other
   words ("trouble sleeping" for "sleep loss");
3. merges the two rankings (reciprocal rank fusion, the hybrid search) into 30 candidates;
4. has a cross-encoder (`cross-encoder/ms-marco-MiniLM-L-6-v2`) read the question with each
   candidate, and merges its ranking with the other two. Its scores also set the relevance gate:
   off-topic questions get no passages, and greetings aren't searched at all;
5. gives MedGemma the best 4 passages (at most 3 from one document) to answer from;
6. cites them: the cross-encoder checks each sentence of the answer against the passages, and a
   sentence that restates one gets its number, like [1]. MedGemma (4B) mostly ignored
   instructions to cite, and when pressed listed the passages one by one, so the citations are
   added after it answers. They reflect what the answer actually says, and only the passages it
   drew on are listed as sources.

Each passage is searched with its document's title and section heading in front of it, so a
passage that says "this risk" is still found for its subject. Measured on 30 astronaut-style
questions (`python -m rag.evaluate`, which counts a passage as an answer only if it contains the
facts asked for):

| Search | Questions answered in the top 4 | Top-4 passages that answer | Rank of first answer (MRR) |
| --- | --- | --- | --- |
| Keywords only | 90% | 70% | 0.83 |
| Meaning only | 97–100% | 79% | 0.91 |
| Hybrid | 100% | 81% | 0.94 |
| Hybrid + cross-encoder, merged (used) | 100% | 83% | 0.97 |

The cross-encoder on its own ranked slightly worse than hybrid (MRR 0.92), so it votes alongside
the other two searches instead of replacing them. A larger cross-encoder (`BAAI/bge-reranker-base`)
picks 86% answering passages but takes about 1.2 s a question against 0.15 s; set
`RAG_RERANK_MODEL=BAAI/bge-reranker-base` to use it.

The first start downloads the two search models (about 530 MB) and spends about 2–3 minutes
embedding the library on the Mac's GPU; both are kept, so later starts take a second. Settings,
as environment variables: `RAG=off` answers without the library, `RAG_EMBED_MODEL` and
`RAG_RERANK_MODEL` choose the models, `RAG_GATE` (default `-3`) sets the relevance gate.

The library itself (`rag/sources.json`, the documents found, and `rag/corpus.jsonl.gz`, their
text) is committed, so the server never needs the network for it. To rebuild it, for example
when NASA updates a report, run from `backendLLM/`:

```bash
.venv/bin/pip install beautifulsoup4 pypdf
.venv/bin/python -m rag.build_corpus --discover   # find the documents again
.venv/bin/python -m rag.build_corpus              # download them and extract their text
.venv/bin/python -m unittest                      # the search's tests
.venv/bin/python -m rag.evaluate                  # how well it finds answers
```

The Windows steps below are for an NVIDIA GPU.
### Install the backend environment

The commands below are an example Windows/PowerShell setup, not universal version requirements. 

On my PC, I have Python 3.10 and the PyTorch 2.6.0 CUDA 12.4 wheel. 

So Choose a PyTorch build that matches your Python version and NVIDIA driver/GPU support or install my dependencies whatever; the CUDA wheel includes its CUDA runtime, but still requires a compatible NVIDIA driver. Check the [PyTorch installation selector](https://pytorch.org/get-started/locally/) if your setup differs. The Transformers and other package versions may also need to be adjusted for your project or model.

Run these commands from the repository root:

```powershell
py -3.10 -m venv .\backendLLM\.venv_cuda
.\backendLLM\.venv_cuda\Scripts\Activate.ps1
python -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cu124
python -m pip install transformers==4.57.3 fastapi uvicorn python-multipart accelerate pillow
```

Verify that PyTorch can access CUDA and that the expected packages are installed:

```powershell
python -c "import torch, transformers; print('torch:', torch.__version__); print('transformers:', transformers.__version__); print('CUDA:', torch.cuda.is_available()); print(torch.ones(1, device='cuda'))"
```

The check above expects a CUDA-capable NVIDIA GPU and a compatible driver. If `torch.cuda.is_available()` is `False` or the CUDA tensor command fails, use the PyTorch selector to install a build appropriate for your hardware and driver. For a CPU-only installation, verify imports and versions with:

```powershell
python -c "import torch, transformers; print('torch:', torch.__version__); print('transformers:', transformers.__version__); print('CUDA:', torch.cuda.is_available())"
```

From the project root in PowerShell, activate the backend environment and enter the backend directory:

```powershell
.\backendLLM\.venv_cuda\Scripts\Activate.ps1
cd .\backendLLM
```

Accept access to the MedGemma model on Hugging Face, then either set `HF_TOKEN` in the current terminal or sign in with `hf auth login`. The backend uses the environment token or your cached Hugging Face credentials.

```powershell
$env:HF_TOKEN = "hf_your_token_here"
python main.py
```
If you’re unsure how to get a token, follow the MedGemma tutorial I shared on WhatsApp. Click your profile icon, select **Access Tokens**, and create a **Custom** token with the **Read contents of gated repos you can access** permission.
