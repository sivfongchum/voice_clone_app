'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Mic,
  Upload,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Plus,
  Check,
  Radio,
  Volume2,
  Layers,
  Clock,
  User,
} from 'lucide-react';
import { VoiceProfile, VoiceGender, saveNewVoiceProfile, deleteVoiceProfileFromStorage } from '@/lib/voiceProfileManager';
import { convertBlobToWav, formatTime } from '@/lib/audioUtils';

interface VoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceProfiles: VoiceProfile[];
  onProfilesUpdated: (profiles: VoiceProfile[]) => void;
  selectedVoiceId?: string;
  onSelectVoice?: (voice: VoiceProfile) => void;
}

const COLOR_OPTIONS = [
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500', border: 'border-indigo-500' },
  { name: 'Cyan', value: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-500' },
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', border: 'border-purple-500' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-500', border: 'border-rose-500' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500', border: 'border-amber-500' },
];

const EMOJI_OPTIONS = ['🎙️', '👨‍💼', '👩‍💼', '🗣️', '🎭', '🤖', '⚡', '✨'];

export const VoiceProfileModal: React.FC<VoiceProfileModalProps> = ({
  isOpen,
  onClose,
  voiceProfiles,
  onProfilesUpdated,
  selectedVoiceId,
  onSelectVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'record' | 'upload'>('library');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // New Voice Form State
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceGender, setNewVoiceGender] = useState<VoiceGender>('male');
  const [newVoiceColor, setNewVoiceColor] = useState('cyan');
  const [newVoiceEmoji, setNewVoiceEmoji] = useState('🎙️');
  const [newVoiceDescription, setNewVoiceDescription] = useState('');

  // Audio Capture State
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDuration, setCapturedDuration] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  if (!isOpen) return null;

  // Play audio sample preview for a voice
  const handleTogglePlayVoice = (voice: VoiceProfile) => {
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (voice.audioBlob) {
      const url = URL.createObjectURL(voice.audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingVoiceId(voice.id);
      audio.play().catch((e) => console.log('Audio play error:', e));
      audio.onended = () => setPlayingVoiceId(null);
    }
  };

  // Recording Handlers
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const { wavBlob, duration } = await convertBlobToWav(rawBlob, 24000);
          setCapturedBlob(wavBlob);
          setCapturedDuration(duration);
        } catch (err) {
          console.warn('WAV conversion fallback:', err);
          setCapturedBlob(rawBlob);
          setCapturedDuration(recordingTime);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= 7.0) {
          stopRecording();
        }
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setErrorMessage(msg);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Upload Audio Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    try {
      const { wavBlob, duration } = await convertBlobToWav(file, 24000);
      setCapturedBlob(wavBlob);
      setCapturedDuration(duration);
      if (!newVoiceName) {
        setNewVoiceName(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decode audio file';
      setErrorMessage(msg);
    }
  };

  // Save new Voice Profile
  const handleSaveProfile = async () => {
    if (!capturedBlob) {
      setErrorMessage('Please record or upload a voice sample (3-6 seconds) first.');
      return;
    }
    if (!newVoiceName.trim()) {
      setErrorMessage('Please give your voice clone a name.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const newVoice = await saveNewVoiceProfile(newVoiceName, capturedBlob, capturedDuration, {
        gender: newVoiceGender,
        color: newVoiceColor,
        avatarEmoji: newVoiceEmoji,
        description: newVoiceDescription || `Custom voice clone (${capturedDuration.toFixed(1)}s)`,
      });

      const updated = [newVoice, ...voiceProfiles];
      onProfilesUpdated(updated);

      // Reset form
      setCapturedBlob(null);
      setCapturedDuration(0);
      setNewVoiceName('');
      setNewVoiceDescription('');
      setActiveTab('library');

      if (onSelectVoice) {
        onSelectVoice(newVoice);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save voice profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteVoiceProfileFromStorage(id);
    const updated = voiceProfiles.filter((v) => v.id !== id);
    onProfilesUpdated(updated);
  };

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'rose':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Voice Clone Library & Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {voiceProfiles.length} Voices
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-khmer">
                គ្រប់គ្រង និងចងចាំសំឡេងគំរូសម្រាប់បម្លែងក្នុងវីដេអូ ឬ TTS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'library'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Saved Voice Clones ({voiceProfiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('record');
              setCapturedBlob(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'record'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Record New Voice</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setCapturedBlob(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Audio Sample</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: SAVED VOICES LIST */}
          {activeTab === 'library' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {voiceProfiles.map((voice) => {
                  const isSelected = selectedVoiceId === voice.id;
                  const isPlaying = playingVoiceId === voice.id;
                  const badgeClass = getBadgeStyle(voice.color);

                  return (
                    <div
                      key={voice.id}
                      onClick={() => onSelectVoice && onSelectVoice(voice)}
                      className={`p-3.5 rounded-2xl border transition relative group cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                            {voice.avatarEmoji}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{voice.name}</span>
                              {voice.isPreset && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                  Preset
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {voice.description || `${voice.gender} voice`}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                {voice.gender}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {formatTime(voice.duration)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlayVoice(voice);
                            }}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 transition"
                            title="Listen to sample"
                          >
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-cyan-400" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-cyan-400" />
                            )}
                          </button>

                          {!voice.isPreset && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProfile(voice.id, e)}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete voice clone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('record')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create / Record Another Voice Clone</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: RECORD OR UPLOAD NEW VOICE CLONE */}
          {(activeTab === 'record' || activeTab === 'upload') && (
            <div className="space-y-4">
              {/* Voice Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Voice Clone Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Male Host, Hero, Alice..."
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Voice Gender / Type</label>
                  <select
                    value={newVoiceGender}
                    onChange={(e) => setNewVoiceGender(e.target.value as VoiceGender)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="male">Male (បុរស)</option>
                    <option value="female">Female (នារី)</option>
                    <option value="character">Character / Dynamic (តួអង្គ)</option>
                    <option value="custom">Custom Persona</option>
                  </select>
                </div>
              </div>

              {/* Avatar & Color Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Avatar Icon</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewVoiceEmoji(emoji)}
                        className={`text-lg p-1.5 rounded-lg border transition ${
                          newVoiceEmoji === emoji
                            ? 'bg-cyan-500/20 border-cyan-400'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Color Tag</label>
                  <div className="flex items-center gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewVoiceColor(c.value)}
                        className={`w-6 h-6 rounded-full ${c.bg} transition transform hover:scale-110 flex items-center justify-center ${
                          newVoiceColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70'
                        }`}
                      >
                        {newVoiceColor === c.value && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audio Source: Record or File */}
              {activeTab === 'record' ? (
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center space-y-3">
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-xl ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                          : 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white'
                      }`}
                    >
                      <Mic className="w-7 h-7" />
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-200">
                      {isRecording ? `Recording... ${recordingTime.toFixed(1)}s / 6.0s` : 'Click to record your voice sample (3-6s)'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-khmer mt-0.5">
                      និយាយភាសាខ្មែរ ឬ អង់គ្លេសច្បាស់ៗរយៈពេល ៣ ទៅ ៦ វិនាទី
                    </p>
                  </div>

                  {capturedBlob && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                      <Check className="w-4 h-4" />
                      <span>Audio captured successfully ({capturedDuration.toFixed(1)}s)!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 hover:border-slate-500 transition flex flex-col items-center justify-center space-y-2 cursor-pointer relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-cyan-400" />
                  <p className="text-xs font-bold text-slate-200">Choose Audio Sample File (.wav, .mp3, .m4a)</p>
                  <p className="text-[11px] text-slate-400">Audio will be converted automatically to 24kHz mono PCM WAV</p>

                  {capturedBlob && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mt-2">
                      <Check className="w-4 h-4" />
                      <span>Audio file loaded ({capturedDuration.toFixed(1)}s)!</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={!capturedBlob || !newVoiceName.trim() || isSaving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSaving ? 'Saving to Library...' : '💾 Save Voice Clone'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
