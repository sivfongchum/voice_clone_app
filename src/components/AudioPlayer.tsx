'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
} from 'lucide-react';
import { formatTime } from '@/lib/audioUtils';

interface AudioPlayerProps {
  audioBlob: Blob | null;
  audioUrl: string | null;
  title?: string;
  subtitle?: string;
  isGenerating?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  audioUrl,
  title = 'Synthesized Khmer Voice',
  subtitle = 'Generated with VoxCPM 2 (48kHz High-Fidelity)',
  isGenerating = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<any>(null); // dynamically imported wavesurfer

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [zoomLevel, setZoomLevel] = useState(30);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize and update Wavesurfer instance
  useEffect(() => {
    let wavesurfer: any = null;
    let isCancelled = false;

    const initWaveSurfer = async () => {
      if (!containerRef.current || !audioUrl) return;

      try {
        const WaveSurferModule = (await import('wavesurfer.js')).default;
        if (isCancelled) return;

        // Destroy previous instance
        if (waveSurferRef.current) {
          waveSurferRef.current.destroy();
        }

        wavesurfer = WaveSurferModule.create({
          container: containerRef.current,
          waveColor: '#312e81',
          progressColor: '#818cf8',
          cursorColor: '#06b6d4',
          cursorWidth: 2,
          barWidth: 3,
          barGap: 3,
          barRadius: 3,
          height: 80,
          normalize: true,
          minPxPerSec: zoomLevel,
        });

        wavesurfer.load(audioUrl);

        wavesurfer.on('ready', () => {
          if (isCancelled) return;
          setDuration(wavesurfer.getDuration());
          setIsLoaded(true);
        });

        wavesurfer.on('audioprocess', () => {
          if (isCancelled) return;
          setCurrentTime(wavesurfer.getCurrentTime());
        });

        wavesurfer.on('seeking', () => {
          if (isCancelled) return;
          setCurrentTime(wavesurfer.getCurrentTime());
        });

        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('finish', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });

        waveSurferRef.current = wavesurfer;
      } catch (err) {
        console.error('Failed to initialize WaveSurfer:', err);
      }
    };

    initWaveSurfer();

    return () => {
      isCancelled = true;
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  }, [audioUrl]);

  // Handle zoom changes
  useEffect(() => {
    if (waveSurferRef.current && isLoaded) {
      waveSurferRef.current.zoom(zoomLevel);
    }
  }, [zoomLevel, isLoaded]);

  // Handle playback rate changes
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (waveSurferRef.current) {
      waveSurferRef.current.setPlaybackRate(rate);
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!waveSurferRef.current) return;
    waveSurferRef.current.playPause();
  };

  // Handle Volume & Mute
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (waveSurferRef.current) {
      waveSurferRef.current.setVolume(newVol);
    }
  };

  const toggleMute = () => {
    if (!waveSurferRef.current) return;
    if (isMuted) {
      waveSurferRef.current.setVolume(volume || 1);
      setIsMuted(false);
    } else {
      waveSurferRef.current.setVolume(0);
      setIsMuted(true);
    }
  };

  // Download synthesized audio file
  const handleDownload = () => {
    if (!audioBlob && !audioUrl) return;
    const url = audioUrl || (audioBlob ? URL.createObjectURL(audioBlob) : '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `khmer_voxcpm2_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!audioUrl && !isGenerating) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center text-slate-400 space-y-3 min-h-[220px]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">No Audio Synthesized Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Record a reference voice, enter your target Khmer script, and press <strong>Synthesize Voice</strong> above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-5">
      {/* Player Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              WAV 24/48kHz
            </span>
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {audioUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition transform hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .WAV</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Wavesurfer Waveform Container */}
      <div className="relative p-4 rounded-xl bg-slate-950 border border-slate-800/90 shadow-inner">
        <div ref={containerRef} className="w-full cursor-pointer" />
      </div>

      {/* Playback Controls & Timers */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        {/* Play / Pause & Time Indicator */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!isLoaded}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
            )}
          </button>

          <div className="text-xs font-mono font-medium text-slate-300">
            <span className="text-indigo-400">{formatTime(currentTime)}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-1 rounded-lg text-xs font-mono transition ${
                playbackRate === rate
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Zoom & Volume */}
        <div className="flex items-center gap-3">
          {/* Zoom Buttons */}
          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(10, prev - 10))}
              className="p-1.5 hover:text-white transition"
              title="Zoom out waveform"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(100, prev + 10))}
              className="p-1.5 hover:text-white transition"
              title="Zoom in waveform"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
