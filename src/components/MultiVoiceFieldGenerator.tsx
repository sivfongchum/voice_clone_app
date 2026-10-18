'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileCode2,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Play,
  Pause,
  Download,
  Gauge,
  Scissors,
  Bookmark,
  Volume2,
  Users,
  ChevronDown,
  RotateCcw,
  ListPlus,
  Split,
  FastForward,
  Check,
} from 'lucide-react';
import { countKhmerWords, chunkKhmerText } from '@/lib/khmerChunker';
import { KHMER_PRESETS, KhmerPreset } from '@/lib/presets';
import { VoiceProfile } from '@/lib/voiceProfileManager';
import { formatTime } from '@/lib/audioUtils';

export interface VoiceTextFieldItem {
  id: string;
  fieldNumber: number;
  text: string;
  voiceProfileId?: string;
  voiceProfileName?: string;
  playbackSpeed?: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  error?: string;
}

interface MultiVoiceFieldGeneratorProps {
  fields: VoiceTextFieldItem[];
  onAddField: () => void;
  onRemoveField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onClearAllFields: () => void;
  onUpdateFieldText: (id: string, text: string) => void;
  onUpdateFieldVoice: (id: string, voiceProfileId: string, voiceProfileName: string) => void;
  onUpdateFieldSpeed: (id: string, speed: number) => void;
  onGenerateSingleField: (field: VoiceTextFieldItem) => Promise<void>;
  onGenerateAllFields: () => Promise<void>;
  isGeneratingAll: boolean;
  activeGeneratingId: string | null;
  voiceProfiles: VoiceProfile[];
  masterVoiceName?: string;
  enableAutoChunking: boolean;
  onToggleAutoChunking: (enabled: boolean) => void;
  maxCharsPerChunk: number;
  onApplyPresetToField: (fieldId: string, preset: KhmerPreset) => void;
  onSplitScriptIntoFields: (scriptText: string, splitMode: 'newline' | 'khmer_sentence') => void;
  onSelectFieldForMasterPlayer?: (field: VoiceTextFieldItem) => void;
}

