'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FileAudio,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { convertBlobToWav, formatTime } from '@/lib/audioUtils';

interface AudioRecorderProps {
  onAudioReady: (wavBlob: Blob, durationSec: number) => void;
  onClearAudio: () => void;
  recordedBlob: Blob | null;
  recordedDuration: number;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  onClearAudio,
  recordedBlob,
  recordedDuration,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Visualizer loop while recording
  const startCanvasVisualizer = (stream: MediaStream) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(1, '#06b6d4');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.error('Audio visualizer failed:', e);
    }
  };

  const stopCanvasVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : '',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        stopCanvasVisualizer();

        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsProcessingAudio(true);
        try {
          const { wavBlob, duration } = await convertBlobToWav(rawBlob, 24000);
          onAudioReady(wavBlob, duration);
        } catch (err: unknown) {
          setErrorMessage('Failed to process recording into WAV format.');
          console.error(err);
        } finally {
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      startCanvasVisualizer(stream);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setErrorMessage(`Microphone error: ${msg}. Please allow microphone permissions.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessingAudio(true);

    try {
      const { wavBlob, duration } = await convertBlobToWav(file, 24000);
      onAudioReady(wavBlob, duration);
    } catch (err: unknown) {
      setErrorMessage('Could not decode uploaded audio file. Please upload a valid .wav or .mp3.');
      console.error(err);
    } finally {
      setIsProcessingAudio(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePreviewPlayback = () => {
    if (!audioPreviewRef.current || !recordedBlob) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Tabs: Record vs Upload */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'record'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Mic</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload WAV</span>
          </button>
        </div>

        {recordedBlob && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Sample Loaded ({formatTime(recordedDuration)})</span>
          </span>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode 1: Microphone Recording */}
      {activeTab === 'record' && (
        <div className="space-y-3">
          <div className="relative flex flex-col items-center justify-center p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden">
            {/* Real-time visualizer canvas */}
            <canvas
              ref={canvasRef}
              width={260}
              height={48}
              className={`w-full max-w-[260px] h-12 mb-3 rounded ${
                isRecording ? 'opacity-100' : 'opacity-20'
              }`}
            />

            {/* Record / Stop Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessingAudio}
                className="group relative flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping group-hover:block hidden" />
                <Mic className="w-4 h-4 text-white" />
                <span>Start Recording (Speak Khmer)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all transform hover:scale-105 active:scale-95 animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Recording ({formatTime(recordingSeconds)})</span>
              </button>
            )}

            {/* Guidance Badge */}
            <p className="mt-2.5 text-[11px] text-slate-400 text-center">
              💡 Recommended reference length: <strong>3 to 6 seconds</strong> of clean, clear Khmer speech.
            </p>
          </div>
        </div>
      )}

      {/* Mode 2: Audio File Upload */}
      {activeTab === 'upload' && (
        <div className="space-y-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 cursor-pointer transition group"
          >
            <FileAudio className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
            <p className="text-xs font-semibold text-slate-200">
              Click to upload Reference Audio (.wav, .mp3)
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Mono/Stereo 16-bit PCM • 3-8s duration</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Recorded / Uploaded Audio Preview Bar */}
      {recordedBlob && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePreviewPlayback}
              className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition"
              title="Play Reference Sample"
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-indigo-400" />
              ) : (
                <Play className="w-4 h-4 fill-indigo-400" />
              )}
            </button>
            <div>
              <span className="text-xs font-medium text-slate-200 block">
                Reference Audio Sample
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Duration: {formatTime(recordedDuration)} • 24kHz WAV (Ready)
              </span>
            </div>
            <audio
              ref={audioPreviewRef}
              src={recordedBlob ? URL.createObjectURL(recordedBlob) : ''}
              onEnded={() => setIsPlayingPreview(false)}
              className="hidden"
            />
          </div>

          <button
            type="button"
            onClick={onClearAudio}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition"
            title="Clear & Record New Voice"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      )}
    </div>
  );
};
