'use client';

import React from 'react';
import {
  Folder,
  Download,
  Settings,
  Film,
  Sparkles,
  Layers,
  CheckCircle,
  FileVideo,
  Share2,
  Users,
  Mic,
  Zap,
} from 'lucide-react';
import { VideoSpeakerSegment } from '@/lib/geminiApi';

interface GlobalProjectToolsProps {
  projectName: string;
  segments: VideoSpeakerSegment[];
  voiceCount?: number;
  onOpenUploadModal: () => void;
  onOpenVoiceLibrary?: () => void;
  onAutoRippleTimeline?: () => void;
  onExportVideo: () => void;
  isExporting: boolean;
}

export const GlobalProjectTools: React.FC<GlobalProjectToolsProps> = ({
  projectName,
  segments,
  voiceCount = 0,
  onOpenUploadModal,
  onOpenVoiceLibrary,
  onAutoRippleTimeline,
  onExportVideo,
  isExporting,
}) => {
  const syncedCount = segments.filter((s) => s.status === 'synced').length;

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 shadow-xl space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span>Global Project Tools</span>
          </h3>
        </div>

        {/* Project Assets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Project Files
          </span>
          <div className="space-y-1">
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs text-slate-200 transition group"
            >
              <span className="flex items-center gap-2 truncate">
                <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">{projectName || 'Asset Video'}</span>
              </span>
              <span className="text-[10px] text-indigo-400 group-hover:underline">Change</span>
            </button>
          </div>
        </div>

        {/* Quick Tools: Voice Clones & Ripple */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Quick Studio Actions
          </span>
          <div className="space-y-1.5">
            {onOpenVoiceLibrary && (
              <button
                type="button"
                onClick={onOpenVoiceLibrary}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-cyan-600/10 to-indigo-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-xs text-cyan-300 transition"
              >
                <span className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Voice Clones Library</span>
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-[10px] font-mono font-bold">
                  {voiceCount}
                </span>
              </button>
            )}

            {onAutoRippleTimeline && (
              <button
                type="button"
                onClick={onAutoRippleTimeline}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs text-emerald-300 transition"
                title="Shift later cuts so all voice audio plays 100% full duration without overlap"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Ripple Cuts</span>
                </span>
                <span className="text-[10px] text-slate-400">Fix Overlaps</span>
              </button>
            )}
          </div>
        </div>

        {/* Export Settings */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Status</span>
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Synced Cuts:</span>
              <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                {syncedCount} / {segments.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Audio Mix:</span>
              <span className="font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                Ducking (88%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Master Export Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onExportVideo}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Rendering Video MP4...' : 'Export Dubbed Video (MP4)'}</span>
        </button>
      </div>
    </div>
  );
};
