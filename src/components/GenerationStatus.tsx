'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Cpu, Clock, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { formatTime } from '@/lib/audioUtils';

export interface GenerationProgress {
  stage: 'uploading' | 'synthesizing' | 'merging' | 'completed' | 'error';
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  message: string;
}

interface GenerationStatusProps {
  isGenerating: boolean;
  progress: GenerationProgress;
  onCancel?: () => void;
}

export const GenerationStatus: React.FC<GenerationStatusProps> = ({
  isGenerating,
  progress,
  onCancel,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isGenerating) {
      setElapsedSec(0);
      interval = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-indigo-500/40 shadow-2xl space-y-3 glow-brand animate-fade-in">
      {/* Top status & Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Cpu className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Generating Khmer Voice Clone</span>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                {progress.percentage}%
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span>Chunk {progress.currentChunk} of {progress.totalChunks}</span>
              <span>•</span>
              <span className="text-indigo-400">{progress.message}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatTime(elapsedSec)}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Animated Progress Bar */}
      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-lg"
          style={{ width: `${Math.max(5, Math.min(100, progress.percentage))}%` }}
        />
      </div>

      {/* Stage Flow Indicator */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-medium text-center">
        <div
          className={`p-1.5 rounded-lg border transition ${
            progress.percentage >= 10
              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          1. Upload & Audio Clean
        </div>
        <div
          className={`p-1.5 rounded-lg border transition ${
            progress.stage === 'synthesizing' || progress.percentage >= 40
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          2. Diffusion Inference
        </div>
        <div
          className={`p-1.5 rounded-lg border transition ${
            progress.percentage >= 90
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          3. WAV Merging & Ready
        </div>
      </div>
    </div>
  );
};
