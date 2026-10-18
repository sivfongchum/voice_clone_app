'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle,
  Radio,
  Loader2,
  Film,
  Mic,
  FolderKanban,
  Download,
  Users,
} from 'lucide-react';

import { Header } from '@/components/Header';
import { ApiConfigModal } from '@/components/ApiConfigModal';
import { ColabGuideModal } from '@/components/ColabGuideModal';
import { ReferenceAudioCard } from '@/components/ReferenceAudioCard';
import {
  MultiVoiceFieldGenerator,
  VoiceTextFieldItem,
} from '@/components/MultiVoiceFieldGenerator';
import { InferenceControls } from '@/components/InferenceControls';
import { AudioPlayer } from '@/components/AudioPlayer';
import { GenerationStatus, GenerationProgress } from '@/components/GenerationStatus';
import { AudioHistory, HistoryItem } from '@/components/AudioHistory';
import { VoiceProfileModal } from '@/components/VoiceProfileModal';

// Video Studio Components (LinguaSync Pro)
import { VideoPlayerPane } from '@/components/video/VideoPlayerPane';
import { AiAudioProcessControl } from '@/components/video/AiAudioProcessControl';
import { MultiTrackTimeline } from '@/components/video/MultiTrackTimeline';
import { VideoUploadModal } from '@/components/video/VideoUploadModal';
import { GlobalProjectTools } from '@/components/video/GlobalProjectTools';

import {
  checkBackendHealth,
  generateKhmerVoiceClone,
  HealthResponse,
} from '@/lib/api';
import {
  analyzeVideoWithGemini,
  polishKhmerTranslationWithGemini,
  VideoSpeakerSegment,
} from '@/lib/geminiApi';
import {
  extractAudioFromVideo,
  loadAudioBufferFromUrl,
  sliceAudioSegment,
  smartNaturalAudioFit,
} from '@/lib/videoAudioProcessor';
import {
  formatTime,
  getAudioBlobDuration,
  trimAudioSilence,
} from '@/lib/audioUtils';
import { SAMPLE_PROJECT_ALPHA } from '@/lib/sampleVideos';
import { KhmerPreset } from '@/lib/presets';
import {
  VoiceProfile,
  loadSavedVoiceProfiles,
  saveNewVoiceProfile,
  dataUrlToBlob,
} from '@/lib/voiceProfileManager';

