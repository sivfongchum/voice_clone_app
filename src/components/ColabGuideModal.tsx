'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Terminal,
} from 'lucide-react';

interface ColabGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ColabGuideModal: React.FC<ColabGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const colabScriptText = `# ==============================================================================
# 🇰🇭 VoxCPM 2 Khmer Voice Cloning Cloud Backend (Google Colab Free T4 GPU)
# Clean Zero-Shot Timbre Cloning (No Prompt Text Required!)
# ==============================================================================
# 1. Install packages
!pip install -q fastapi "uvicorn[standard]" python-multipart pyngrok nest_asyncio soundfile torchaudio accelerate
!pip install -q voxcpm || pip install -q git+https://github.com/OpenBMB/VoxCPM.git

# 2. Start Cloud Server with ngrok
import os, io, gc, tempfile, torch, torchaudio, nest_asyncio, uvicorn
import soundfile as sf
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok

# ---> PASTE YOUR FREE NGROK TOKEN HERE <---
NGROK_AUTH_TOKEN = "YOUR_NGROK_AUTHTOKEN_HERE"
MODEL_NAME = "sumnim/VoxCPM2-Khmer"

nest_asyncio.apply()
app = FastAPI(title="VoxCPM 2 Khmer Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ModelHolder:
    def __init__(self):
        self.model = None
        self.sample_rate = 24000
        self.model_name = MODEL_NAME
        self.is_ready = False
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

holder = ModelHolder()

def load_model():
    from voxcpm import VoxCPM
    try:
        holder.model = VoxCPM.from_pretrained(MODEL_NAME, load_denoiser=False, optimize=False)
    except Exception as e:
        print(f"[!] Falling back to openbmb/VoxCPM2: {e}")
        holder.model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False)
    holder.is_ready = True
    print("[✓] VoxCPM 2 Ready!")

@app.get("/health")
def health():
    cuda = torch.cuda.is_available()
    return {
        "status": "ready" if holder.is_ready else "loading",
        "device": holder.device,
        "cuda_available": cuda,
        "gpu_name": torch.cuda.get_device_name(0) if cuda else "CPU",
        "vram_allocated_gb": round(torch.cuda.memory_allocated(0)/(1024**3), 2) if cuda else 0.0,
        "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory/(1024**3), 2) if cuda else 0.0
    }

@app.post("/clone-voice")
async def clone_voice(
    text: str = Form(...),
    prompt_text: Optional[str] = Form(None),
    audio_file: UploadFile = File(...),
    inference_timesteps: int = Form(8),
    cfg_scale: float = Form(2.0)
):
    temp_dir = tempfile.mkdtemp()
    ref_path = f"{temp_dir}/ref.wav"
    with open(ref_path, "wb") as f:
        f.write(await audio_file.read())
    
    clean_prompt = prompt_text.strip() if prompt_text and prompt_text.strip() else None

    with torch.inference_mode():
        gen_audio = None
        if clean_prompt is None:
            try:
                gen_audio = holder.model.generate(
                    text=text.strip(),
                    reference_wav_path=ref_path,
                    cfg_value=float(cfg_scale),
                    inference_timesteps=int(inference_timesteps)
                )
            except Exception:
                try:
                    gen_audio = holder.model.generate(
                        text=text.strip(),
                        prompt_wav_path=ref_path,
                        prompt_text=None,
                        cfg_value=float(cfg_scale),
                        inference_timesteps=int(inference_timesteps)
                    )
                except Exception:
                    gen_audio = holder.model.generate(
                        text=text.strip(),
                        prompt_wav=ref_path,
                        cfg_scale=float(cfg_scale),
                        steps=int(inference_timesteps)
                    )
        else:
            gen_audio = holder.model.generate(
                text=text.strip(),
                prompt_wav_path=ref_path,
                prompt_text=clean_prompt,
                cfg_value=float(cfg_scale),
                inference_timesteps=int(inference_timesteps)
            )

    if isinstance(gen_audio, torch.Tensor):
        gen_audio = gen_audio.detach().cpu().float().numpy()
    if len(gen_audio.shape) > 1:
        gen_audio = gen_audio.squeeze()
        
    out_buf = io.BytesIO()
    sf.write(out_buf, gen_audio, holder.sample_rate, format="WAV", subtype="PCM_16")
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()
    return Response(content=out_buf.getvalue(), media_type="audio/wav")

if NGROK_AUTH_TOKEN and NGROK_AUTH_TOKEN != "YOUR_NGROK_AUTHTOKEN_HERE":
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)

try: ngrok.kill()
except: pass

tunnel = ngrok.connect(8000, proto="http")
public_url = tunnel.public_url.replace("http://", "https://")
load_model()
print(f"\\n🔥 PUBLIC API URL: {public_url}\\n")
uvicorn.run(app, host="0.0.0.0", port=8000)`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(colabScriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Google Colab Cloud GPU Setup Guide</h2>
              <p className="text-xs text-slate-400">
                Run VoxCPM 2 on a free 15GB Tesla T4 GPU (Clean Voice Cloning Mode)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="mt-5 space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px]">
                1
              </span>
              <span>Open Google Colab & Select Free T4 GPU</span>
            </div>
            <p className="text-slate-400 pl-7 text-[11px]">
              Navigate to{' '}
              <a
                href="https://colab.research.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline inline-flex items-center gap-0.5"
              >
                colab.research.google.com <ExternalLink className="w-3 h-3" />
              </a>
              . Go to <strong>Runtime &gt; Change runtime type &gt; T4 GPU</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px]">
                2
              </span>
              <span>Get Free ngrok Authtoken</span>
            </div>
            <p className="text-slate-400 pl-7 text-[11px]">
              Sign up at{' '}
              <a
                href="https://dashboard.ngrok.com/get-started/your-authtoken"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline inline-flex items-center gap-0.5"
              >
                ngrok.com <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and copy your free token.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px]">
                  3
                </span>
                <span>Copy & Run Colab Backend Cell</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Script!' : 'Copy Script'}</span>
              </button>
            </div>
            <div className="pl-7">
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto">
                {colabScriptText}
              </pre>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px]">
                4
              </span>
              <span>Connect to Local Studio</span>
            </div>
            <p className="text-slate-400 pl-7 text-[11px]">
              Copy the <code className="text-emerald-400">https://xxxx.ngrok-free.app</code> URL
              output and paste it into the <strong>API Settings</strong> modal on this web page.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Got it, let&apos;s clone!
          </button>
        </div>
      </div>
    </div>
  );
};
