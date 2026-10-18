'use client';

import React from 'react';
import {
  Globe,
  Film,
  Sparkles,
  Settings,
  BookOpen,
  Cpu,
  Key,
  Mic,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { HealthResponse } from '@/lib/api';

interface HeaderProps {
  apiUrl: string;
  isOnline: boolean;
  latencyMs: number;
  healthData?: HealthResponse;
  activeMode: 'video_dubbing' | 'single_tts';
  onChangeMode: (mode: 'video_dubbing' | 'single_tts') => void;
  projectName: string;
  geminiApiKey: string;
  voiceCount?: number;
  onOpenSettings: () => void;
  onOpenColabGuide: () => void;
  onOpenVideoUpload: () => void;
  onOpenVoiceLibrary?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiUrl,
  isOnline,
  latencyMs,
  healthData,
  activeMode,
  onChangeMode,
  projectName,
  geminiApiKey,
  voiceCount = 0,
  onOpenSettings,
  onOpenColabGuide,
  onOpenVideoUpload,
  onOpenVoiceLibrary,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & LinguaSync Pro Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-500 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                LinguaSync Pro
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md tracking-wider uppercase">
                Khmer AI Dub
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-khmer flex items-center gap-1.5">
              <span>ប្រព័ន្ធបកប្រែ និងចម្លងសំឡេងវីដេអូ</span>
            </p>
          </div>
        </div>

        {/* Studio Mode Selector (Tabs) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeMode('video_dubbing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeMode === 'video_dubbing'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video Multi-Speaker Studio</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('single_tts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeMode === 'single_tts'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Single Voice Studio</span>
          </button>
        </div>

        {/* Right Status Badges & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Project Selector Badge */}
          {activeMode === 'video_dubbing' && (
            <button
              onClick={onOpenVideoUpload}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-700 transition"
            >
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project: <strong className="text-white">{projectName || 'Project_Alpha'}</strong></span>
            </button>
          )}

          {/* Gemini API Key Status */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              geminiApiKey
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
            title="Google Gemini API Status"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{geminiApiKey ? 'Gemini 1.5 Ready' : 'Add Gemini Key'}</span>
          </button>

          {/* Backend Connection Badge */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Click to configure Colab ngrok URL"
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="hidden sm:inline">
              {isOnline ? 'GPU Cloud Ready' : 'Colab Offline'}
            </span>
          </button>

          {/* Colab Guide Button */}
          <button
            onClick={onOpenColabGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Colab Script</span>
          </button>

          {/* Voice Library Button */}
          {onOpenVoiceLibrary && (
            <button
              onClick={onOpenVoiceLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 border border-cyan-500/30 text-xs font-medium text-cyan-300 hover:bg-cyan-600/30 transition"
              title="Manage Voice Clones Library"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice Library</span>
              {voiceCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] font-mono font-bold">
                  {voiceCount}
                </span>
              )}
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition"
            title="API Settings"
            aria-label="API Settings"
          >
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
