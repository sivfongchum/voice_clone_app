'use client';

import React, { useState } from 'react';
import {
  X,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Key,
  Cpu,
  Terminal,
} from 'lucide-react';
import { HealthResponse } from '@/lib/api';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  onSaveUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<void>;
  isTesting: boolean;
  isOnline: boolean;
  latencyMs: number;
  healthData?: HealthResponse;
  errorMessage?: string;
  geminiApiKey: string;
  onSaveGeminiApiKey: (key: string) => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  onSaveUrl,
  onTestConnection,
  isTesting,
  isOnline,
  latencyMs,
  healthData,
  errorMessage,
  geminiApiKey,
  onSaveGeminiApiKey,
}) => {
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [inputKey, setInputKey] = useState(geminiApiKey);

  if (!isOpen) return null;

  const handleSaveAndTest = () => {
    onSaveUrl(inputUrl);
    if (inputKey !== geminiApiKey) {
      onSaveGeminiApiKey(inputKey);
    }
    onTestConnection(inputUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Cloud AI & Gemini API Settings</h2>
              <p className="text-xs text-slate-400">
                Configure Colab GPU Voice Cloning & Gemini Khmer Translation
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

        {/* 1. Google Gemini API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Google Gemini API Key</span>
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-0.5"
            >
              Get Free Key ↗
            </a>
          </div>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          <p className="text-[11px] text-slate-400">
            Used for automatic video speaker diarization, timestamps, and natural Khmer translation.
          </p>
        </div>

        {/* 2. Google Colab ngrok URL */}
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            2. Google Colab ngrok HTTPS Endpoint (VoxCPM 2)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://xxxx-xx-xx-xx.ngrok-free.app"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
            />
            <button
              type="button"
              onClick={handleSaveAndTest}
              disabled={isTesting || !inputUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isTesting ? 'Testing...' : 'Test & Save'}</span>
            </button>
          </div>
        </div>

        {/* Connection Status Card */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isOnline
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold">
                  {isOnline ? 'GPU Backend Connected & Ready' : 'Backend Disconnected or Offline'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isOnline
                    ? `Latency: ${latencyMs}ms • Device: ${healthData?.device?.toUpperCase() || 'GPU'}`
                    : errorMessage || 'No active connection to Colab VoxCPM 2.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
