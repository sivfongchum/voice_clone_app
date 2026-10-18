'use client';

import React, { useState, useRef } from 'react';
import {
  Sliders,
  Play,
  Pause,
  CheckCircle,
  Loader2,
  Wand2,
  Sparkles,
  Users,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  Clock,
  BookmarkPlus,
  Zap,
  Target,
  FileText,
  Volume2,
  Gauge,
  FastForward,
  Upload,
} from 'lucide-react';
import { VideoSpeakerSegment } from '@/lib/geminiApi';
import { VoiceProfile } from '@/lib/voiceProfileManager';
import { formatTime } from '@/lib/audioUtils';

interface AiAudioProcessControlProps {
  segments: VideoSpeakerSegment[];
  voiceProfiles: VoiceProfile[];
  activeSegmentId: string | null;
  onSelectSegment: (segment: VideoSpeakerSegment) => void;
  onPlaySegmentRange: (startSec: number, endSec: number) => void;
  onUpdateKhmerText: (segmentId: string, newKhmerText: string) => void;
  onUpdateSegmentTimes: (segmentId: string, newStart: number, newEnd: number) => void;
  onUpdateSegmentVoice: (segmentId: string, voiceProfileId: string, voiceProfileName: string) => void;
  onApplyVoiceToAll: (voiceProfileId: string, voiceProfileName: string) => void;
  onUpdateSegmentSpeed: (segmentId: string, speed: number) => void;
  onApplySpeedToAll: (speed: number) => void;
  onGenerateSegmentAudio: (segment: VideoSpeakerSegment) => Promise<void>;
  onGenerateAllSegments: () => Promise<void>;
  isGeneratingAll: boolean;
  generatingSegmentId: string | null;
  onPreviewSegmentAudio: (segment: VideoSpeakerSegment) => void;
  playingSegmentId: string | null;
  onSaveSegmentAsVoiceProfile: (segment: VideoSpeakerSegment) => void;
  onPolishTranslation?: (segmentId: string, originalText: string, currentText: string) => Promise<void>;
  polishingSegmentId?: string | null;
  onDeleteSegment: (segmentId: string) => void;
  onAddSegment: () => void;
  onOpenVoiceLibrary: () => void;
  onUploadVoiceFile?: (file: File) => Promise<void>;
}

