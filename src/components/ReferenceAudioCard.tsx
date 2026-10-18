'use client';

import React, { useState } from 'react';
import { Mic, FileText, Sparkles, ChevronDown, ChevronUp, Users, BookmarkPlus, Check } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { VoiceProfile } from '@/lib/voiceProfileManager';

interface ReferenceAudioCardProps {
  referenceAudioBlob: Blob | null;
  referenceAudioDuration: number;
  voiceProfiles?: VoiceProfile[];
  selectedVoiceId?: string;
  onSelectVoiceProfile?: (voice: VoiceProfile) => void;
  onOpenVoiceLibrary?: () => void;
  onSaveCurrentAsVoiceProfile?: () => void;
  onAudioReady: (blob: Blob, duration: number) => void;
  onClearAudio: () => void;
  promptTranscript?: string;
  onChangePromptTranscript?: (text: string) => void;
}

export const ReferenceAudioCard: React.FC<ReferenceAudioCardProps> = ({
  referenceAudioBlob,
  referenceAudioDuration,
  voiceProfiles = [],
  selectedVoiceId,
  onSelectVoiceProfile,
  onOpenVoiceLibrary,
  onSaveCurrentAsVoiceProfile,
  onAudioReady,
  onClearAudio,
  promptTranscript = '',
  onChangePromptTranscript,
}) => {
  const [showAdvancedTranscript, setShowAdvancedTranscript] = useState(false);

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>1. Reference Voice Sample</span>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Pure Audio Timbre (3-6s)
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-khmer">
              ជ្រើសរើសសំឡេងដែលបានចងចាំ ឬ ថតសំឡេងគំរូថ្មី (.wav)
            </p>
          </div>
        </div>

        {/* Quick Voice Library Trigger */}
        {onOpenVoiceLibrary && (
          <button
            type="button"
            onClick={onOpenVoiceLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-cyan-300 border border-slate-700 transition"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Voice Library ({voiceProfiles.length})</span>
          </button>
        )}
      </div>

      {/* Quick Select from Saved Voices (Carousel/Pills) */}
      {voiceProfiles.length > 0 && onSelectVoiceProfile && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Choose from Saved Voice Clones:
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {voiceProfiles.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => onSelectVoiceProfile(voice)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-400 text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm">{voice.avatarEmoji}</span>
                  <span className="truncate max-w-[120px]">{voice.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Audio Recorder / Uploader Component */}
      <AudioRecorder
        recordedBlob={referenceAudioBlob}
        recordedDuration={referenceAudioDuration}
        onAudioReady={onAudioReady}
        onClearAudio={onClearAudio}
      />

      {/* Save current audio to voice library button */}
      {referenceAudioBlob && onSaveCurrentAsVoiceProfile && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onSaveCurrentAsVoiceProfile}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 text-xs font-medium transition"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>💾 Save Current Sample to Voice Library</span>
          </button>
        </div>
      )}

      {/* Optional Advanced Transcript Accordion */}
      {onChangePromptTranscript && (
        <div className="pt-1 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowAdvancedTranscript(!showAdvancedTranscript)}
            className="flex items-center justify-between w-full py-1 text-[11px] text-slate-400 hover:text-slate-300 transition"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Prompt Transcript (Optional - leave empty for clean cloning)</span>
            </span>
            {showAdvancedTranscript ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showAdvancedTranscript && (
            <div className="mt-2 space-y-2 animate-fade-in">
              <textarea
                value={promptTranscript}
                onChange={(e) => onChangePromptTranscript(e.target.value)}
                placeholder="Optional: Enter reference transcript only if needed..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-khmer resize-none"
              />
              <p className="text-[10px] text-slate-400">
                💡 Tip: Leaving this empty prevents multi-speaker echo / overlapping voices.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