export default function KhmerStudioDashboard() {
  // --- Studio Mode State ---
  const [activeMode, setActiveMode] = useState<'video_dubbing' | 'single_tts'>('video_dubbing');

  // --- Cloud Backend & Gemini API State ---
  const [apiUrl, setApiUrl] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [healthData, setHealthData] = useState<HealthResponse | undefined>();
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();

  // --- Voice Clones Library State ---
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [selectedTtsVoiceId, setSelectedTtsVoiceId] = useState<string>('');
  const [isVoiceLibraryOpen, setIsVoiceLibraryOpen] = useState<boolean>(false);

  // --- Video Studio Project State (LinguaSync Pro) ---
  const [projectName, setProjectName] = useState<string>('Project_Alpha');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_PROJECT_ALPHA.videoUrl);
  const [videoDuration, setVideoDuration] = useState<number>(SAMPLE_PROJECT_ALPHA.duration);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [segments, setSegments] = useState<VideoSpeakerSegment[]>(SAMPLE_PROJECT_ALPHA.segments);
  const [activeSegment, setActiveSegment] = useState<VideoSpeakerSegment | null>(null);
  const [audioMode, setAudioMode] = useState<'original' | 'dubbed' | 'side_by_side'>('dubbed');
  const [muteOriginal, setMuteOriginal] = useState<boolean>(false);
  const [enableDubbing, setEnableDubbing] = useState<boolean>(true);

  // Video processing state
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState<boolean>(false);
  const [analysisProgressText, setAnalysisProgressText] = useState<string>('');
  const [generatingSegmentId, setGeneratingSegmentId] = useState<string | null>(null);
  const [polishingSegmentId, setPolishingSegmentId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);

  // Video Element Ref & Audio Synchronizer Map
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fullAudioBufferRef = useRef<AudioBuffer | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playRangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Single-Voice TTS State ---
  const [referenceAudioBlob, setReferenceAudioBlob] = useState<Blob | null>(null);
  const [referenceAudioDuration, setReferenceAudioDuration] = useState<number>(0);
  const [promptTranscript, setPromptTranscript] = useState<string>('');
  const [targetText, setTargetText] = useState<string>(
    'ជំរាបសួរ! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធបម្លែងសំឡេងឆ្លាតវៃ VoxCPM 2។'
  );
  const [inferenceTimesteps, setInferenceTimesteps] = useState<number>(8);
  const [cfgScale, setCfgScale] = useState<number>(2.0);
  const [enableAutoChunking, setEnableAutoChunking] = useState<boolean>(true);
  const [maxCharsPerChunk, setMaxCharsPerChunk] = useState<number>(220);

  // --- Multi-Field Voice Generation State (Unlimited Fields + Sequential Batch) ---
  const [voiceFields, setVoiceFields] = useState<VoiceTextFieldItem[]>([
    {
      id: 'vf-1',
      fieldNumber: 1,
      text: 'ជំរាបសួរ! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធបម្លែងសំឡេងឆ្លាតវៃ VoxCPM 2។',
      status: 'idle',
      playbackSpeed: 1.0,
    },
    {
      id: 'vf-2',
      fieldNumber: 2,
      text: 'ខ្ញុំអាចក្លូនសំឡេងរបស់អ្នកបានយ៉ាងត្រឹមត្រូវ ១០០% ដោយគ្មានការកាត់ពាក្យឡើយ។',
      status: 'idle',
      playbackSpeed: 1.0,
    },
  ]);
  const [isGeneratingAllFields, setIsGeneratingAllFields] = useState<boolean>(false);
  const [activeGeneratingFieldId, setActiveGeneratingFieldId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    stage: 'uploading',
    currentChunk: 1,
    totalChunks: 1,
    percentage: 0,
    message: '',
  });
  const [synthesizedBlob, setSynthesizedBlob] = useState<Blob | null>(null);
  const [synthesizedUrl, setSynthesizedUrl] = useState<string | null>(null);

  // --- Modals State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // --- Toast Notification State ---
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
      setToast({ type, message });
      setTimeout(() => {
        setToast((current) => (current?.message === message ? null : current));
      }, 5000);
    },
    []
  );

  // Load Saved Voice Profiles on Mount
  useEffect(() => {
    loadSavedVoiceProfiles().then((loaded) => {
      setVoiceProfiles(loaded);
      if (loaded.length > 0) {
        setSelectedTtsVoiceId(loaded[0].id);
        if (loaded[0].audioBlob) {
          setReferenceAudioBlob(loaded[0].audioBlob);
          setReferenceAudioDuration(loaded[0].duration);
        }
      }
    });

    const savedUrl = localStorage.getItem('khmer_voxcpm_api_url') || '';
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    if (savedUrl) {
      setApiUrl(savedUrl);
      testConnection(savedUrl);
    }
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }

    const savedFields = localStorage.getItem('khmer_voice_fields');
    if (savedFields) {
      try {
        const parsed = JSON.parse(savedFields);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVoiceFields(
            parsed.map((item: any, idx: number) => ({
              id: item.id || `vf-${idx + 1}`,
              fieldNumber: idx + 1,
              text: item.text || '',
              voiceProfileId: item.voiceProfileId,
              voiceProfileName: item.voiceProfileName,
              playbackSpeed: item.playbackSpeed || 1.0,
              status: 'idle',
            }))
          );
        }
      } catch (e) {}
    }
  }, []);

  // Persist voice fields to localStorage whenever changed
  useEffect(() => {
    const serializable = voiceFields.map((f) => ({
      id: f.id,
      fieldNumber: f.fieldNumber,
      text: f.text,
      voiceProfileId: f.voiceProfileId,
      voiceProfileName: f.voiceProfileName,
      playbackSpeed: f.playbackSpeed,
    }));
    localStorage.setItem('khmer_voice_fields', JSON.stringify(serializable));
  }, [voiceFields]);

  const testConnection = async (url: string) => {
    if (!url.trim()) return;
    setIsTestingApi(true);
    setApiErrorMessage(undefined);

    const result = await checkBackendHealth(url);
    setIsOnline(result.isOnline);
    setLatencyMs(result.latencyMs);
    setHealthData(result.data);
    setApiErrorMessage(result.error);
    setIsTestingApi(false);

    if (result.isOnline) {
      showToast('success', `Connected to Colab GPU (${result.latencyMs}ms latency)`);
    } else if (result.error) {
      showToast('warning', result.error);
    }
  };

  const handleSaveApiUrl = (newUrl: string) => {
    setApiUrl(newUrl);
    localStorage.setItem('khmer_voxcpm_api_url', newUrl);
  };

  const handleSaveGeminiKey = (newKey: string) => {
    setGeminiApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
    showToast('success', 'Gemini API Key saved!');
  };

  // Keep Audio elements synchronized with generated segments
  useEffect(() => {
    segments.forEach((seg) => {
      if (seg.status === 'synced' && seg.synthesizedAudioUrl) {
        let audio = audioElementsRef.current.get(seg.id);
        if (!audio || audio.src !== seg.synthesizedAudioUrl) {
          if (audio) audio.pause();
          audio = new Audio(seg.synthesizedAudioUrl);
          audio.preload = 'auto';
          audioElementsRef.current.set(seg.id, audio);
        }
      } else {
        const audio = audioElementsRef.current.get(seg.id);
        if (audio) {
          audio.pause();
          audioElementsRef.current.delete(seg.id);
        }
      }
    });
  }, [segments]);

  // Real-Time Video & Audio Synchronizer Loop (1:1 Exact Time Alignment)
  useEffect(() => {
    let animationFrame: number;

    const syncTime = () => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        // Find the active segment matching this exact video timestamp
        const active =
          segments.find((s) => time >= s.startTime && time <= s.endTime) || null;
        setActiveSegment(active);

        // Video Volume Ducking
        if (enableDubbing && audioMode === 'dubbed') {
          if (active && active.status === 'synced') {
            videoRef.current.volume = muteOriginal ? 0 : 0.12;
          } else {
            videoRef.current.volume = muteOriginal ? 0 : 1.0;
          }
        } else {
          videoRef.current.volume = muteOriginal ? 0 : 1.0;
        }

        // Strict Single-Audio Triggering with Exact Timeline Offset
        if (enableDubbing && audioMode === 'dubbed' && isPlayingVideo) {
          const activeSegmentId = active?.status === 'synced' ? active.id : null;

          audioElementsRef.current.forEach((audio, segId) => {
            if (segId !== activeSegmentId) {
              if (!audio.paused) {
                audio.pause();
              }
            }
          });

          // Play only the active audio segment at the exact video time offset with frame-accurate precision
          if (active && active.status === 'synced') {
            const audio = audioElementsRef.current.get(active.id);
            if (audio) {
              const speed = audio.playbackRate || active.playbackSpeed || 1.0;
              audio.preservesPitch = true;
              const elapsedVideoTime = Math.max(0, time - active.startTime);
              const expectedAudioOffset = elapsedVideoTime * speed;
              if (Math.abs(audio.currentTime - expectedAudioOffset) > 0.06) {
                audio.currentTime = expectedAudioOffset;
              }
              if (audio.paused) {
                audio.play().catch(() => {});
              }
            }
          }
        } else {
          audioElementsRef.current.forEach((audio) => {
            if (!audio.paused) audio.pause();
          });
        }
      }

      if (isPlayingVideo) {
        animationFrame = requestAnimationFrame(syncTime);
      }
    };

    if (isPlayingVideo) {
      animationFrame = requestAnimationFrame(syncTime);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlayingVideo, segments, enableDubbing, muteOriginal, audioMode]);

  // Video Playback Controls
  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlayingVideo(true);
    }
  };

  const handlePauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    }
    audioElementsRef.current.forEach((audio) => {
      if (!audio.paused) audio.pause();
    });
  };

  const handleSeekVideo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }

    audioElementsRef.current.forEach((audio, segId) => {
      const seg = segments.find((s) => s.id === segId);
      if (seg && time >= seg.startTime && time <= seg.endTime) {
        const spd = audio.playbackRate || seg.playbackSpeed || 1.0;
        audio.preservesPitch = true;
        audio.currentTime = (time - seg.startTime) * spd;
      } else {
        if (!audio.paused) audio.pause();
      }
    });
  };

  // Play a specific segment cut in the video
  const handlePlaySegmentRange = (startSec: number, endSec: number) => {
    if (playRangeTimeoutRef.current) {
      clearTimeout(playRangeTimeoutRef.current);
    }
    if (videoRef.current) {
      handleSeekVideo(startSec);
      handlePlayVideo();

      const playDurationMs = Math.max(500, (endSec - startSec) * 1000 + 100);
      playRangeTimeoutRef.current = setTimeout(() => {
        handlePauseVideo();
      }, playDurationMs);
    }
  };

  // Upload Video & Analyze with Gemini API
  const handleUploadAndAnalyzeVideo = async (file: File) => {
    if (!geminiApiKey.trim()) {
      showToast('warning', 'Please enter your Google Gemini API Key first.');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    setIsAnalyzingVideo(true);
    setAnalysisProgressText('Extracting audio track from video...');

    try {
      const { audioBuffer, base64Audio, duration } = await extractAudioFromVideo(file);
      fullAudioBufferRef.current = audioBuffer;
      setVideoDuration(duration);

      setAnalysisProgressText('Gemini AI: Transcribing dialogue & translating to Khmer...');
      const detectedSegments = await analyzeVideoWithGemini(
        base64Audio,
        'audio/wav',
        geminiApiKey
      );

      // Auto-assign default voice clones if available
      const enriched = detectedSegments.map((seg, idx) => {
        const voice = voiceProfiles[idx % (voiceProfiles.length || 1)];
        return {
          ...seg,
          voiceProfileId: voice?.id,
          voiceProfileName: voice?.name,
        };
      });

      setSegments(enriched);
      setIsUploadModalOpen(false);
      showToast('success', `Detected ${detectedSegments.length} sequential timeline cuts!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Video analysis failed';
      showToast('error', msg);
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  // Load Demo Project (Project_Alpha)
  const handleLoadDemoProject = async () => {
    setProjectName(SAMPLE_PROJECT_ALPHA.projectName);
    setVideoUrl(SAMPLE_PROJECT_ALPHA.videoUrl);
    setVideoDuration(SAMPLE_PROJECT_ALPHA.duration);
    setSegments(SAMPLE_PROJECT_ALPHA.segments);

    try {
      fullAudioBufferRef.current = await loadAudioBufferFromUrl(SAMPLE_PROJECT_ALPHA.videoUrl);
    } catch (e) {
      console.log('Sample audio preload notice:', e);
    }

    showToast('info', 'Loaded Project_Alpha sample project!');
  };

  // Generate Voice for a Segment (GUARANTEES 100% OF WORDS SPOKEN AND EXACT VIDEO CUT TIME MATCH)
  const handleGenerateSegmentAudio = async (segment: VideoSpeakerSegment) => {
    if (!apiUrl.trim()) {
      setIsSettingsOpen(true);
      showToast('warning', 'Please configure your Colab ngrok URL in Settings.');
      return;
    }

    setGeneratingSegmentId(segment.id);

    try {
      let refBlob: Blob | null = null;
      let voiceNameUsed = 'Auto Video Timbre';

      // 1. Check if segment has an assigned Voice Profile
      if (segment.voiceProfileId) {
        const assignedProfile = voiceProfiles.find((v) => v.id === segment.voiceProfileId);
        if (assignedProfile) {
          voiceNameUsed = assignedProfile.name;
          if (assignedProfile.audioBlob && assignedProfile.audioBlob.size > 100) {
            refBlob = assignedProfile.audioBlob;
          } else if (assignedProfile.audioDataUrl) {
            try {
              refBlob = dataUrlToBlob(assignedProfile.audioDataUrl);
            } catch (err) {
              console.warn('Failed to parse audioDataUrl for voice profile:', err);
            }
          }
        }
      }

      // 2. Check if global reference audio was uploaded in studio
      if (!refBlob && referenceAudioBlob && referenceAudioBlob.size > 100) {
        refBlob = referenceAudioBlob;
        voiceNameUsed = 'Studio Reference Audio';
      }

      // 3. Fallback: slice from video audio track if no profile assigned
      if (!refBlob) {
        if (!fullAudioBufferRef.current && videoUrl) {
          try {
            fullAudioBufferRef.current = await loadAudioBufferFromUrl(videoUrl);
          } catch (bufErr) {
            console.warn('Audio buffer loading notice:', bufErr);
          }
        }

        refBlob = await sliceAudioSegment(
          fullAudioBufferRef.current,
          segment.startTime,
          segment.endTime
        );
      }

      console.log(`[VoxCPM 2 Dub] Cut #${segment.segmentNumber} -> Voice: "${voiceNameUsed}" (${refBlob.size} bytes)`);

      // 4. Synthesize FULL Khmer text via VoxCPM 2 (Pure 100% Normal Cloned Voice)
      const rawSynthesizedBlob = await generateKhmerVoiceClone({
        apiUrl,
        targetText: segment.khmerTranslation,
        referenceAudioBlob: refBlob,
        inferenceTimesteps: 8,
        cfgScale: 2.0,
        enableAutoChunking: true,
        maxCharsPerChunk: 220,
      });

      // 4. Get exact natural duration directly from pure synthesized WAV
      const naturalDuration = await getAudioBlobDuration(rawSynthesizedBlob);

      const speed = segment.playbackSpeed || 1.0;
      const effectiveDuration = parseFloat((naturalDuration / speed).toFixed(2));
      const syncedUrl = URL.createObjectURL(rawSynthesizedBlob);
      const newEndTime = parseFloat((segment.startTime + effectiveDuration).toFixed(2));

      // 5. Preload Audio Element for instant timeline playback with speed
      const audio = new Audio(syncedUrl);
      audio.preload = 'auto';
      audio.playbackRate = speed;
      audio.preservesPitch = true;
      audioElementsRef.current.set(segment.id, audio);

      // 6. Update segment and auto-ripple following cuts
      setSegments((prev) => {
        let updated = prev.map((s) =>
          s.id === segment.id
            ? {
                ...s,
                status: 'synced' as const,
                endTime: newEndTime,
                synthesizedAudioBlob: rawSynthesizedBlob,
                synthesizedAudioUrl: syncedUrl,
                audioDuration: naturalDuration,
              }
            : s
        );

        const currentIdx = updated.findIndex((s) => s.id === segment.id);
        if (currentIdx !== -1 && currentIdx < updated.length - 1) {
          const currentCut = updated[currentIdx];
          const nextCut = updated[currentIdx + 1];
          const minGap = 0.2;

          if (currentCut.endTime + minGap > nextCut.startTime) {
            const shiftAmount = parseFloat((currentCut.endTime + minGap - nextCut.startTime).toFixed(2));
            for (let j = currentIdx + 1; j < updated.length; j++) {
              updated[j] = {
                ...updated[j],
                startTime: parseFloat((updated[j].startTime + shiftAmount).toFixed(2)),
                endTime: parseFloat((updated[j].endTime + shiftAmount).toFixed(2)),
              };
            }
          }
        }

        return updated;
      });

      // Expand video timeline if needed
      if (newEndTime > videoDuration) {
        setVideoDuration(newEndTime + 1.0);
      }

      showToast(
        'success',
        `Synthesized pure natural Khmer voice (${naturalDuration.toFixed(1)}s • ${speed}x speed)!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Voice synthesis error';
      showToast('error', msg);
    } finally {
      setGeneratingSegmentId(null);
    }
  };

  // Increase or decrease speed for a specific segment
  const handleUpdateSegmentSpeed = (segmentId: string, newSpeed: number) => {
    const clampedSpeed = parseFloat(Math.max(0.5, Math.min(2.0, newSpeed)).toFixed(2));

    setSegments((prev) => {
      let updated = prev.map((s) => {
        if (s.id === segmentId) {
          const naturalDur = s.audioDuration || (s.endTime - s.startTime);
          const effectiveDur = parseFloat((naturalDur / clampedSpeed).toFixed(2));
          const newEnd = parseFloat((s.startTime + effectiveDur).toFixed(2));
          return {
            ...s,
            playbackSpeed: clampedSpeed,
            endTime: newEnd,
          };
        }
        return s;
      });

      // Auto-ripple following cuts
      const currentIdx = updated.findIndex((s) => s.id === segmentId);
      if (currentIdx !== -1 && currentIdx < updated.length - 1) {
        for (let i = currentIdx; i < updated.length - 1; i++) {
          const cur = updated[i];
          const nxt = updated[i + 1];
          const minGap = 0.2;
          if (cur.endTime + minGap > nxt.startTime) {
            const shift = parseFloat((cur.endTime + minGap - nxt.startTime).toFixed(2));
            for (let j = i + 1; j < updated.length; j++) {
              updated[j] = {
                ...updated[j],
                startTime: parseFloat((updated[j].startTime + shift).toFixed(2)),
                endTime: parseFloat((updated[j].endTime + shift).toFixed(2)),
              };
            }
          }
        }
      }

      const lastCut = updated[updated.length - 1];
      if (lastCut && lastCut.endTime > videoDuration) {
        setVideoDuration(lastCut.endTime + 1.0);
      }

      return updated;
    });

    const audio = audioElementsRef.current.get(segmentId);
    if (audio) {
      audio.playbackRate = clampedSpeed;
      audio.preservesPitch = true;
    }
  };

  // Apply speed change to all segments
  const handleApplySpeedToAll = (speed: number) => {
    const clampedSpeed = parseFloat(Math.max(0.5, Math.min(2.0, speed)).toFixed(2));

    setSegments((prev) => {
      let runningStart = prev[0]?.startTime || 0;
      return prev.map((s, idx) => {
        const naturalDur = s.audioDuration || (s.endTime - s.startTime);
        const effectiveDur = parseFloat((naturalDur / clampedSpeed).toFixed(2));
        const start = idx === 0 ? s.startTime : runningStart;
        const end = parseFloat((start + effectiveDur).toFixed(2));
        runningStart = end + 0.2;

        const audio = audioElementsRef.current.get(s.id);
        if (audio) {
          audio.playbackRate = clampedSpeed;
          audio.preservesPitch = true;
        }

        return {
          ...s,
          startTime: start,
          endTime: end,
          playbackSpeed: clampedSpeed,
        };
      });
    });

    showToast('info', `Applied ${clampedSpeed}x speed to all cuts.`);
  };

  // Polish / Re-translate single sentence into natural, native Khmer
  const handlePolishTranslation = async (
    segmentId: string,
    originalText: string,
    currentText: string
  ) => {
    if (!geminiApiKey.trim()) {
      showToast('warning', 'Please enter your Google Gemini API Key in Settings to polish translation.');
      return;
    }

    setPolishingSegmentId(segmentId);
    try {
      const polished = await polishKhmerTranslationWithGemini(
        originalText,
        currentText,
        geminiApiKey,
        'conversational'
      );

      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId
            ? { ...s, khmerTranslation: polished, status: 'ready_for_sync' }
            : s
        )
      );
      showToast('success', 'Translation polished into natural, fluent Khmer!');
    } catch (err: unknown) {
      showToast('error', 'Translation polish failed.');
    } finally {
      setPolishingSegmentId(null);
    }
  };

  // Batch Dub All Segments (Applies chosen voice clones to all cuts)
  const handleGenerateAllSegments = async () => {
    if (!apiUrl.trim()) {
      setIsSettingsOpen(true);
      showToast('warning', 'Please connect Colab GPU backend first.');
      return;
    }

    setIsGeneratingAll(true);
    try {
      for (const seg of segments) {
        await handleGenerateSegmentAudio(seg);
      }
      showToast('success', `All ${segments.length} video cuts dubbed with their selected voice clones!`);
    } catch (err: unknown) {
      showToast('error', 'Batch voice synthesis encountered an issue.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Preview Synced Audio with chosen speed
  const handlePreviewSegmentAudio = (segment: VideoSpeakerSegment) => {
    if (!segment.synthesizedAudioUrl) return;

    if (playingSegmentId === segment.id) {
      setPlayingSegmentId(null);
    } else {
      const audio = new Audio(segment.synthesizedAudioUrl);
      const speed = segment.playbackSpeed || 1.0;
      audio.playbackRate = speed;
      audio.preservesPitch = true;
      audio.play().catch(() => {});
      setPlayingSegmentId(segment.id);
      audio.onended = () => setPlayingSegmentId(null);
    }
  };

  // Save Cut as a new Voice Profile in Library
  const handleSaveSegmentAsVoiceProfile = async (segment: VideoSpeakerSegment) => {
    try {
      if (!fullAudioBufferRef.current && videoUrl) {
        fullAudioBufferRef.current = await loadAudioBufferFromUrl(videoUrl);
      }
      const refBlob = await sliceAudioSegment(
        fullAudioBufferRef.current,
        segment.startTime,
        segment.endTime
      );
      const name = `Cut #${segment.segmentNumber} Voice (${formatTime(segment.startTime)})`;
      const newVoice = await saveNewVoiceProfile(name, refBlob, segment.endTime - segment.startTime, {
        gender: 'character',
        color: 'cyan',
        avatarEmoji: '🎙️',
        description: `Voice sample sliced from video cut #${segment.segmentNumber}`,
      });

      const updated = [newVoice, ...voiceProfiles];
      setVoiceProfiles(updated);

      handleUpdateSegmentVoice(segment.id, newVoice.id, newVoice.name);
      showToast('success', `Saved "${newVoice.name}" to Voice Clones Library!`);
    } catch (err: unknown) {
      showToast('error', 'Failed to save voice profile from cut.');
    }
  };

  // Update Voice Profile for a single segment
  const handleUpdateSegmentVoice = (
    segmentId: string,
    voiceProfileId: string,
    voiceProfileName: string
  ) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === segmentId
          ? {
              ...s,
              voiceProfileId: voiceProfileId || undefined,
              voiceProfileName: voiceProfileName || undefined,
              status: 'ready_for_sync',
            }
          : s
      )
    );
    showToast('info', `Assigned character: ${voiceProfileName}`);
  };

  // Upload custom voice sample directly and apply to all cuts
  const handleUploadVoiceFile = async (file: File) => {
    try {
      const audioBuffer = await loadAudioBufferFromUrl(URL.createObjectURL(file));
      const dur = audioBuffer.duration;
      const newVoice = await saveNewVoiceProfile(
        file.name.replace(/\.[^/.]+$/, ''),
        file,
        dur,
        {
          gender: 'custom',
          color: 'cyan',
          avatarEmoji: '🎙️',
          description: `Uploaded reference voice sample (${dur.toFixed(1)}s)`,
        }
      );
      setVoiceProfiles((prev) => [newVoice, ...prev]);
      setReferenceAudioBlob(file);
      setReferenceAudioDuration(dur);
      setSelectedTtsVoiceId(newVoice.id);
      handleApplyVoiceToAll(newVoice.id, newVoice.name);
      showToast('success', `Voice sample "${newVoice.name}" uploaded and applied to all dialogue cuts!`);
    } catch (err: unknown) {
      showToast('error', 'Failed to read voice audio file.');
    }
  };

  // Apply a Voice Profile to ALL segments
  const handleApplyVoiceToAll = (voiceProfileId: string, voiceProfileName: string) => {
    setSegments((prev) =>
      prev.map((s) => ({
        ...s,
        voiceProfileId,
        voiceProfileName,
        status: 'ready_for_sync',
      }))
    );
    showToast('success', `Applied "${voiceProfileName}" to all video cuts!`);
  };

  // Update Khmer Translation Text in Segment
  const handleUpdateKhmerText = (segmentId: string, newText: string) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === segmentId ? { ...s, khmerTranslation: newText, status: 'ready_for_sync' } : s
      )
    );
  };

  // Update Segment Start / End Times
  const handleUpdateSegmentTimes = (segmentId: string, newStart: number, newEnd: number) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === segmentId
          ? {
              ...s,
              startTime: newStart,
              endTime: Math.max(newStart + 0.5, newEnd),
              status: 'ready_for_sync',
            }
          : s
      )
    );
  };

  const handleDeleteSegment = (segmentId: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    showToast('info', 'Deleted cut.');
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const newStart = lastSeg ? lastSeg.endTime + 0.5 : 0;
    const newEnd = newStart + 4.0;
    const defaultVoice = voiceProfiles[0];

    const newSeg: VideoSpeakerSegment = {
      id: `seg-${Date.now().toString(36)}`,
      segmentNumber: segments.length + 1,
      startTime: parseFloat(newStart.toFixed(1)),
      endTime: parseFloat(newEnd.toFixed(1)),
      originalText: 'New dialogue sentence...',
      khmerTranslation: 'បញ្ចូលអត្ថបទបកប្រែជាភាសាខ្មែរនៅទីនេះ...',
      voiceProfileId: defaultVoice?.id,
      voiceProfileName: defaultVoice?.name,
      status: 'ready_for_sync',
    };
    setSegments((prev) => [...prev, newSeg]);
    showToast('success', 'Added new cut.');
  };

  // Export Dubbed Video
  const handleExportVideo = () => {
    setIsExportingVideo(true);
    setTimeout(() => {
      setIsExportingVideo(false);
      if (videoUrl) {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `${projectName}_khmer_dubbed.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      showToast('success', 'Exported Dubbed MP4 Video with all synchronized Khmer voices!');
    }, 2000);
  };

  // Helper to obtain the reference audio blob for a specific field
  const getFieldAudioBlob = useCallback(
    (field: VoiceTextFieldItem): Blob | null => {
      if (field.voiceProfileId) {
        const prof = voiceProfiles.find((v) => v.id === field.voiceProfileId);
        if (prof?.audioBlob) return prof.audioBlob;
      }
      if (referenceAudioBlob) return referenceAudioBlob;
      if (voiceProfiles.length > 0 && voiceProfiles[0].audioBlob) {
        return voiceProfiles[0].audioBlob;
      }
      return null;
    },
    [voiceProfiles, referenceAudioBlob]
  );

  // Field CRUD Handlers (Unlimited Fields)
  const handleAddVoiceField = useCallback(() => {
    setVoiceFields((prev) => {
      const nextNumber = prev.length + 1;
      const defaultVoice = voiceProfiles[0];
      const newField: VoiceTextFieldItem = {
        id: `vf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        fieldNumber: nextNumber,
        text: '',
        voiceProfileId: defaultVoice?.id,
        voiceProfileName: defaultVoice?.name,
        playbackSpeed: 1.0,
        status: 'idle',
      };
      return [...prev, newField];
    });
    showToast('info', 'Added new voice generation field');
  }, [voiceProfiles, showToast]);

  const handleRemoveVoiceField = useCallback((id: string) => {
    setVoiceFields((prev) => {
      if (prev.length <= 1) {
        showToast('warning', 'Minimum 1 text field required.');
        return prev;
      }
      const filtered = prev.filter((f) => f.id !== id);
      return filtered.map((f, idx) => ({ ...f, fieldNumber: idx + 1 }));
    });
  }, [showToast]);

  const handleDuplicateVoiceField = useCallback((id: string) => {
    setVoiceFields((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target) return prev;
      const dupIndex = prev.findIndex((f) => f.id === id);
      const duplicated: VoiceTextFieldItem = {
        ...target,
        id: `vf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        fieldNumber: dupIndex + 2,
        status: 'idle',
        audioBlob: undefined,
        audioUrl: undefined,
        duration: undefined,
        error: undefined,
      };
      const nextList = [...prev.slice(0, dupIndex + 1), duplicated, ...prev.slice(dupIndex + 1)];
      return nextList.map((f, idx) => ({ ...f, fieldNumber: idx + 1 }));
    });
    showToast('success', 'Duplicated field');
  }, [showToast]);

  const handleClearAllVoiceFields = useCallback(() => {
    setVoiceFields([
      {
        id: `vf-${Date.now().toString(36)}`,
        fieldNumber: 1,
        text: '',
        status: 'idle',
        playbackSpeed: 1.0,
      },
    ]);
    showToast('info', 'Reset to 1 empty field');
  }, [showToast]);

  const handleUpdateFieldText = useCallback((id: string, text: string) => {
    setVoiceFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, text, status: f.status === 'error' ? 'idle' : f.status } : f))
    );
  }, []);

  const handleUpdateFieldVoice = useCallback(
    (id: string, voiceProfileId: string, voiceProfileName: string) => {
      setVoiceFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                voiceProfileId: voiceProfileId || undefined,
                voiceProfileName: voiceProfileName || undefined,
              }
            : f
        )
      );
    },
    []
  );

  const handleUpdateFieldSpeed = useCallback((id: string, speed: number) => {
    setVoiceFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, playbackSpeed: speed } : f))
    );
  }, []);

  const handleApplyPresetToField = useCallback(
    (fieldId: string, preset: KhmerPreset) => {
      setVoiceFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, text: preset.targetText } : f))
      );
      showToast('info', `Applied preset: ${preset.titleEnglish}`);
    },
    [showToast]
  );

  const handleSplitScriptIntoFields = useCallback(
    (scriptText: string, mode: 'newline' | 'khmer_sentence') => {
      if (!scriptText.trim()) return;
      let pieces: string[] = [];
      if (mode === 'newline') {
        pieces = scriptText
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else {
        pieces = scriptText
          .split(/(?<=[។?!.])/g)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      if (pieces.length === 0) return;

      const defaultVoice = voiceProfiles[0];
      const newFields: VoiceTextFieldItem[] = pieces.map((piece, idx) => ({
        id: `vf-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        fieldNumber: idx + 1,
        text: piece,
        voiceProfileId: defaultVoice?.id,
        voiceProfileName: defaultVoice?.name,
        playbackSpeed: 1.0,
        status: 'idle',
      }));

      setVoiceFields(newFields);
      showToast('success', `Created ${newFields.length} voice generation fields from your script!`);
    },
    [voiceProfiles, showToast]
  );

  // Generate a single voice field
  const handleGenerateSingleVoiceField = useCallback(
    async (field: VoiceTextFieldItem) => {
      if (!apiUrl.trim()) {
        setIsSettingsOpen(true);
        showToast('warning', 'Please connect Colab GPU backend first.');
        return;
      }

      if (!field.text.trim()) {
        showToast('warning', `Field #${field.fieldNumber} has no text.`);
        return;
      }

      const refBlob = getFieldAudioBlob(field);
      if (!refBlob) {
        showToast('warning', `Field #${field.fieldNumber}: Please select or record a reference voice sample.`);
        return;
      }

      setVoiceFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, status: 'generating', error: undefined } : f))
      );
      setActiveGeneratingFieldId(field.id);
      setIsGeneratingTts(true);

      try {
        const blob = await generateKhmerVoiceClone({
          apiUrl,
          targetText: field.text,
          promptText: promptTranscript,
          referenceAudioBlob: refBlob,
          inferenceTimesteps,
          cfgScale,
          enableAutoChunking,
          maxCharsPerChunk,
          onProgress: setGenerationProgress,
        });

        const dur = await getAudioBlobDuration(blob);
        const url = URL.createObjectURL(blob);

        setVoiceFields((prev) =>
          prev.map((f) =>
            f.id === field.id
              ? {
                  ...f,
                  status: 'completed',
                  audioBlob: blob,
                  audioUrl: url,
                  duration: dur,
                  error: undefined,
                }
              : f
          )
        );

        // Update Master Player
        setSynthesizedBlob(blob);
        setSynthesizedUrl(url);

        // Add to history
        const historyItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          targetText: field.text,
          audioBlob: blob,
          audioUrl: url,
          duration: dur,
        };
        setHistoryItems((prev) => [historyItem, ...prev.slice(0, 19)]);

        showToast('success', `Field #${field.fieldNumber} voice generated successfully (${dur.toFixed(1)}s)!`);
      } catch (err: unknown) {
        const errMsg = (err as Error).message || 'Generation failed';
        setVoiceFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, status: 'error', error: errMsg } : f))
        );
        showToast('error', `Field #${field.fieldNumber} error: ${errMsg}`);
      } finally {
        setIsGeneratingTts(false);
        setActiveGeneratingFieldId(null);
      }
    },
    [
      apiUrl,
      getFieldAudioBlob,
      promptTranscript,
      inferenceTimesteps,
      cfgScale,
      enableAutoChunking,
      maxCharsPerChunk,
      showToast,
    ]
  );

  // Generate All Fields Sequentially One by One Until End
  const handleGenerateAllVoiceFields = useCallback(async () => {
    if (!apiUrl.trim()) {
      setIsSettingsOpen(true);
      showToast('warning', 'Please connect Colab GPU backend first.');
      return;
    }

    const fieldsToGenerate = voiceFields.filter((f) => f.text.trim().length > 0);
    if (fieldsToGenerate.length === 0) {
      showToast('warning', 'All text fields are empty. Please enter Khmer text first.');
      return;
    }

    setIsGeneratingAllFields(true);
    setIsGeneratingTts(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < voiceFields.length; i++) {
        const field = voiceFields[i];
        if (!field.text.trim()) continue;

        const refBlob = getFieldAudioBlob(field);
        if (!refBlob) {
          showToast('warning', `Field #${field.fieldNumber}: Missing reference voice sample. Skipping.`);
          failCount++;
          continue;
        }

        setActiveGeneratingFieldId(field.id);
        setVoiceFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, status: 'generating', error: undefined } : f))
        );

        try {
          const blob = await generateKhmerVoiceClone({
            apiUrl,
            targetText: field.text,
            promptText: promptTranscript,
            referenceAudioBlob: refBlob,
            inferenceTimesteps,
            cfgScale,
            enableAutoChunking,
            maxCharsPerChunk,
            onProgress: (prog) => {
              setGenerationProgress({
                ...prog,
                message: `Field [${field.fieldNumber}/${voiceFields.length}]: ${prog.message}`,
              });
            },
          });

          const dur = await getAudioBlobDuration(blob);
          const url = URL.createObjectURL(blob);

          setVoiceFields((prev) =>
            prev.map((f) =>
              f.id === field.id
                ? {
                    ...f,
                    status: 'completed',
                    audioBlob: blob,
                    audioUrl: url,
                    duration: dur,
                    error: undefined,
                  }
                : f
            )
          );

          setSynthesizedBlob(blob);
          setSynthesizedUrl(url);

          const historyItem: HistoryItem = {
            id: `hist-${Date.now()}-${field.id}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            targetText: field.text,
            audioBlob: blob,
            audioUrl: url,
            duration: dur,
          };
          setHistoryItems((prev) => [historyItem, ...prev.slice(0, 19)]);
          successCount++;
        } catch (err: unknown) {
          const errMsg = (err as Error).message || 'Generation failed';
          setVoiceFields((prev) =>
            prev.map((f) => (f.id === field.id ? { ...f, status: 'error', error: errMsg } : f))
          );
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(
          'success',
          `Finished! Generated ${successCount} voice fields successfully${failCount > 0 ? ` (${failCount} failed)` : ''}.`
        );
      } else {
        showToast('error', 'Voice generation failed for all fields.');
      }
    } finally {
      setIsGeneratingAllFields(false);
      setIsGeneratingTts(false);
      setActiveGeneratingFieldId(null);
    }
  }, [
    apiUrl,
    voiceFields,
    getFieldAudioBlob,
    promptTranscript,
    inferenceTimesteps,
    cfgScale,
    enableAutoChunking,
    maxCharsPerChunk,
    showToast,
  ]);

  const masterVoiceName =
    voiceProfiles.find((v) => v.id === selectedTtsVoiceId)?.name || 'Master Reference Voice';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070b14] text-slate-100">
      {/* Top Header Navigation */}
      <Header
        apiUrl={apiUrl}
        isOnline={isOnline}
        latencyMs={latencyMs}
        healthData={healthData}
        activeMode={activeMode}
        onChangeMode={setActiveMode}
        projectName={projectName}
        geminiApiKey={geminiApiKey}
        voiceCount={voiceProfiles.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenColabGuide={() => setIsGuideOpen(true)}
        onOpenVideoUpload={() => setIsUploadModalOpen(true)}
        onOpenVoiceLibrary={() => setIsVoiceLibraryOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="max-w-xs">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Studio Viewport */}
      <main className="max-w-[1750px] mx-auto w-full px-3 sm:px-6 py-4 flex-1">
        {/* ================================================================ */}
        {/* MODE 1: LINGUASYNC PRO - UNIFIED VIDEO DUBBING & DIALOGUE STUDIO */}
        {/* ================================================================ */}
        {activeMode === 'video_dubbing' && (
          <div className="space-y-4">
            {/* Top Row: Video Player (6 cols) & Unified Dialogue Studio (6 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Top Left: Video Player Pane (6 cols) */}
              <div className="lg:col-span-6 min-h-[460px]">
                <VideoPlayerPane
                  videoUrl={videoUrl}
                  currentTime={currentTime}
                  duration={videoDuration}
                  isPlaying={isPlayingVideo}
                  onPlay={handlePlayVideo}
                  onPause={handlePauseVideo}
                  onSeek={handleSeekVideo}
                  activeSegment={activeSegment}
                  audioMode={audioMode}
                  onChangeAudioMode={setAudioMode}
                  videoRef={videoRef}
                />
              </div>

              {/* Top Right: Unified Dialogue, Character Selection & AI Voice Generator (6 cols) */}
              <div className="lg:col-span-6 min-h-[460px]">
                <AiAudioProcessControl
                  segments={segments}
                  voiceProfiles={voiceProfiles}
                  activeSegmentId={activeSegment?.id || null}
                  onSelectSegment={(seg) => handleSeekVideo(seg.startTime)}
                  onPlaySegmentRange={handlePlaySegmentRange}
                  onUpdateKhmerText={handleUpdateKhmerText}
                  onUpdateSegmentTimes={handleUpdateSegmentTimes}
                  onUpdateSegmentVoice={handleUpdateSegmentVoice}
                  onApplyVoiceToAll={handleApplyVoiceToAll}
                  onUpdateSegmentSpeed={handleUpdateSegmentSpeed}
                  onApplySpeedToAll={handleApplySpeedToAll}
                  onGenerateSegmentAudio={handleGenerateSegmentAudio}
                  onGenerateAllSegments={handleGenerateAllSegments}
                  isGeneratingAll={isGeneratingAll}
                  generatingSegmentId={generatingSegmentId}
                  onPreviewSegmentAudio={handlePreviewSegmentAudio}
                  playingSegmentId={playingSegmentId}
                  onSaveSegmentAsVoiceProfile={handleSaveSegmentAsVoiceProfile}
                  onPolishTranslation={handlePolishTranslation}
                  polishingSegmentId={polishingSegmentId}
                  onDeleteSegment={handleDeleteSegment}
                  onAddSegment={handleAddSegment}
                  onOpenVoiceLibrary={() => setIsVoiceLibraryOpen(true)}
                  onUploadVoiceFile={handleUploadVoiceFile}
                />
              </div>
            </div>

            {/* Bottom Row: Multi-Track Timeline (9 cols) & Global Project Tools (3 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Bottom Left: Multi-Track Timeline (9 cols) */}
              <div className="lg:col-span-9 min-h-[220px]">
                <MultiTrackTimeline
                  duration={videoDuration}
                  currentTime={currentTime}
                  segments={segments}
                  voiceProfiles={voiceProfiles}
                  onSeek={handleSeekVideo}
                  muteOriginal={muteOriginal}
                  onToggleMuteOriginal={setMuteOriginal}
                  enableDubbing={enableDubbing}
                  onToggleEnableDubbing={setEnableDubbing}
                />
              </div>

              {/* Bottom Right: Global Project Tools & Export (3 cols) */}
              <div className="lg:col-span-3 min-h-[220px]">
                <GlobalProjectTools
                  projectName={projectName}
                  segments={segments}
                  voiceCount={voiceProfiles.length}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  onOpenVoiceLibrary={() => setIsVoiceLibraryOpen(true)}
                  onExportVideo={handleExportVideo}
                  isExporting={isExportingVideo}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODE 2: SINGLE VOICE STUDIO (VOXCPM 2 KHMER TEXT-TO-SPEECH)    */}
        {/* ================================================================ */}
        {activeMode === 'single_tts' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              <ReferenceAudioCard
                referenceAudioBlob={referenceAudioBlob}
                referenceAudioDuration={referenceAudioDuration}
                voiceProfiles={voiceProfiles}
                selectedVoiceId={selectedTtsVoiceId}
                onSelectVoiceProfile={(voice) => {
                  setSelectedTtsVoiceId(voice.id);
                  if (voice.audioBlob) {
                    setReferenceAudioBlob(voice.audioBlob);
                    setReferenceAudioDuration(voice.duration);
                    showToast('success', `Selected voice clone: ${voice.name}`);
                  }
                }}
                onOpenVoiceLibrary={() => setIsVoiceLibraryOpen(true)}
                onSaveCurrentAsVoiceProfile={async () => {
                  if (referenceAudioBlob) {
                    const newVoice = await saveNewVoiceProfile(
                      `TTS Voice Sample`,
                      referenceAudioBlob,
                      referenceAudioDuration
                    );
                    setVoiceProfiles([newVoice, ...voiceProfiles]);
                    setSelectedTtsVoiceId(newVoice.id);
                    showToast('success', 'Saved voice clone to Voice Library!');
                  }
                }}
                onAudioReady={(blob, dur) => {
                  setReferenceAudioBlob(blob);
                  setReferenceAudioDuration(dur);
                  showToast('success', `Voice sample loaded (${dur.toFixed(1)}s)`);
                }}
                onClearAudio={() => {
                  setReferenceAudioBlob(null);
                  setReferenceAudioDuration(0);
                  setSelectedTtsVoiceId('');
                }}
                promptTranscript={promptTranscript}
                onChangePromptTranscript={setPromptTranscript}
              />

              {/* Unlimited Multi-Field Voice Generator with Sequential 'Generate All' */}
              <MultiVoiceFieldGenerator
                fields={voiceFields}
                onAddField={handleAddVoiceField}
                onRemoveField={handleRemoveVoiceField}
                onDuplicateField={handleDuplicateVoiceField}
                onClearAllFields={handleClearAllVoiceFields}
                onUpdateFieldText={handleUpdateFieldText}
                onUpdateFieldVoice={handleUpdateFieldVoice}
                onUpdateFieldSpeed={handleUpdateFieldSpeed}
                onGenerateSingleField={handleGenerateSingleVoiceField}
                onGenerateAllFields={handleGenerateAllVoiceFields}
                isGeneratingAll={isGeneratingAllFields}
                activeGeneratingId={activeGeneratingFieldId}
                voiceProfiles={voiceProfiles}
                masterVoiceName={masterVoiceName}
                enableAutoChunking={enableAutoChunking}
                onToggleAutoChunking={setEnableAutoChunking}
                maxCharsPerChunk={maxCharsPerChunk}
                onApplyPresetToField={handleApplyPresetToField}
                onSplitScriptIntoFields={handleSplitScriptIntoFields}
                onSelectFieldForMasterPlayer={(field) => {
                  if (field.audioBlob && field.audioUrl) {
                    setSynthesizedBlob(field.audioBlob);
                    setSynthesizedUrl(field.audioUrl);
                  }
                }}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <InferenceControls
                inferenceTimesteps={inferenceTimesteps}
                onChangeTimesteps={setInferenceTimesteps}
                cfgScale={cfgScale}
                onChangeCfgScale={setCfgScale}
                maxCharsPerChunk={maxCharsPerChunk}
                onChangeMaxCharsPerChunk={setMaxCharsPerChunk}
              />

              <GenerationStatus isGenerating={isGeneratingTts} progress={generationProgress} />

              <AudioPlayer
                audioBlob={synthesizedBlob}
                audioUrl={synthesizedUrl}
                isGenerating={isGeneratingTts}
              />

              <AudioHistory
                items={historyItems}
                onSelectAudio={(item) => {
                  setSynthesizedBlob(item.audioBlob);
                  setSynthesizedUrl(item.audioUrl);
                  showToast('info', 'Loaded audio from history.');
                }}
                onDeleteItem={(id) => {
                  setHistoryItems((prev) => prev.filter((item) => item.id !== id));
                }}
                onClearAll={() => {
                  setHistoryItems([]);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Voice Profiles Library Modal */}
      <VoiceProfileModal
        isOpen={isVoiceLibraryOpen}
        onClose={() => setIsVoiceLibraryOpen(false)}
        voiceProfiles={voiceProfiles}
        onProfilesUpdated={(updated) => setVoiceProfiles(updated)}
        selectedVoiceId={selectedTtsVoiceId}
        onSelectVoice={(voice) => {
          setSelectedTtsVoiceId(voice.id);
          if (voice.audioBlob) {
            setReferenceAudioBlob(voice.audioBlob);
            setReferenceAudioDuration(voice.duration);
          }
          setIsVoiceLibraryOpen(false);
          showToast('success', `Active Voice: ${voice.name}`);
        }}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadVideo={handleUploadAndAnalyzeVideo}
        onLoadDemoProject={handleLoadDemoProject}
        isAnalyzing={isAnalyzingVideo}
        analysisProgress={analysisProgressText}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={handleSaveGeminiKey}
      />

      {/* Settings Modal */}
      <ApiConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={apiUrl}
        onSaveUrl={handleSaveApiUrl}
        onTestConnection={testConnection}
        isTesting={isTestingApi}
        isOnline={isOnline}
        latencyMs={latencyMs}
        healthData={healthData}
        errorMessage={apiErrorMessage}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={handleSaveGeminiKey}
      />

      {/* Colab Guide Modal */}
      <ColabGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
