'use client';

import React from 'react';
import { History, Play, Download, Trash2, Volume2 } from 'lucide-react';
import { formatTime } from '@/lib/audioUtils';

export interface HistoryItem {
  id: string;
  timestamp: string;
  targetText: string;
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
}

interface AudioHistoryProps {
  items: HistoryItem[];
  onSelectAudio: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const AudioHistory: React.FC<AudioHistoryProps> = ({
  items,
  onSelectAudio,
  onDeleteItem,
  onClearAll,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200">
            Session Audio History ({items.length})
          </h3>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-slate-400 hover:text-rose-400 transition"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
          >
            <div
              className="flex-1 min-w-0 pr-3 cursor-pointer"
              onClick={() => onSelectAudio(item)}
            >
              <p className="text-xs font-khmer text-slate-200 truncate">{item.targetText}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                <span>{item.timestamp}</span>
                <span>•</span>
                <span>{formatTime(item.duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSelectAudio(item)}
                className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition"
                title="Play Audio"
              >
                <Play className="w-3.5 h-3.5 fill-indigo-400" />
              </button>
              <a
                href={item.audioUrl}
                download={`khmer_voice_${item.id}.wav`}
                className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition"
                title="Download .wav"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
