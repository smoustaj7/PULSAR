## MedGemma backend
Super cool tutorial of how to use medgamma~
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