export const MultiVoiceFieldGenerator: React.FC<MultiVoiceFieldGeneratorProps> = ({
  fields,
  onAddField,
  onRemoveField,
  onDuplicateField,
  onClearAllFields,
  onUpdateFieldText,
  onUpdateFieldVoice,
  onUpdateFieldSpeed,
  onGenerateSingleField,
  onGenerateAllFields,
  isGeneratingAll,
  activeGeneratingId,
  voiceProfiles,
  masterVoiceName = 'Master Reference Voice',
  enableAutoChunking,
  onToggleAutoChunking,
  maxCharsPerChunk,
  onApplyPresetToField,
  onSplitScriptIntoFields,
  onSelectFieldForMasterPlayer,
}) => {
  const [openVoiceDropdownId, setOpenVoiceDropdownId] = useState<string | null>(null);
  const [openPresetDropdownId, setOpenPresetDropdownId] = useState<string | null>(null);
  const [playingFieldId, setPlayingFieldId] = useState<string | null>(null);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [rawScriptText, setRawScriptText] = useState('');
  const [splitMode, setSplitMode] = useState<'newline' | 'khmer_sentence'>('newline');
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState<number>(-1);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const activeCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Statistics
  const totalFields = fields.length;
  const completedFields = useMemo(() => fields.filter((f) => f.status === 'completed'), [fields]);
  const nonEmptyFields = useMemo(() => fields.filter((f) => f.text.trim().length > 0), [fields]);
  const totalWords = useMemo(
    () => fields.reduce((sum, f) => sum + countKhmerWords(f.text), 0),
    [fields]
  );
  const totalChars = useMemo(
    () => fields.reduce((sum, f) => sum + f.text.length, 0),
    [fields]
  );

  // Auto-scroll to currently generating field
  useEffect(() => {
    if (activeGeneratingId) {
      const el = activeCardRefs.current.get(activeGeneratingId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeGeneratingId]);

  // Clean up audio playback when component unmounts
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Voice helper
  const getVoiceInfo = (voiceProfileId?: string) => {
    if (!voiceProfileId) {
      return { name: masterVoiceName, avatar: '🎵', color: 'indigo' };
    }
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

  // Toggle single field audio playback
  const handleTogglePlayAudio = (field: VoiceTextFieldItem) => {
    if (!field.audioUrl) return;

    if (playingFieldId === field.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingFieldId(null);
      setIsPlaylistPlaying(false);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(field.audioUrl);
    const speed = field.playbackSpeed || 1.0;
    audio.playbackRate = speed;
    audio.preservesPitch = true;
    audioPlayerRef.current = audio;

    audio.onended = () => {
      setPlayingFieldId(null);
    };

    audio.onerror = () => {
      setPlayingFieldId(null);
    };

    audio.play().catch(() => {});
    setPlayingFieldId(field.id);

    // Also notify parent master player if needed
    onSelectFieldForMasterPlayer?.(field);
  };

  // Play All Completed Fields Sequentially
  const handlePlayAllSequentially = () => {
    const playable = fields.filter((f) => f.status === 'completed' && f.audioUrl);
    if (playable.length === 0) return;

    if (isPlaylistPlaying) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsPlaylistPlaying(false);
      setPlayingFieldId(null);
      setPlaylistIndex(-1);
      return;
    }

    setIsPlaylistPlaying(true);

    const playNext = (index: number) => {
      if (index >= playable.length) {
        setIsPlaylistPlaying(false);
        setPlayingFieldId(null);
        setPlaylistIndex(-1);
        return;
      }

      setPlaylistIndex(index);
      const current = playable[index];
      setPlayingFieldId(current.id);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(current.audioUrl);
      audio.playbackRate = current.playbackSpeed || 1.0;
      audio.preservesPitch = true;
      audioPlayerRef.current = audio;

      audio.onended = () => {
        playNext(index + 1);
      };

      audio.onerror = () => {
        playNext(index + 1);
      };

      audio.play().catch(() => {
        playNext(index + 1);
      });

      onSelectFieldForMasterPlayer?.(current);
    };

    playNext(0);
  };

  // Download All Completed WAV files
  const handleDownloadAllCompleted = () => {
    const completed = fields.filter((f) => f.status === 'completed' && f.audioUrl);
    if (completed.length === 0) return;

    completed.forEach((field, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = field.audioUrl!;
        a.download = `khmer_voice_field_${field.fieldNumber}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 260);
    });
  };

  // Split Script action
  const handleConfirmSplitScript = () => {
    if (!rawScriptText.trim()) return;
    onSplitScriptIntoFields(rawScriptText, splitMode);
    setRawScriptText('');
    setIsScriptModalOpen(false);
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Top Header & Global Batch Action Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Multi-Field Voice Synthesis</span>
                <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  Unlimited Fields
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-khmer">
              ដំណាក់កាលបម្លែងសំឡេង៖ បញ្ចូលអត្ថបទច្រើនប្រអប់ និងបម្លែងសំឡេងទាំងអស់ដោយស្វ័យប្រវត្តិ
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Field Button */}
          <button
            type="button"
            onClick={onAddField}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold shadow-sm transition"
            title="Add a new text field"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Field</span>
          </button>

          {/* Split Script Button */}
          <button
            type="button"
            onClick={() => setIsScriptModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition"
            title="Paste full script and auto-split into fields"
          >
            <Split className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split Script</span>
          </button>

          {/* Play All Sequentially (if completed fields exist) */}
          {completedFields.length > 0 && (
            <button
              type="button"
              onClick={handlePlayAllSequentially}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isPlaylistPlaying
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title="Play all completed fields sequentially"
            >
              {isPlaylistPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-rose-300" />
                  <span>Stop Playlist</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-emerald-300" />
                  <span>Play All ({completedFields.length})</span>
                </>
              )}
            </button>
          )}

          {/* Download All Completed (if completed fields exist) */}
          {completedFields.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadAllCompleted}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
              title="Download all completed WAV files sequentially"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All ({completedFields.length})</span>
            </button>
          )}

          {/* Prominent GENERATE ALL Button */}
          <button
            type="button"
            onClick={onGenerateAllFields}
            disabled={isGeneratingAll || nonEmptyFields.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none"
            title="Generate voice for all text fields one by one"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Fields...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Generate All ({nonEmptyFields.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-slate-400 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <strong className="text-slate-200">{totalFields}</strong> fields
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <strong>{completedFields.length}</strong> generated
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <strong className="text-cyan-300">{totalWords}</strong> words
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <strong className="text-slate-300">{totalChars}</strong> chars
          </span>
        </div>

        <div className="flex items-center gap-2">
          {fields.length > 1 && (
            <button
              type="button"
              onClick={onClearAllFields}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition"
              title="Clear all fields"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Script Splitter Modal Dialog */}
      {isScriptModalOpen && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Paste Script to Split into Unlimited Fields
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsScriptModalOpen(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕ Close
            </button>
          </div>

          <textarea
            value={rawScriptText}
            onChange={(e) => setRawScriptText(e.target.value)}
            placeholder="បិទភ្ជាប់អត្ថបទវែង ឬស្គ្រីបទាំងមូលនៅទីនេះ ដើម្បីបំបែកជាច្រើនប្រអប់ដោយស្វ័យប្រវត្តិ...&#10;Paste your full script or paragraphs here..."
            rows={4}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 font-khmer focus:outline-none focus:border-cyan-500 transition resize-y"
          />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="text-[11px] text-slate-400">Split by:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === 'newline'}
                  onChange={() => setSplitMode('newline')}
                  className="text-cyan-600 focus:ring-0"
                />
                <span>New Line (Paragraph / Row)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === 'khmer_sentence'}
                  onChange={() => setSplitMode('khmer_sentence')}
                  className="text-cyan-600 focus:ring-0"
                />
                <span>Khmer Sentence (។, ?, !)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScriptModalOpen(false)}
                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSplitScript}
                disabled={!rawScriptText.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md disabled:opacity-40 transition"
              >
                Split & Create Fields
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNLIMITED VOICE FIELDS LIST */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {fields.length === 0 ? (
          <div className="text-center p-8 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
            <p className="text-xs">No text fields added yet.</p>
            <button
              type="button"
              onClick={onAddField}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow transition"
            >
              + Add First Field
            </button>
          </div>
        ) : (
          fields.map((field) => {
            const isGeneratingThis = activeGeneratingId === field.id || field.status === 'generating';
            const isCompleted = field.status === 'completed';
            const isPlayingThis = playingFieldId === field.id;
            const voice = getVoiceInfo(field.voiceProfileId);
            const speed = field.playbackSpeed || 1.0;
            const isVoiceDropdownOpen = openVoiceDropdownId === field.id;
            const isPresetDropdownOpen = openPresetDropdownId === field.id;
            const wordCount = countKhmerWords(field.text);
            const charCount = field.text.length;

            return (
              <div
                key={field.id}
                ref={(el) => {
                  if (el) activeCardRefs.current.set(field.id, el);
                  else activeCardRefs.current.delete(field.id);
                }}
                className={`p-3.5 rounded-2xl border transition relative space-y-2.5 ${
                  isGeneratingThis
                    ? 'bg-slate-900/95 border-cyan-500 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-500/40'
                    : isCompleted
                    ? 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* ROW 1: Field Badge, Counters, Voice Selector, Speed, Duplicate & Delete */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Field Number Badge */}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Field #{field.fieldNumber}
                    </span>

                    {/* Word and Char Counters */}
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      <strong className="text-slate-200">{wordCount}</strong> words • <strong className="text-slate-300">{charCount}</strong> chars
                    </span>

                    {/* Character Voice Clone Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenVoiceDropdownId(isVoiceDropdownOpen ? null : field.id)
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border transition ${getBadgeColorClass(
                          voice.color
                        )}`}
                        title="Choose voice clone for this field"
                      >
                        <span>{voice.avatar}</span>
                        <span className="truncate max-w-[120px]">{voice.name}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>

                      {/* Dropdown Menu */}
                      {isVoiceDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateFieldVoice(field.id, '', masterVoiceName);
                              setOpenVoiceDropdownId(null);
                            }}
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition"
                          >
                            <span className="flex items-center gap-2">
                              <span>🎵</span>
                              <span>{masterVoiceName}</span>
                            </span>
                            {!field.voiceProfileId && <span className="text-cyan-400 text-xs">✓</span>}
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
                                onUpdateFieldVoice(field.id, v.id, v.name);
                                setOpenVoiceDropdownId(null);
                              }}
                              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span>{v.avatarEmoji}</span>
                                <span className="truncate font-medium">{v.name}</span>
                              </span>
                              {field.voiceProfileId === v.id && (
                                <span className="text-cyan-400 text-xs shrink-0 font-bold">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Duplicate & Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDuplicateField(field.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition"
                      title="Duplicate this field"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveField(field.id)}
                      disabled={fields.length <= 1}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-30 disabled:pointer-events-none"
                      title="Delete field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ROW 2: Textarea for Khmer Speech */}
                <div className="space-y-1">
                  <textarea
                    value={field.text}
                    onChange={(e) => onUpdateFieldText(field.id, e.target.value)}
                    placeholder={`បញ្ចូលអត្ថបទខ្មែរសម្រាប់ Field #${field.fieldNumber}...`}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-khmer leading-relaxed resize-y transition shadow-inner"
                  />
                </div>

                {/* ROW 3: Controls, Speed, Presets & Generation / Preview Buttons */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/60">
                  {/* Left: Speed adjuster & Presets loader */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Speed Adjuster */}
                    <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-xl border border-slate-800 text-xs">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px] text-slate-400">Speed:</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFieldSpeed(
                            field.id,
                            parseFloat(Math.max(0.5, speed - 0.05).toFixed(2))
                          )
                        }
                        className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                        title="Decrease voice speed (-0.05x)"
                      >
                        -
                      </button>
                      <span
                        className={`text-[11px] font-mono font-bold px-1 ${
                          Math.abs(speed - 1.0) < 0.01 ? 'text-emerald-400' : 'text-cyan-300'
                        }`}
                      >
                        {speed.toFixed(2)}x
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFieldSpeed(
                            field.id,
                            parseFloat(Math.min(2.0, speed + 0.05).toFixed(2))
                          )
                        }
                        className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                        title="Increase voice speed (+0.05x)"
                      >
                        +
                      </button>

                      {/* Speed Presets */}
                      <div className="flex items-center gap-0.5 ml-1 border-l border-slate-800 pl-1">
                        {[0.9, 1.0, 1.15, 1.25].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => onUpdateFieldSpeed(field.id, preset)}
                            className={`px-1 py-0.5 rounded text-[9px] font-mono transition ${
                              Math.abs(speed - preset) < 0.02
                                ? 'bg-cyan-500/25 text-cyan-200 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {preset === 1.0 ? '1x' : `${preset}x`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Presets Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPresetDropdownId(isPresetDropdownOpen ? null : field.id)
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 transition"
                        title="Load sample Khmer preset"
                      >
                        <Bookmark className="w-3 h-3 text-indigo-400" />
                        <span>Presets</span>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                      </button>

                      {isPresetDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 px-1 uppercase mb-1">
                            Load Preset into Field #{field.fieldNumber}:
                          </div>
                          {KHMER_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onApplyPresetToField(field.id, p);
                                setOpenPresetDropdownId(null);
                              }}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 transition text-xs"
                            >
                              <div className="font-semibold text-slate-200">{p.titleEnglish}</div>
                              <div className="text-[10px] font-khmer text-slate-400 truncate">
                                {p.titleKhmer}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Pill */}
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Generated ({field.duration ? `${field.duration.toFixed(1)}s` : 'OK'})</span>
                      </span>
                    )}

                    {field.status === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Audio Preview, Download & Single Dub Action */}
                  <div className="flex items-center gap-2">
                    {/* Audio Preview Button */}
                    {isCompleted && field.audioUrl && (
                      <button
                        type="button"
                        onClick={() => handleTogglePlayAudio(field)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                          isPlayingThis
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                        }`}
                        title={isPlayingThis ? 'Pause audio' : 'Play audio preview'}
                      >
                        {isPlayingThis ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    )}

                    {/* Download WAV button */}
                    {isCompleted && field.audioUrl && (
                      <a
                        href={field.audioUrl}
                        download={`khmer_voice_field_${field.fieldNumber}.wav`}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:text-emerald-400 hover:border-emerald-500/30 transition"
                        title="Download .wav file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Single Field Dub Button */}
                    <button
                      type="button"
                      onClick={() => onGenerateSingleField(field)}
                      disabled={isGeneratingThis || isGeneratingAll || !field.text.trim()}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition shadow-sm ${
                        isCompleted
                          ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/20'
                      } disabled:opacity-50`}
                      title={`Synthesize Field #${field.fieldNumber}`}
                    >
                      {isGeneratingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dubbing...</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-dub</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
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

      {/* Bottom Action Footer with Add Field Button */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onAddField}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>+ Add Another Field (Unlimited)</span>
        </button>

        <button
          type="button"
          onClick={onGenerateAllFields}
          disabled={isGeneratingAll || nonEmptyFields.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
        >
          {isGeneratingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing All Fields One by One...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>⚡ Generate All Fields ({nonEmptyFields.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
