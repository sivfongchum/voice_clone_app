'use client';

import React, { useRef } from 'react';
import {
  Film,
  Volume2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { VideoSpeakerSegment } from '@/lib/geminiApi';
import { VoiceProfile } from '@/lib/voiceProfileManager';
import { formatTime } from '@/lib/audioUtils';

interface MultiTrackTimelineProps {
  duration: number;
  currentTime: number;
  segments: VideoSpeakerSegment[];
  voiceProfiles?: VoiceProfile[];
  onSeek: (time: number) => void;
  muteOriginal: boolean;
  onToggleMuteOriginal: (muted: boolean) => void;
  enableDubbing: boolean;
  onToggleEnableDubbing: (enabled: boolean) => void;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  duration,
  currentTime,
  segments,
  voiceProfiles = [],
  onSeek,
  muteOriginal,
  onToggleMuteOriginal,
  enableDubbing,
  onToggleEnableDubbing,
}) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const totalDuration = Math.max(1, duration || 15);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);
  };

  const playheadPercent = Math.min(100, (currentTime / totalDuration) * 100);

  const getVoiceInfo = (voiceProfileId?: string) => {
    if (!voiceProfileId) return { name: 'Video Voice', color: 'indigo', emoji: '🎙️' };
    const found = voiceProfiles.find((v) => v.id === voiceProfileId);
    if (!found) return { name: 'Voice Clone', color: 'cyan', emoji: '🎙️' };
    return { name: found.name, color: found.color, emoji: found.avatarEmoji };
  };

  const getSegmentBg = (color: string, isSynced: boolean) => {
    if (!isSynced) return 'bg-slate-900/90 border-slate-700/80 text-slate-400';
    switch (color) {
      case 'cyan':
        return 'bg-gradient-to-r from-cyan-600 to-teal-600 border-cyan-400 text-white shadow-md shadow-cyan-500/20';
      case 'purple':
        return 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white shadow-md shadow-purple-500/20';
      case 'rose':
        return 'bg-gradient-to-r from-rose-600 to-pink-600 border-rose-400 text-white shadow-md shadow-rose-500/20';
      case 'amber':
        return 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white shadow-md shadow-amber-500/20';
      case 'emerald':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-md shadow-emerald-500/20';
      default:
        return 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-indigo-400 text-white shadow-md shadow-indigo-500/20';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col justify-between space-y-3 h-full">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Multi-Track Voice Dubbing Timeline
          </h3>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={muteOriginal}
              onChange={(e) => onToggleMuteOriginal(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Mute Original</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enableDubbing}
              onChange={(e) => onToggleEnableDubbing(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-emerald-400 font-medium">Enable Khmer Voice</span>
          </label>
        </div>
      </div>

      {/* Interactive Multi-Track Timeline Box */}
      <div className="relative rounded-xl bg-slate-950 border border-slate-800/90 p-3 select-none overflow-hidden space-y-2">
        {/* Time Ruler */}
        <div className="relative h-4 w-full border-b border-slate-800 flex justify-between text-[9px] font-mono text-slate-500 px-1">
          <span>0:00</span>
          <span>{formatTime(totalDuration * 0.25)}</span>
          <span>{formatTime(totalDuration * 0.5)}</span>
          <span>{formatTime(totalDuration * 0.75)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Tracks Area (Clickable to scrub playhead) */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative space-y-2 cursor-pointer py-1"
        >
          {/* Vertical Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 z-30 w-0.5 bg-rose-500 shadow-lg pointer-events-none transition-all duration-75"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-2.5 h-2.5 -ml-1 -mt-1 bg-rose-500 rotate-45 rounded-[1px] shadow-md" />
          </div>

          {/* Track 1: Video Track */}
          <div className="flex items-center gap-2">
            <span className="w-24 text-[10px] font-medium text-slate-400 truncate shrink-0 flex items-center gap-1">
              <Film className="w-3 h-3 text-slate-500" />
              <span>Video</span>
            </span>
            <div className="flex-1 h-6 rounded-md bg-slate-900/90 border border-slate-800 relative overflow-hidden flex items-center px-2">
              <span className="text-[9px] font-mono text-slate-500">Video Master Strip</span>
            </div>
          </div>

          {/* Track 2: Original Audio Track */}
          <div className="flex items-center gap-2">
            <span className="w-24 text-[10px] font-medium text-slate-400 truncate shrink-0 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-slate-500" />
              <span>Original Audio</span>
            </span>
            <div
              className={`flex-1 h-6 rounded-md border relative overflow-hidden flex items-center transition ${
                muteOriginal
                  ? 'bg-slate-950 border-slate-800 opacity-30'
                  : 'bg-indigo-950/30 border-indigo-500/20'
              }`}
            >
              <div className="w-full flex items-center justify-around opacity-40">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-indigo-400/50 rounded-full"
                    style={{ height: `${25 + ((i * 19) % 60)}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Track 3: Unified Sequential Khmer Dubbed Audio Track */}
          <div className="flex items-center gap-2">
            <span className="w-24 text-[10px] font-medium text-emerald-400 truncate shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Khmer Dub</span>
            </span>
            <div className="flex-1 h-7 rounded-md bg-slate-900/90 border border-slate-800 relative overflow-hidden">
              {segments.map((seg) => {
                const left = (seg.startTime / totalDuration) * 100;
                const width = Math.max(2, ((seg.endTime - seg.startTime) / totalDuration) * 100);
                const isSynced = seg.status === 'synced';
                const voice = getVoiceInfo(seg.voiceProfileId);
                const blockBg = getSegmentBg(voice.color, isSynced);

                return (
                  <div
                    key={seg.id}
                    className={`absolute top-0.5 bottom-0.5 rounded px-2 flex items-center text-[10px] font-mono truncate border transition-all ${blockBg}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`#${seg.segmentNumber} [${voice.name}]: ${seg.khmerTranslation}`}
                  >
                    <span className="truncate flex items-center gap-1">
                      <span>{voice.emoji}</span>
                      <span className="truncate">#{seg.segmentNumber} {voice.name}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
