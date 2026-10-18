'use client';

import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Radio,
} from 'lucide-react';
import { formatTime } from '@/lib/audioUtils';
import { VideoSpeakerSegment } from '@/lib/geminiApi';

interface VideoPlayerPaneProps {
  videoUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  activeSegment: VideoSpeakerSegment | null;
  audioMode: 'original' | 'dubbed' | 'side_by_side';
  onChangeAudioMode: (mode: 'original' | 'dubbed' | 'side_by_side') => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoPlayerPane: React.FC<VideoPlayerPaneProps> = ({
  videoUrl,
  currentTime,
  duration,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  activeSegment,
  audioMode,
  onChangeAudioMode,
  videoRef,
}) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col justify-between space-y-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Video Player
          </h3>
        </div>

        {/* Audio Stream Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          <span className="text-slate-400 px-1.5 hidden sm:inline">Audio:</span>
          <button
            type="button"
            onClick={() => onChangeAudioMode('original')}
            className={`px-2 py-0.5 rounded-lg font-medium transition ${
              audioMode === 'original'
                ? 'bg-slate-800 text-slate-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Original
          </button>
          <button
            type="button"
            onClick={() => onChangeAudioMode('dubbed')}
            className={`px-2 py-0.5 rounded-lg font-semibold transition ${
              audioMode === 'dubbed'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            ✨ Khmer Dubbed
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video w-full rounded-xl bg-black overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center group">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            playsInline
            onEnded={onPause}
          />
        ) : (
          <div className="text-center p-6 text-slate-500 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
            <p className="text-xs">No video loaded. Upload a video to start AI dubbing.</p>
          </div>
        )}

        {/* Active Segment Badge Overlay */}
        {activeSegment && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="px-3 py-1 rounded-lg bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold shadow-lg backdrop-blur-md">
              Segment #{activeSegment.segmentNumber} ({formatTime(activeSegment.startTime)} - {formatTime(activeSegment.endTime)})
            </span>
          </div>
        )}

        {/* Subtitle Overlay */}
        {activeSegment && (
          <div className="absolute bottom-3 left-4 right-4 text-center pointer-events-none">
            <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md text-xs sm:text-sm font-khmer text-slate-100 border border-slate-700/60 shadow-xl leading-relaxed max-w-lg">
              {audioMode === 'dubbed' ? activeSegment.khmerTranslation : activeSegment.originalText}
            </span>
          </div>
        )}
      </div>

      {/* Synchronized Custom Player Controls */}
      <div className="space-y-2 pt-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.05}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition transform hover:scale-105"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <span className="text-xs font-mono font-medium text-slate-300">
              <span className="text-indigo-400">{formatTime(currentTime)}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="text-slate-400 hover:text-white transition">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <button onClick={handleFullscreen} className="text-slate-400 hover:text-white transition" title="Fullscreen">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
