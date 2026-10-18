'use client';

import React, { useState } from 'react';
import { Sliders, HelpCircle, ChevronDown, ChevronUp, Gauge, Wand2 } from 'lucide-react';

interface InferenceControlsProps {
  inferenceTimesteps: number;
  onChangeTimesteps: (val: number) => void;
  cfgScale: number;
  onChangeCfgScale: (val: number) => void;
  maxCharsPerChunk: number;
  onChangeMaxCharsPerChunk: (val: number) => void;
}

export const InferenceControls: React.FC<InferenceControlsProps> = ({
  inferenceTimesteps,
  onChangeTimesteps,
  cfgScale,
  onChangeCfgScale,
  maxCharsPerChunk,
  onChangeMaxCharsPerChunk,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>3. AI Generation Parameters</span>
            </h2>
            <p className="text-xs text-slate-400 font-khmer">ការកំណត់ប៉ារ៉ាម៉ែត្រសំឡេង</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <span>{isExpanded ? 'Simple' : 'Advanced'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Primary Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Timesteps Control */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              <span>Inference Timesteps</span>
            </label>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {inferenceTimesteps} steps
            </span>
          </div>

          <input
            type="range"
            min={6}
            max={12}
            step={1}
            value={inferenceTimesteps}
            onChange={(e) => onChangeTimesteps(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400">
            <span>6 (Ultra Fast)</span>
            <span className="text-indigo-400 font-semibold">8 (Recommended for T4)</span>
            <span>12 (Highest Quality)</span>
          </div>
        </div>

        {/* CFG Scale Control */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>CFG Scale (Similarity)</span>
            </label>
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              {cfgScale.toFixed(1)}
            </span>
          </div>

          <input
            type="range"
            min={1.0}
            max={2.5}
            step={0.1}
            value={cfgScale}
            onChange={(e) => onChangeCfgScale(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400">
            <span>1.0 (Natural)</span>
            <span className="text-purple-400 font-semibold">2.0 (Balanced)</span>
            <span>2.5 (Strong Mimic)</span>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-fade-in">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                Chunk Character Limit (GPU VRAM Protection)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {maxCharsPerChunk} characters
              </span>
            </div>
            <input
              type="range"
              min={150}
              max={300}
              step={10}
              value={maxCharsPerChunk}
              onChange={(e) => onChangeMaxCharsPerChunk(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Splits long Khmer text into coherent paragraphs before sending to Colab GPU.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
