'use client';

import React, { useState, useMemo } from 'react';
import {
  FileCode2,
  Sparkles,
  Layers,
  CheckCircle,
  HelpCircle,
  Scissors,
  Bookmark,
} from 'lucide-react';
import { countKhmerWords, chunkKhmerText } from '@/lib/khmerChunker';
import { KHMER_PRESETS, KhmerPreset } from '@/lib/presets';

interface TargetTextInputProps {
  targetText: string;
  onChangeTargetText: (text: string) => void;
  onApplyPreset: (preset: KhmerPreset) => void;
  enableAutoChunking: boolean;
  onToggleAutoChunking: (enabled: boolean) => void;
  maxCharsPerChunk: number;
}

export const TargetTextInput: React.FC<TargetTextInputProps> = ({
  targetText,
  onChangeTargetText,
  onApplyPreset,
  enableAutoChunking,
  onToggleAutoChunking,
  maxCharsPerChunk,
}) => {
  const [showChunkPreview, setShowChunkPreview] = useState(false);

  // Calculate live stats
  const charCount = targetText.length;
  const wordCount = useMemo(() => countKhmerWords(targetText), [targetText]);
  const chunks = useMemo(() => {
    return enableAutoChunking
      ? chunkKhmerText(targetText, maxCharsPerChunk)
      : [targetText];
  }, [targetText, enableAutoChunking, maxCharsPerChunk]);

  const isLongText = wordCount > 40 || charCount > 200;

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>2. Target Khmer Script</span>
              <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Text to Synthesize
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-khmer">អត្ថបទដែលត្រូវបម្លែងជាសំឡេង</p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <strong>{wordCount}</strong> <span className="text-slate-400">words</span>
          </span>
          <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <strong>{charCount}</strong> <span className="text-slate-400">chars</span>
          </span>
        </div>
      </div>

      {/* Preset Quick Loader */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Bookmark className="w-3 h-3 text-indigo-400" />
            <span>Sample Presets (ចុចដើម្បីសាកល្បង):</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {KHMER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-left transition group"
            >
              <span className="text-xs font-semibold text-slate-200 block truncate group-hover:text-indigo-300">
                {preset.titleEnglish}
              </span>
              <span className="text-[10px] font-khmer text-slate-400 block truncate">
                {preset.titleKhmer}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Input */}
      <div className="space-y-2">
        <textarea
          value={targetText}
          onChange={(e) => onChangeTargetText(e.target.value)}
          placeholder="បញ្ចូលអត្ថបទខ្មែរដែលអ្នកចង់ឱ្យម៉ូដែល AI និយាយនៅទីនេះ..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-khmer leading-relaxed resize-y min-h-[120px] transition"
        />
      </div>

      {/* Smart Sentence Chunking Notification Bar */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-indigo-400" />
            <div className="text-xs">
              <span className="font-semibold text-slate-200">Smart Khmer Chunking</span>
              <span className="text-slate-400 ml-1.5 hidden sm:inline">
                (Prevents Colab T4 GPU Out-of-Memory)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChunkPreview(!showChunkPreview)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
            >
              {showChunkPreview ? 'Hide Chunks' : `Preview (${chunks.length} chunks)`}
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableAutoChunking}
                onChange={(e) => onToggleAutoChunking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Chunk Details Accordion */}
        {showChunkPreview && (
          <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
            {chunks.map((chk, i) => (
              <div
                key={i}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-khmer text-slate-300 flex items-start gap-2"
              >
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] shrink-0">
                  #{i + 1}
                </span>
                <span className="flex-1">{chk}</span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {chk.length} chars
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
