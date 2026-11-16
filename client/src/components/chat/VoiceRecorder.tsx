import React, { useState, useEffect, useRef } from 'react';
import {
  Trash,
  PaperPlaneRight,
  Stop,
  Play,
  Pause,
  CircleNotch,
} from '@phosphor-icons/react';
import { toast } from '../../stores';

interface VoiceRecorderProps {
  onCancel: () => void;
  onSend: (audioFile: File, duration: number, waveform: number[]) => Promise<void>;
  disabled?: boolean;
}

/**
 * Format duration in seconds to mm:ss format.
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Downsamples an arbitrary number of raw amplitude samples into exactly targetCount buckets.
 */
function downsampleWaveform(samples: number[], targetCount = 36): number[] {
  if (samples.length === 0) {
    return Array(targetCount).fill(0.2);
  }

  const result: number[] = [];
  const bucketSize = samples.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let sum = 0;
    let count = 0;

    for (let j = start; j < end && j < samples.length; j++) {
      sum += samples[j];
      count++;
    }

    const avg = count > 0 ? sum / count : 0.15;
    // Normalize and clamp between 0.08 and 1.0
    const clamped = Math.max(0.08, Math.min(1.0, Math.round(avg * 100) / 100));
    result.push(clamped);
  }

  return result;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onCancel,
  onSend,
  disabled,
}) => {
  const [recordingState, setRecordingState] = useState<'recording' | 'preview' | 'sending'>('recording');
  const [seconds, setSeconds] = useState(0);
  const [liveBars, setLiveBars] = useState<number[]>(Array(24).fill(0.1));
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rawSamplesRef = useRef<number[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup all audio resources and release microphone hardware
  const cleanupMedia = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignored
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  useEffect(() => {
    let isCancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    rawSamplesRef.current = [];
    chunksRef.current = [];

    async function initRecorder() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.warning(
          'Không hỗ trợ Microphone',
          'Trình duyệt hoặc môi trường kết nối hiện tại không hỗ trợ thu âm micro.'
        );
        onCancel();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        // Determine optimal audio codec (Opus preferred)
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/webm';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 32000,
        });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(blob);
        };

        // Realtime audio amplitude analysis via Web Audio API
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const analyze = () => {
          if (isCancelled || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average energy in range [0, 1]
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / (dataArray.length * 255);
          const normalized = Math.max(0.1, Math.min(1.0, avg * 1.8));

          rawSamplesRef.current.push(normalized);
          setLiveBars((prev) => [...prev.slice(1), normalized]);

          animFrameRef.current = requestAnimationFrame(analyze);
        };

        recorder.start(100);
        analyze();

        // Increment duration timer using real wall clock time
        const startTime = Date.now();
        timer = setInterval(() => {
          if (isCancelled) return;
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setSeconds(elapsed);
        }, 300);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to access microphone for voice message:', err);
        const isPermissionDenied =
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        if (isPermissionDenied) {
          toast.warning(
            'Quyền Micro bị từ chối',
            'Vui lòng nhấp vào biểu tượng quyền hạn trên thanh địa chỉ trình duyệt để cho phép Micro.'
          );
        } else {
          toast.error(
            'Lỗi khởi tạo Microphone',
            'Không thể truy cập thiết bị micro. Vui lòng kiểm tra lại thiết bị thu âm!'
          );
        }
        onCancel();
      }
    }

    initRecorder();

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
      cleanupMedia();
    };
  }, []);

  const handleStopAndReview = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRecordingState('preview');
  };

  const handleTogglePlayPreview = () => {
    if (!audioBlob) return;

    if (!previewAudioRef.current) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewTime(audio.currentTime);
      };
      audio.onended = () => {
        setPreviewPlaying(false);
        setPreviewTime(0);
      };
    }

    if (previewPlaying) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
    } else {
      previewAudioRef.current.play();
      setPreviewPlaying(true);
    }
  };

  const handleSendRecording = async () => {
    if (recordingState === 'sending' || disabled) return;

    setRecordingState('sending');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    // Stop recorder if still actively recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // Allow brief moment for onstop chunk assembly
      await new Promise((r) => setTimeout(r, 100));
    }

    cleanupMedia();

    const blob =
      audioBlob ||
      new Blob(chunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm',
      });

    if (blob.size === 0) {
      onCancel();
      return;
    }

    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const audioFile = new File([blob], `voice_message_${Date.now()}.${ext}`, {
      type: blob.type,
    });

    const finalWaveform = downsampleWaveform(rawSamplesRef.current, 36);
    const finalDuration = Math.max(1, seconds);

    try {
      await onSend(audioFile, finalDuration, finalWaveform);
    } finally {
      onCancel();
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 w-full min-h-[40px] select-none">
      {/* 1. Cancel / Discard Recording */}
      <button
        type="button"
        onClick={() => {
          cleanupMedia();
          onCancel();
        }}
        disabled={recordingState === 'sending'}
        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-control transition-colors cursor-pointer shrink-0"
        title="Hủy ghi âm"
      >
        <Trash size={18} weight="bold" />
      </button>

      {/* 2. Recording Status & Live Waveform Indicator */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        {/* Pulsating Recording Dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
          <span className="text-xs font-mono font-bold text-text-primary tabular-nums">
            {recordingState === 'preview' ? formatTime(previewTime || seconds) : formatTime(seconds)}
          </span>
        </div>

        {/* Live Audio Frequency Waveform Bars */}
        {recordingState === 'recording' ? (
          <div className="flex-1 h-6 flex items-center gap-[3px] overflow-hidden justify-center px-2">
            {liveBars.map((level, idx) => (
              <span
                key={idx}
                className="w-[3px] bg-accent-primary rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.round(level * 24))}px`,
                  opacity: 0.4 + level * 0.6,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlayPreview}
              className="p-1 text-accent-primary hover:bg-accent-soft rounded-control cursor-pointer"
              title={previewPlaying ? 'Tạm dừng' : 'Nghe lại'}
            >
              {previewPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            </button>
            <span className="text-xs text-text-muted italic">Đã ghi âm xong ({formatTime(seconds)})</span>
          </div>
        )}
      </div>

      {/* 3. Actions: Pause/Review or Send */}
      <div className="flex items-center gap-1.5 shrink-0">
        {recordingState === 'recording' && (
          <button
            type="button"
            onClick={handleStopAndReview}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-active rounded-control transition-colors cursor-pointer"
            title="Dừng để nghe lại"
          >
            <Stop size={17} weight="bold" />
          </button>
        )}

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSendRecording}
          disabled={recordingState === 'sending' || disabled}
          className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-accent-primary text-white hover:bg-accent-hover transition-all flex items-center justify-center cursor-pointer shadow-raised disabled:opacity-50 shrink-0 ml-0.5"
          title="Gửi tin nhắn thoại"
        >
          {recordingState === 'sending' ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <PaperPlaneRight size={14} weight="fill" />
          )}
        </button>
      </div>
    </div>
  );
};
