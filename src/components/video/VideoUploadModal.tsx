'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Film,
  Sparkles,
  Key,
  CheckCircle,
  AlertTriangle,
  Loader2,
  PlaySquare,
} from 'lucide-react';
import { SAMPLE_PROJECT_ALPHA } from '@/lib/sampleVideos';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadVideo: (file: File) => void;
  onLoadDemoProject: () => void;
  isAnalyzing: boolean;
  analysisProgress: string;
  geminiApiKey: string;
  onSaveGeminiApiKey: (key: string) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadVideo,
  onLoadDemoProject,
  isAnalyzing,
  analysisProgress,
  geminiApiKey,
  onSaveGeminiApiKey,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (apiKeyInput.trim() && apiKeyInput !== geminiApiKey) {
        onSaveGeminiApiKey(apiKeyInput);
      }
      onUploadVideo(file);
    }
  };

  const handleSaveKey = () => {
    onSaveGeminiApiKey(apiKeyInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Import Video for Multi-Speaker Dubbing</h2>
              <p className="text-xs text-slate-400">
                AI Speaker Diarization, Auto-Transcription & Khmer Translation
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

        {/* Gemini API Key Field */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Google Gemini API Key (For Khmer Transcription & Translation)</span>
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-cyan-400 hover:underline"
            >
              Get Free Key ↗
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
            >
              Save Key
            </button>
          </div>
        </div>

        {/* Upload Drop Zone */}
        {isAnalyzing ? (
          <div className="p-10 rounded-2xl bg-slate-950/80 border border-indigo-500/40 flex flex-col items-center justify-center text-center space-y-3 glow-brand">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Gemini AI Analyzing Video Audio...
            </h3>
            <p className="text-xs text-indigo-300 font-mono">{analysisProgress}</p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-2xl bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <Upload className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
            <p className="text-sm font-bold text-slate-200">
              Click to select or drag video file (.mp4, .mov, .webm)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Any length • Up to 250MB • Multi-speaker dialogue
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Quick Demo Loader */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PlaySquare className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-xs font-bold text-slate-200">Test with Sample Project</h4>
              <p className="text-[11px] text-slate-400 font-khmer">
                {SAMPLE_PROJECT_ALPHA.videoTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onLoadDemoProject();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition"
          >
            Load Project_Alpha
          </button>
        </div>
      </div>
    </div>
  );
};
