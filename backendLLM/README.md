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