export const AiAudioProcessControl: React.FC<AiAudioProcessControlProps> = ({
  segments,
  voiceProfiles,
  activeSegmentId,
  onSelectSegment,
  onPlaySegmentRange,
  onUpdateKhmerText,
  onUpdateSegmentTimes,
  onUpdateSegmentVoice,
  onApplyVoiceToAll,
  onUpdateSegmentSpeed,
  onApplySpeedToAll,
  onGenerateSegmentAudio,
  onGenerateAllSegments,
  isGeneratingAll,
  generatingSegmentId,
  onPreviewSegmentAudio,
  playingSegmentId,
  onSaveSegmentAsVoiceProfile,
  onPolishTranslation,
  polishingSegmentId,
  onDeleteSegment,
  onAddSegment,
  onOpenVoiceLibrary,
  onUploadVoiceFile,
}) => {
  const [openVoiceDropdownId, setOpenVoiceDropdownId] = useState<string | null>(null);
  const [isGlobalVoiceDropdownOpen, setIsGlobalVoiceDropdownOpen] = useState<boolean>(false);
  const [globalVoiceId, setGlobalVoiceId] = useState<string>('');
  const [globalSpeed, setGlobalSpeed] = useState<number>(1.0);

  const syncedCount = segments.filter((s) => s.status === 'synced').length;
  const progressPct = segments.length > 0 ? Math.round((syncedCount / segments.length) * 100) : 0;

  const getVoiceInfo = (voiceProfileId?: string) => {
    if (!voiceProfileId) return { name: 'Auto Video Timbre', avatar: '🎵', color: 'indigo' };
    const found = voiceProfiles.find((v) => v.id === voiceProfileId);
    if (!found) return { name: 'Custom Voice', avatar: '🎙️', color: 'cyan' };
    return { name: found.name, avatar: found.avatarEmoji, color: found.color };
  };

  const getBadgeColorClass = (color: string) => {
    switch (color) {
      case 'cyan':
        return 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30';
      case 'emerald':
        return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
      case 'purple':
        return 'text-purple-300 bg-purple-500/10 border-purple-500/30';
      case 'rose':
        return 'text-rose-300 bg-rose-500/10 border-rose-500/30';
      case 'amber':
        return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30';
    }
  };

  const uploadVoiceInputRef = useRef<HTMLInputElement | null>(null);

  const handleVoiceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadVoiceFile) {
      await onUploadVoiceFile(file);
      if (uploadVoiceInputRef.current) uploadVoiceInputRef.current.value = '';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col justify-between space-y-3 h-full">
      {/* Hidden Voice File Input */}
      <input
        type="file"
        ref={uploadVoiceInputRef}
        onChange={handleVoiceFileUpload}
        accept="audio/*"
        className="hidden"
      />

      {/* Header & Global Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800/80">
        <div>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Voice Timeline & Dialogue Studio</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {segments.length} Dialogue Cuts &bull; <span className="text-emerald-400 font-semibold">{syncedCount} / {segments.length} Synced</span>
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Global Speed Quick Adjuster */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-slate-700/80 text-xs shadow-inner">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400 font-semibold">Speed All:</span>
            <button
              type="button"
              onClick={() => {
                const n = parseFloat(Math.max(0.5, globalSpeed - 0.05).toFixed(2));
                setGlobalSpeed(n);
                onApplySpeedToAll(n);
              }}
              className="w-5 h-5 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600/40 text-slate-200 text-xs font-bold border border-slate-700 transition"
              title="Decrease speed of all cuts (-0.05x)"
            >
              -
            </button>
            <span
              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                Math.abs(globalSpeed - 1.0) < 0.01
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-cyan-300 bg-cyan-500/10'
              }`}
            >
              {globalSpeed.toFixed(2)}x
            </span>
            <button
              type="button"
              onClick={() => {
                const n = parseFloat(Math.min(2.0, globalSpeed + 0.05).toFixed(2));
                setGlobalSpeed(n);
                onApplySpeedToAll(n);
              }}
              className="w-5 h-5 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600/40 text-slate-200 text-xs font-bold border border-slate-700 transition"
              title="Increase speed of all cuts (+0.05x)"
            >
              +
            </button>
            {Math.abs(globalSpeed - 1.0) >= 0.01 && (
              <button
                type="button"
                onClick={() => {
                  setGlobalSpeed(1.0);
                  onApplySpeedToAll(1.0);
                }}
                className="px-1.5 py-0.5 rounded text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 font-medium transition"
                title="Reset all cuts to 1.0x Normal speed"
              >
                Reset 1x
              </button>
            )}
          </div>

          {/* Global Voice Clone Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsGlobalVoiceDropdownOpen(!isGlobalVoiceDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:border-cyan-500/60 transition shadow-inner"
              title="Select Character Voice Clone and apply to all cuts"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] text-slate-400">Voice All:</span>
              <span>{getVoiceInfo(globalVoiceId).avatar}</span>
              <span className="truncate max-w-[110px] text-cyan-300 font-bold">{getVoiceInfo(globalVoiceId).name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isGlobalVoiceDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-1 uppercase mb-1">
                  Assign Voice to All Dialogue Cuts:
                </div>

                {onUploadVoiceFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsGlobalVoiceDropdownOpen(false);
                      uploadVoiceInputRef.current?.click();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40 text-xs font-bold border border-indigo-500/30 transition mb-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Audio Sample...</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setGlobalVoiceId('');
                    onApplyVoiceToAll('', 'Auto Video Timbre');
                    setIsGlobalVoiceDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>🎵</span>
                    <span>Auto Video Timbre</span>
                  </span>
                  {!globalVoiceId && <span className="text-cyan-400 text-xs">✓</span>}
                </button>

                <div className="pt-1 pb-1 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">
                    Saved Voice Clones ({voiceProfiles.length})
                  </span>
                </div>

                {voiceProfiles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setGlobalVoiceId(v.id);
                      onApplyVoiceToAll(v.id, v.name);
                      setIsGlobalVoiceDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{v.avatarEmoji}</span>
                      <span className="truncate font-medium">{v.name}</span>
                    </span>
                    {globalVoiceId === v.id && (
                      <span className="text-cyan-400 text-xs shrink-0 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onAddSegment}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cut</span>
          </button>

          <button
            type="button"
            onClick={onOpenVoiceLibrary}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-cyan-300 border border-slate-700 transition"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Voice Library ({voiceProfiles.length})</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAllSegments}
            disabled={isGeneratingAll || segments.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Dubbing All...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Dub All Cuts</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unified Dialogue Cuts List */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
        {segments.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-xs">
            No dialogue cuts detected. Upload a video file or load Project Alpha.
          </div>
        ) : (
          segments.map((seg) => {
            const isActive = activeSegmentId === seg.id;
            const isGeneratingThis = generatingSegmentId === seg.id;
            const isPlayingThis = playingSegmentId === seg.id;
            const isSynced = seg.status === 'synced';
            const voice = getVoiceInfo(seg.voiceProfileId);
            const isDropdownOpen = openVoiceDropdownId === seg.id;
            const speed = seg.playbackSpeed || 1.0;
            const cutDuration = parseFloat(Math.max(0.1, seg.endTime - seg.startTime).toFixed(2));
            const audioDur = seg.audioDuration ? parseFloat(seg.audioDuration.toFixed(2)) : cutDuration;

            return (
              <div
                key={seg.id}
                onClick={() => onSelectSegment(seg)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2.5 relative ${
                  isActive
                    ? 'bg-slate-900/95 border-cyan-500/70 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* ROW 1: Cut Badge, Timestamps, Character Voice Dropdown & Play/Delete Controls */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Cut #{seg.segmentNumber}
                    </span>

                    {/* Exact Timestamp Inputs */}
                    <div
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s</span>
                      <span className="text-cyan-400 font-bold">({cutDuration.toFixed(1)}s)</span>
                    </div>

                    {/* Character Voice Selector Dropdown */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setOpenVoiceDropdownId(isDropdownOpen ? null : seg.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${getBadgeColorClass(
                          voice.color
                        )}`}
                        title="Select Character Voice Clone for this sentence"
                      >
                        <span>{voice.avatar}</span>
                        <span className="truncate max-w-[130px]">{voice.name}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateSegmentVoice(seg.id, '', 'Auto Video Timbre');
                              setOpenVoiceDropdownId(null);
                            }}
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition"
                          >
                            <span className="flex items-center gap-2">
                              <span>🎵</span>
                              <span>Auto Video Timbre</span>
                            </span>
                            {!seg.voiceProfileId && <span className="text-cyan-400 text-xs">✓</span>}
                          </button>

                          <div className="pt-1 pb-1 border-t border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">
                              Saved Voice Clones
                            </span>
                          </div>

                          {voiceProfiles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                onUpdateSegmentVoice(seg.id, v.id, v.name);
                                setOpenVoiceDropdownId(null);
                              }}
                              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span>{v.avatarEmoji}</span>
                                <span className="truncate">{v.name}</span>
                              </span>
                              {seg.voiceProfileId === v.id && (
                                <span className="text-cyan-400 text-xs shrink-0">✓</span>
                              )}
                            </button>
                          ))}

                          <div className="pt-1 border-t border-slate-800 flex justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                if (seg.voiceProfileId) {
                                  onApplyVoiceToAll(seg.voiceProfileId, voice.name);
                                }
                                setOpenVoiceDropdownId(null);
                              }}
                              disabled={!seg.voiceProfileId}
                              className="text-[10px] text-cyan-400 hover:underline p-1 disabled:opacity-30"
                            >
                              Apply to All Cuts
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenVoiceDropdownId(null);
                                onOpenVoiceLibrary();
                              }}
                              className="text-[10px] text-indigo-400 hover:underline p-1"
                            >
                              Manage Library...
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cut Quick Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onPlaySegmentRange(seg.startTime, seg.endTime)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
                      title="Play this cut inside video viewport"
                    >
                      <Play className="w-3 h-3 fill-slate-300" />
                      <span>Play Cut</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSaveSegmentAsVoiceProfile(seg)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition"
                      title="Save this cut's voice into Voice Library"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSegment(seg.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete cut"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ROW 2: Original Dialogue Speech Text */}
                {seg.originalText && (
                  <p className="text-xs text-slate-400 leading-relaxed font-sans px-1">
                    <strong className="text-slate-500 font-normal">Original: </strong>{seg.originalText}
                  </p>
                )}

                {/* ROW 3: Editable Khmer Translation Textarea */}
                <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>Khmer Translation (Spoken Clearly & Naturally):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {onPolishTranslation && seg.originalText && (
                        <button
                          type="button"
                          onClick={() => onPolishTranslation(seg.id, seg.originalText, seg.khmerTranslation)}
                          disabled={polishingSegmentId === seg.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium transition disabled:opacity-50"
                          title="Use AI to polish and translate into natural, idiomatic Khmer"
                        >
                          {polishingSegmentId === seg.id ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span>Polishing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                              <span>✨ Polish Khmer</span>
                            </>
                          )}
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {seg.khmerTranslation.length} chars
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={seg.khmerTranslation}
                    onChange={(e) => onUpdateKhmerText(seg.id, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-khmer leading-relaxed resize-none transition"
                  />
                </div>

                {/* ROW 4: Voice Speed Control & Synthesis Actions */}
                <div
                  className="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-slate-800/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Speed Increase / Decrease Control Widget */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700/80 text-xs shadow-inner">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>Voice Speed:</span>
                      </span>

                      {/* Decrease Speed Button */}
                      <button
                        type="button"
                        onClick={() => onUpdateSegmentSpeed(seg.id, parseFloat(Math.max(0.5, speed - 0.05).toFixed(2)))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600/40 text-slate-200 text-sm font-bold border border-slate-700 hover:border-slate-600 transition shadow-sm"
                        title="Decrease voice speed (-0.05x)"
                      >
                        -
                      </button>

                      {/* Speed Display */}
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          Math.abs(speed - 1.0) < 0.01
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                            : 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30'
                        }`}
                      >
                        {speed.toFixed(2)}x {Math.abs(speed - 1.0) < 0.01 ? '(Normal)' : ''}
                      </span>

                      {/* Increase Speed Button */}
                      <button
                        type="button"
                        onClick={() => onUpdateSegmentSpeed(seg.id, parseFloat(Math.min(2.0, speed + 0.05).toFixed(2)))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600/40 text-slate-200 text-sm font-bold border border-slate-700 hover:border-slate-600 transition shadow-sm"
                        title="Increase voice speed (+0.05x)"
                      >
                        +
                      </button>

                      {/* Speed Presets */}
                      <div className="flex items-center gap-1 ml-1 border-l border-slate-800 pl-1.5">
                        {[0.85, 0.95, 1.0, 1.1, 1.2, 1.3].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => onUpdateSegmentSpeed(seg.id, preset)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                              Math.abs(speed - preset) < 0.02
                                ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                            title={`Set speed to ${preset}x`}
                          >
                            {preset === 1.0 ? '1x Normal' : `${preset}x`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isSynced && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Synced ({audioDur.toFixed(1)}s)</span>
                      </span>
                    )}
                  </div>

                  {/* Actions: Preview & Dub */}
                  <div className="flex items-center gap-2">
                    {isSynced && (
                      <button
                        type="button"
                        onClick={() => onPreviewSegmentAudio(seg)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                        title="Preview Dubbed Audio"
                      >
                        {isPlayingThis ? (
                          <Pause className="w-3.5 h-3.5 fill-emerald-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-emerald-400" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onGenerateSegmentAudio(seg)}
                      disabled={isGeneratingThis || isGeneratingAll}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md transition ${
                        isSynced
                          ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/20'
                      } disabled:opacity-50`}
                    >
                      {isGeneratingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dubbing Voice...</span>
                        </>
                      ) : isSynced ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Re-dub</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Dub Voice</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
