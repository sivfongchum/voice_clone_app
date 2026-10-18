#!/usr/bin/env python3
"""
================================================================================
  VoxCPM 2 Khmer Voice Cloning API Server (Google Colab / Free T4 GPU Engine)
================================================================================
Description:
  High-performance FastAPI server exposing VoxCPM 2 zero-shot voice cloning
  specifically optimized for Khmer speech synthesis on low-VRAM cloud environments (Free T4).
  Supports Pure Zero-Shot Acoustic Cloning (NO prompt text required!).

Optimizations:
  - Pure Timbre Cloning (No prompt text required - eliminates dual-voice hallucination / overlap)
  - optimize=False (disables memory-heavy graph optimization)
  - load_denoiser=False (eliminates secondary denoiser VRAM footprint)
  - torch.inference_mode() with aggressive garbage collection + CUDA cache clearing
  - Configurable inference_timesteps (default: 8 for ultra-fast generation on T4)
================================================================================
"""

import os
import io
import gc
import sys
import shutil
import tempfile
import traceback
from typing import Optional

# 1. Automatic Dependency Installer (Runs when executed in Colab / Linux)
def ensure_dependencies():
    required_pkgs = [
        "fastapi", "uvicorn[standard]", "python-multipart", "pyngrok", 
        "nest_asyncio", "soundfile", "torchaudio", "torch", "transformers", "accelerate"
    ]
    missing = []
    for pkg in required_pkgs:
        pkg_import = pkg.split("[")[0].replace("-", "_")
        try:
            __import__(pkg_import)
        except ImportError:
            missing.append(pkg)
    
    if missing:
        print(f"[+] Installing missing backend packages: {' '.join(missing)}...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q"] + missing)
        
        # Also check voxcpm
        try:
            import voxcpm
        except ImportError:
            print("[+] Installing voxcpm library...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "voxcpm"])

# Run auto-installer
try:
    import fastapi
    import pyngrok
    import soundfile
except ImportError:
    ensure_dependencies()

import torch
import torchaudio
import soundfile as sf
import nest_asyncio
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok

# Apply nest_asyncio for seamless execution inside Jupyter/Colab notebook loops
nest_asyncio.apply()

# Initialize FastAPI App
app = FastAPI(
    title="VoxCPM 2 Khmer Voice Cloning Engine",
    description="High-fidelity zero-shot voice cloning API for Khmer text with cloud GPU acceleration",
    version="2.1.0"
)

# Enable Full CORS for seamless client communication from localhost / custom web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State Container for Model
class ModelHolder:
    def __init__(self):
        self.model = None
        self.sample_rate = 24000
        self.model_name = "sumnim/VoxCPM2-Khmer"
        self.is_ready = False
        self.load_error = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

holder = ModelHolder()

def load_voxcpm_model(model_name: str = "sumnim/VoxCPM2-Khmer"):
    """
    Loads VoxCPM 2 model with memory-conservative parameters for Google Colab Free T4 GPU.
    """
    print(f"\n=======================================================")
    print(f"[*] Initializing VoxCPM 2 Khmer Engine on device: {holder.device.upper()}")
    print(f"[*] Selected Model: {model_name}")
    print(f"[*] Flags: optimize=False | load_denoiser=False")
    print(f"=======================================================\n")
    
    holder.model_name = model_name
    
    try:
        from voxcpm import VoxCPM
        
        # Primary Attempt: Specified Khmer Checkpoint
        try:
            print(f"[1/2] Attempting to load '{model_name}'...")
            holder.model = VoxCPM.from_pretrained(
                model_name,
                load_denoiser=False,
                optimize=False
            )
        except Exception as e1:
            print(f"[!] Khmer specific weights '{model_name}' not available directly ({e1}). Falling back to 'openbmb/VoxCPM2'...")
            holder.model_name = "openbmb/VoxCPM2"
            holder.model = VoxCPM.from_pretrained(
                "openbmb/VoxCPM2",
                load_denoiser=False,
                optimize=False
            )

        # Retrieve native sample rate
        if hasattr(holder.model, 'tts_model') and hasattr(holder.model.tts_model, 'sample_rate'):
            holder.sample_rate = holder.model.tts_model.sample_rate
        elif hasattr(holder.model, 'sample_rate'):
            holder.sample_rate = holder.model.sample_rate
        else:
            holder.sample_rate = 24000

        holder.is_ready = True
        print(f"[✓] VoxCPM 2 successfully loaded and ready on {holder.device.upper()} (Sample Rate: {holder.sample_rate}Hz)!")

    except Exception as e:
        holder.load_error = str(e)
        print(f"[!] Error loading VoxCPM model: {traceback.format_exc()}")


# ==============================================================================
# API Endpoints
# ==============================================================================

@app.get("/")
def root():
    return {
        "service": "VoxCPM 2 Khmer Voice Cloning Engine",
        "status": "online",
        "mode": "Zero-shot acoustic cloning (pure audio prompt, no prompt text required)",
        "endpoints": {
            "health": "/health (GET)",
            "clone_voice": "/clone-voice (POST multipart/form-data)"
        }
    }


@app.get("/health")
def health_check():
    """
    Returns GPU status, CUDA memory allocation, and model readiness.
    """
    cuda_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if cuda_available else "CPU (No GPU Detected)"
    
    vram_alloc_gb = 0.0
    vram_total_gb = 0.0
    
    if cuda_available:
        vram_alloc_bytes = torch.cuda.memory_allocated(0)
        vram_total_bytes = torch.cuda.get_device_properties(0).total_memory
        vram_alloc_gb = round(vram_alloc_bytes / (1024 ** 3), 2)
        vram_total_gb = round(vram_total_bytes / (1024 ** 3), 2)
    
    return {
        "status": "ready" if holder.is_ready else ("loading" if holder.load_error is None else "error"),
        "model_name": holder.model_name,
        "device": holder.device,
        "cuda_available": cuda_available,
        "gpu_name": gpu_name,
        "vram_allocated_gb": vram_alloc_gb,
        "vram_total_gb": vram_total_gb,
        "sample_rate": holder.sample_rate,
        "error": holder.load_error
    }


@app.post("/clone-voice")
async def clone_voice(
    text: str = Form(..., description="Target Khmer text to synthesize"),
    prompt_text: Optional[str] = Form(None, description="Optional prompt transcript (Omit for clean pure voice cloning)"),
    audio_file: UploadFile = File(..., description="Reference voice sample (.wav, 3-6s)"),
    inference_timesteps: int = Form(8, description="Diffusion steps (default: 8)"),
    cfg_scale: float = Form(2.0, description="Classifier-Free Guidance scale (default: 2.0)")
):
    """
    Performs pure zero-shot Khmer voice cloning:
    1. Reads reference prompt audio (.wav)
    2. Clones the speaker's vocal timbre directly without forcing prompt text continuation
    3. Returns raw clean audio/wav binary stream
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Target text cannot be empty.")

    clean_prompt = prompt_text.strip() if prompt_text and prompt_text.strip() else None

    # Save uploaded reference audio to temporary WAV file
    temp_dir = tempfile.mkdtemp()
    temp_ref_path = os.path.join(temp_dir, "ref_prompt.wav")
    
    try:
        with open(temp_ref_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        # Normalize reference audio with torchaudio
        try:
            wav_data, sr = torchaudio.load(temp_ref_path)
            # Downmix to mono if stereo
            if wav_data.shape[0] > 1:
                wav_data = torch.mean(wav_data, dim=0, keepdim=True)
            # Resample to 24000 if needed
            if sr != 24000:
                resampler = torchaudio.transforms.Resample(sr, 24000)
                wav_data = resampler(wav_data)
                sr = 24000
            torchaudio.save(temp_ref_path, wav_data, sr)
        except Exception as audio_err:
            print(f"[!] Notice during audio normalization: {audio_err}")

        output_wav_bytes = None

        if holder.model is not None and holder.is_ready:
            print(f"\n[+] Synthesizing Khmer Voice Clone (Clean Pure Mode)...")
            print(f"    - Target Text Length: {len(text)} chars")
            print(f"    - Prompt Text: {clean_prompt if clean_prompt else '[None - Pure Timbre Cloning]'}")
            print(f"    - Diffusion Steps: {inference_timesteps} | CFG: {cfg_scale}")

            # Run inference under inference_mode
            with torch.inference_mode():
                generated_audio = None
                
                # Standard VoxCPM 2 execution
                try:
                    generated_audio = holder.model.generate(
                        text=text.strip(),
                        prompt_wav=temp_ref_path,
                        prompt_text=clean_prompt or "",
                        cfg_value=float(cfg_scale),
                        inference_timesteps=int(inference_timesteps)
                    )
                except (TypeError, ValueError, AttributeError):
                    try:
                        generated_audio = holder.model.generate(
                            text=text.strip(),
                            prompt_wav_path=temp_ref_path,
                            prompt_text=clean_prompt,
                            cfg_value=float(cfg_scale),
                            inference_timesteps=int(inference_timesteps)
                        )
                    except (TypeError, ValueError, AttributeError):
                        try:
                            generated_audio = holder.model.generate(
                                text=text.strip(),
                                prompt_wav=temp_ref_path,
                                prompt_text=clean_prompt or "",
                                cfg_scale=float(cfg_scale),
                                steps=int(inference_timesteps)
                            )
                        except Exception as gen_err:
                            print(f"[!] Primary generation attempts failed: {gen_err}. Trying reference_wav_path...")
                            generated_audio = holder.model.generate(
                                text=text.strip(),
                                reference_wav_path=temp_ref_path,
                                cfg_value=float(cfg_scale),
                                inference_timesteps=int(inference_timesteps)
                            )

            # Convert numpy array or torch tensor to WAV in-memory buffer
            out_buf = io.BytesIO()
            if isinstance(generated_audio, torch.Tensor):
                generated_np = generated_audio.detach().cpu().float().numpy()
            else:
                generated_np = generated_audio
            
            # Squeeze channel dimensions if 2D
            if len(generated_np.shape) > 1:
                generated_np = generated_np.squeeze()

            sf.write(out_buf, generated_np, holder.sample_rate, format='WAV', subtype='PCM_16')
            output_wav_bytes = out_buf.getvalue()

        else:
            raise HTTPException(
                status_code=503,
                detail=f"VoxCPM 2 Khmer Model is not ready yet on device '{holder.device}'. Status: {holder.load_error or 'Weights downloading/loading in progress. Please check Colab logs.'}"
            )

        # Aggressive memory cleanup for Free T4 GPU
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        gc.collect()

        return Response(
            content=output_wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=khmer_cloned_voice.wav",
                "X-Generated-Characters": str(len(text)),
                "X-Sample-Rate": str(holder.sample_rate),
                "Access-Control-Expose-Headers": "Content-Disposition, X-Generated-Characters, X-Sample-Rate"
            }
        )

    except Exception as e:
        print(f"[!] Error during voice cloning: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Voice synthesis error: {str(e)}")

   
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


# ==============================================================================
# Server Runner & ngrok Tunneling Setup
# ==============================================================================

def start_server(
    ngrok_token: Optional[str] = None, 
    model_name: str = "sumnim/VoxCPM2-Khmer",
    port: int = 8000
):
    token = ngrok_token or os.getenv("NGROK_AUTH_TOKEN")
    if not token:
        try:
            from google.colab import userdata
            token = userdata.get('NGROK_AUTH_TOKEN')
        except Exception:
            pass

    if token:
        print(f"[+] Authenticating ngrok...")
        ngrok.set_auth_token(token.strip())
    else:
        print("\n[!] WARNING: No ngrok authtoken detected.")
        print("[!] Get your free token at https://dashboard.ngrok.com/get-started/your-authtoken\n")

    try:
        ngrok.kill()
    except Exception:
        pass

    try:
        public_url = ngrok.connect(port, proto="http").public_url
        if public_url.startswith("http://"):
            public_url = public_url.replace("http://", "https://")
    except Exception as e:
        print(f"[!] ngrok connection notice: {e}")
        public_url = f"http://localhost:{port}"

    load_voxcpm_model(model_name)

    print("\n" + "=" * 70)
    print(" 🚀 KHMER VOXCPM 2 API BACKEND IS LIVE & READY (CLEAN VOICE MODE)!")
    print("=" * 70)
    print(f" 👉 PUBLIC HTTPS API URL:  {public_url}")
    print(f" 👉 HEALTH CHECK URL:      {public_url}/health")
    print("=" * 70)
    print(" 📋 NO PROMPT TRANSCRIPT REQUIRED: Just send reference .wav and target text!")
    print("=" * 70 + "\n")

    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)
    server.run()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Start VoxCPM2 Khmer Voice Cloning Server")
    parser.add_argument("--token", type=str, default=None, help="ngrok Authtoken")
    parser.add_argument("--model", type=str, default="sumnim/VoxCPM2-Khmer", help="Hugging Face Model Checkpoint")
    parser.add_argument("--port", type=int, default=8000, help="Local port to bind (default: 8000)")
    args = parser.parse_args()

    start_server(ngrok_token=args.token, model_name=args.model, port=args.port)
