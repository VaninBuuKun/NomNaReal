import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from '@phosphor-icons/react';

interface AudioMessagePlayerProps {
  src: string;
  duration?: number;
  waveform?: number[];
  fileName?: string;
  fileSize?: number;
}

/**
 * Formats seconds into mm:ss.
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Deterministically generates a natural vocal waveform distribution
 * from an audio URL if explicit waveform metadata is absent.
 */
function generateFallbackWaveform(seed: string, count = 36): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate smooth bell-curve speech envelope with subtle pseudo-random variations
    const norm = i / count;
    const envelope = Math.sin(norm * Math.PI);
    const pseudoRand = ((Math.abs(hash * (i + 13)) % 100) / 100) * 0.4 + 0.6;
    const val = Math.max(0.12, Math.min(1.0, envelope * pseudoRand));
    result.push(Math.round(val * 100) / 100);
  }
  return result;
}

const PLAYBACK_SPEEDS = [1.0, 1.5, 2.0];

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  src,
  duration: initialDuration,
  waveform: providedWaveform,
}) => {
  const parsedUrlDuration = useMemo(() => {
    if (initialDuration && initialDuration > 0) return initialDuration;
    const match = src.match(/[?&]duration=([0-9.]+)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) return val;
    }
    return 0;
  }, [src, initialDuration]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(parsedUrlDuration || initialDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);

  // Web Audio API buffer references to guarantee 100% seekability on WebM files without Cues
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const speedIndexRef = useRef<number>(0);
  const durationRef = useRef<number>(parsedUrlDuration || initialDuration || 0);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  speedIndexRef.current = speedIndex;
  durationRef.current = duration;

  const waveformBars = useMemo(() => {
    if (providedWaveform && providedWaveform.length >= 20) {
      return providedWaveform;
    }
    return generateFallbackWaveform(src, 36);
  }, [providedWaveform, src]);

  // Stop Web Audio playback and cancel RAF loop
  const stopPlayback = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignored
      }
      sourceNodeRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  // Pre-load and decode audio bytes via Web Audio API
  const ensureAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (audioBufferRef.current) return audioBufferRef.current;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtxClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = decoded;

      if (decoded.duration && !isNaN(decoded.duration) && isFinite(decoded.duration)) {
        setDuration(decoded.duration);
        durationRef.current = decoded.duration;
      }
      return decoded;
    } catch (err) {
      console.warn('Web Audio decoding failed for voice note:', err);
      return null;
    }
  };

  // Play audio from a specific offset in seconds
  const playFromOffset = async (offsetSec: number) => {
    stopPlayback();

    const buffer = await ensureAudioBuffer();
    if (!buffer || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const totalDur = durationRef.current > 0 ? durationRef.current : buffer.duration;
    const clampedOffset = Math.max(0, Math.min(totalDur - 0.05, offsetSec));

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = PLAYBACK_SPEEDS[speedIndexRef.current];

    if (!gainNodeRef.current) {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
    }
    source.connect(gainNodeRef.current);

    source.onended = () => {
      stopPlayback();
      pausedAtRef.current = 0;
      setCurrentTime(0);
    };

    source.start(0, clampedOffset);
    sourceNodeRef.current = source;
    startedAtRef.current = ctx.currentTime - clampedOffset / PLAYBACK_SPEEDS[speedIndexRef.current];
    pausedAtRef.current = clampedOffset;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentTime(clampedOffset);

    // RAF tracking loop for smooth scrubbing and high-fidelity progress updates
    const updateProgress = () => {
      if (!isPlayingRef.current || !audioContextRef.current) return;
      const elapsed = (audioContextRef.current.currentTime - startedAtRef.current) * PLAYBACK_SPEEDS[speedIndexRef.current];
      const bounded = Math.min(totalDur, Math.max(0, elapsed));

      setCurrentTime(bounded);
      pausedAtRef.current = bounded;

      if (bounded >= totalDur) {
        stopPlayback();
        pausedAtRef.current = 0;
        setCurrentTime(0);
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    // Probe audio duration when mounted
    ensureAudioBuffer();

    return () => {
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      audioBufferRef.current = null;
      gainNodeRef.current = null;
    };
  }, [src]);

  const togglePlay = async () => {
    if (isPlayingRef.current) {
      // Pause
      stopPlayback();
    } else {
      // Play or resume
      const currentPos = pausedAtRef.current;
      const totalDur = durationRef.current;
      const startPos = (totalDur > 0 && currentPos >= totalDur - 0.1) ? 0 : currentPos;
      await playFromOffset(startPos);
    }
  };

  const handleCycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIdx);
    speedIndexRef.current = nextIdx;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = PLAYBACK_SPEEDS[nextIdx];
      // Adjust startedAtRef to preserve elapsed progress calculation seamlessly
      if (audioContextRef.current) {
        startedAtRef.current = audioContextRef.current.currentTime - pausedAtRef.current / PLAYBACK_SPEEDS[nextIdx];
      }
    }
  };

  const handleScrubWaveform = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetPercent = clickX / rect.width;
    const totalDur = durationRef.current > 0 ? durationRef.current : (audioBufferRef.current?.duration || 0);

    if (totalDur <= 0) return;

    const targetTime = targetPercent * totalDur;
    pausedAtRef.current = targetTime;
    setCurrentTime(targetTime);

    if (isPlayingRef.current) {
      // Currently playing -> immediately jump and continue playing from new position
      await playFromOffset(targetTime);
    }
  };

  const playProgress = duration > 0 ? Math.min(1.0, currentTime / duration) : 0;

  return (
    <div
      className="inline-flex items-center gap-3 p-2.5 rounded-card bg-surface/80 border border-border/80 hover:border-accent-primary/40 transition-colors select-none max-w-sm w-full sm:w-[340px]"
    >
      {/* 1. Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-accent-primary hover:bg-accent-hover text-white flex items-center justify-center shrink-0 shadow-elevation-low cursor-pointer transition-transform active:scale-95"
        title={isPlaying ? 'Tạm dừng' : 'Phát tin nhắn thoại'}
      >
        {isPlaying ? (
          <Pause size={18} weight="fill" />
        ) : (
          <Play size={18} weight="fill" className="ml-0.5" />
        )}
      </button>

      {/* 2. Waveform Visualizer & Elapsed Timer */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* Interactive Scrubbable Waveform Bars */}
        <div
          ref={waveformRef}
          onClick={handleScrubWaveform}
          className="h-7 flex items-center gap-[2.5px] cursor-pointer group/wave py-1"
          title="Bấm để tua âm thanh"
        >
          {waveformBars.map((heightPercent, idx) => {
            const barFraction = (idx + 1) / waveformBars.length;
            const isPlayed = barFraction <= playProgress;
            const barHeight = Math.max(5, Math.round(heightPercent * 24));

            return (
              <span
                key={idx}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? 'bg-accent-primary group-hover/wave:opacity-100'
                    : 'bg-text-muted/30 group-hover/wave:bg-text-muted/40'
                }`}
                style={{
                  height: `${barHeight}px`,
                }}
              />
            );
          })}
        </div>

        {/* Timestamp: Current Time / Total Duration */}
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted leading-none">
          <span className="tabular-nums font-medium text-text-secondary">
            {formatTime(currentTime)}
          </span>
          <span className="tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Playback Speed Selector */}
      <button
        type="button"
        onClick={handleCycleSpeed}
        className="h-6 px-1.5 rounded-control bg-surface-active hover:bg-surface-active/80 text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 border border-border/60"
        title="Tốc độ phát"
      >
        {PLAYBACK_SPEEDS[speedIndex]}x
      </button>
    </div>
  );
};
