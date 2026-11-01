import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  Screencast,
  PhoneDisconnect,
  ArrowsInSimple,
  ArrowsOutSimple,
  SpeakerHigh,
  SpeakerSlash,
  CornersOut,
  CornersIn,
} from '@phosphor-icons/react';
import { useCallStore } from '../../stores/useCallStore';
import { webrtcService } from '../../services/webrtc';
import { Avatar } from '../ui/Avatar';
import { CallControlButton } from './CallControlButton';
import { VideoPlayer } from './VideoPlayer';

const CONTROLS_HIDE_DELAY_MS = 4000;

const formatDuration = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const CallOverlay: React.FC = () => {
  const {
    callStatus,
    peer,
    isMicMuted,
    isCameraOff,
    isScreenSharing,
    isSpeakerMuted,
    localStream,
    remoteStream,
    remoteMedia,
    callDuration,
    error,
    setDuration,
    toggleSpeaker,
  } = useCallStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');
  const [pipCorner, setPipCorner] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'>('bottom-right');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const isActive = callStatus === 'outgoing' || callStatus === 'connecting' || callStatus === 'connected';

  // ---- Derived media state -------------------------------------------------
  // A remote video track exists from the first negotiation but stays "muted" until real frames
  // arrive, and a disabled camera still sends black frames. So we trust: live + unmuted track
  // AND the peer's own camera/screen flag (sent over the data channel).
  const remoteVideoTrack = remoteStream?.getVideoTracks().find((t) => t.readyState === 'live' && !t.muted) ?? null;
  const remoteCameraHidden = remoteMedia.cameraOff && !remoteMedia.screenSharing;
  const showRemoteVideo = callStatus === 'connected' && Boolean(remoteVideoTrack) && !remoteCameraHidden;
  const remoteIsSharing = showRemoteVideo && remoteMedia.screenSharing;
  const localVideoActive =
    !isCameraOff && Boolean(localStream?.getVideoTracks().some((t) => t.readyState === 'live'));
  const showLocalPip = localVideoActive && !isScreenSharing && !isMinimized;

  const isScreenShareSupported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;

  // ---- Remote audio --------------------------------------------------------
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !remoteStream) return;
    if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
    el.play()
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true));
  }, [remoteStream, isActive]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isSpeakerMuted;
  }, [isSpeakerMuted]);

  // ---- Call timer ----------------------------------------------------------
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = window.setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus, setDuration]);

  // ---- Controls auto-hide (only while watching a video) --------------------
  const autoHide = callStatus === 'connected' && showRemoteVideo && !isMinimized;

  // Reset UI state during render when the situation changes (no effect needed)
  const [prevAutoHide, setPrevAutoHide] = useState(autoHide);
  if (prevAutoHide !== autoHide) {
    setPrevAutoHide(autoHide);
    setControlsVisible(true);
  }
  if (!isActive && isMinimized) setIsMinimized(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (autoHide) scheduleHide();
  }, [autoHide, scheduleHide]);

  useEffect(() => {
    if (!autoHide) return;
    scheduleHide();
    return clearHideTimer;
  }, [autoHide, scheduleHide, clearHideTimer]);

  const controlsShown = controlsVisible || !autoHide;

  // ---- Fullscreen ----------------------------------------------------------
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!isActive && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, [isActive]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      // not allowed in this context
    }
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) void webrtcService.stopScreenShare();
    else void webrtcService.startScreenShare();
  };

  const handleUnlockAudio = () => {
    audioRef.current
      ?.play()
      .then(() => setAudioBlocked(false))
      .catch(() => {});
  };

  // ---- Notice toast (also shown after the call has ended, e.g. "declined") --
  const notice = error ? (
    <div className="px-3.5 py-2 rounded-full bg-sidebar/90 backdrop-blur-md border border-border shadow-floating text-xs font-medium text-text-primary max-w-full text-center animate-in fade-in duration-200">
      {error}
    </div>
  ) : null;

  if (!isActive) {
    return notice ? (
      <div className="fixed top-4 inset-x-4 z-[250] flex justify-center pointer-events-none">{notice}</div>
    ) : null;
  }

  const statusText =
    callStatus === 'connected'
      ? formatDuration(callDuration)
      : callStatus === 'connecting'
        ? 'Đang kết nối...'
        : 'Đang đổ chuông...';

  const audioElement = (
    <audio ref={audioRef} autoPlay playsInline muted={isSpeakerMuted} className="hidden" />
  );

  // ==========================================================================
  // Minimized widget (keep chatting while on the call)
  // ==========================================================================
  if (isMinimized) {
    return (
      <>
        {audioElement}
        <div className="fixed bottom-24 right-3 sm:bottom-6 sm:right-5 z-[160] w-56 bg-sidebar border border-border rounded-card shadow-floating overflow-hidden animate-in slide-in-from-bottom-2 duration-200 select-none">
          <div className="relative aspect-video bg-rail flex items-center justify-center">
            {showRemoteVideo ? (
              <VideoPlayer stream={remoteStream} className="w-full h-full object-cover" />
            ) : (
              <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="lg" />
            )}
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-sidebar/80 backdrop-blur-md border border-border text-[11px] font-medium text-text-primary max-w-[70%] truncate">
              {peer?.displayName} · {statusText}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 p-2">
            <CallControlButton
              size="md"
              label={isMicMuted ? 'Bật mic' : 'Tắt mic'}
              variant={isMicMuted ? 'off' : 'default'}
              onClick={() => webrtcService.toggleMic()}
            >
              {isMicMuted ? <MicrophoneSlash size={18} weight="bold" /> : <Microphone size={18} weight="bold" />}
            </CallControlButton>
            <CallControlButton size="md" label="Mở rộng cuộc gọi" onClick={() => setIsMinimized(false)}>
              <ArrowsOutSimple size={18} weight="bold" />
            </CallControlButton>
            <CallControlButton size="md" label="Kết thúc cuộc gọi" variant="end" onClick={() => void webrtcService.endCall()}>
              <PhoneDisconnect size={18} weight="bold" />
            </CallControlButton>
          </div>
        </div>
        {notice && <div className="fixed top-4 inset-x-4 z-[250] flex justify-center pointer-events-none">{notice}</div>}
      </>
    );
  }

  // ==========================================================================
  // Full-screen call stage: the video fills the whole viewport, controls float on top
  // ==========================================================================
  const hiddenWhenIdle = controlsShown ? 'opacity-100' : 'opacity-0 pointer-events-none';

  return (
    <div
      ref={rootRef}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      className="fixed inset-0 z-[150] bg-rail overflow-hidden select-none animate-in fade-in duration-200"
    >
      {audioElement}

      {/* ---------- Stage ---------- */}
      <div className="absolute inset-0">
        {showRemoteVideo ? (
          <VideoPlayer
            stream={remoteStream}
            className={`w-full h-full transition-all duration-200 ${
              remoteIsSharing ? 'object-contain' : videoFit === 'contain' ? 'object-contain' : 'object-cover'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="relative">
              {callStatus !== 'connected' && (
                <div className="absolute -inset-4 rounded-full bg-accent-primary/20 animate-ping opacity-60" />
              )}
              <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="xl" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">{peer?.displayName}</h2>
            <p className="text-sm text-text-muted">
              {callStatus === 'connected'
                ? remoteCameraHidden
                  ? `${statusText} · Camera đang tắt`
                  : statusText
                : statusText}
            </p>
          </div>
        )}
      </div>

      {/* ---------- Top-left: who + timer ---------- */}
      <div
        className={`absolute left-3 sm:left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full bg-sidebar/80 backdrop-blur-md border border-border transition-opacity duration-200 ${hiddenWhenIdle}`}
      >
        <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="sm" />
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-semibold text-text-primary truncate max-w-[34vw] sm:max-w-[16rem]">
            {peer?.displayName}
          </p>
          <p className={`text-[11px] ${callStatus === 'connected' ? 'text-success' : 'text-text-muted'}`}>
            {statusText}
          </p>
        </div>
        {remoteMedia.micMuted && callStatus === 'connected' && (
          <MicrophoneSlash size={14} weight="bold" className="text-danger shrink-0" aria-label="Đối phương đang tắt mic" />
        )}
      </div>

      {/* ---------- Top-right: window controls ---------- */}
      <div
        className={`absolute right-3 sm:right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-1.5 p-1 rounded-full bg-sidebar/80 backdrop-blur-md border border-border transition-opacity duration-200 ${hiddenWhenIdle}`}
      >
        {showRemoteVideo && !remoteIsSharing && (
          <button
            type="button"
            onClick={() => setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
            title={videoFit === 'contain' ? 'Lấp đầy màn hình (Fill)' : 'Hiển thị trọn vẹn (Fit)'}
            aria-label={videoFit === 'contain' ? 'Lấp đầy màn hình (Fill)' : 'Hiển thị trọn vẹn (Fit)'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-[10px] font-bold tracking-wider"
          >
            {videoFit === 'contain' ? 'FIT' : 'FILL'}
          </button>
        )}
        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
          >
            {isFullscreen ? <CornersIn size={18} weight="bold" /> : <CornersOut size={18} weight="bold" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          title="Thu nhỏ để tiếp tục chat"
          aria-label="Thu nhỏ để tiếp tục chat"
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
        >
          <ArrowsInSimple size={18} weight="bold" />
        </button>
      </div>

      {/* ---------- Top-center stack: sharing state / notices ---------- */}
      <div className="absolute inset-x-3 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 flex flex-col items-center gap-2 pointer-events-none">
        {isScreenSharing && (
          <div className="pointer-events-auto flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-accent-soft backdrop-blur-md border border-accent-primary/30 text-xs font-semibold text-accent-primary">
            <Screencast size={16} weight="bold" />
            <span>Bạn đang chia sẻ màn hình</span>
            <button
              type="button"
              onClick={handleToggleScreenShare}
              className="ml-1 px-2.5 py-1 rounded-full bg-danger hover:bg-danger-hover text-on-accent text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Dừng
            </button>
          </div>
        )}
        {remoteIsSharing && !isScreenSharing && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-sidebar/80 backdrop-blur-md border border-border text-xs font-medium text-text-primary transition-opacity duration-200 ${hiddenWhenIdle}`}
          >
            <Screencast size={15} weight="bold" className="text-accent-primary" />
            <span>Đang xem màn hình của {peer?.displayName}</span>
          </div>
        )}
        {audioBlocked && (
          <button
            type="button"
            onClick={handleUnlockAudio}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-on-accent text-xs font-semibold shadow-floating cursor-pointer transition-colors"
          >
            <SpeakerHigh size={16} weight="bold" />
            Bấm để bật âm thanh
          </button>
        )}
        {notice}
      </div>

      {/* ---------- My camera preview (tap to change corner) ---------- */}
      {showLocalPip && (() => {
        const cornerClasses = {
          'bottom-right': controlsShown ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 sm:right-4' : 'bottom-4 right-3 sm:right-4',
          'bottom-left': controlsShown ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 sm:left-4' : 'bottom-4 left-3 sm:left-4',
          'top-right': 'top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] right-3 sm:right-4',
          'top-left': 'top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] left-3 sm:left-4',
        };

        const cycleCorner = () => {
          setPipCorner((prev) => {
            if (prev === 'bottom-right') return 'top-right';
            if (prev === 'top-right') return 'top-left';
            if (prev === 'top-left') return 'bottom-left';
            return 'bottom-right';
          });
        };

        return (
          <div
            onClick={cycleCorner}
            title="Chạm để đổi góc hiển thị PiP"
            className={`absolute z-20 w-24 sm:w-44 aspect-[3/4] sm:aspect-video rounded-card overflow-hidden border border-border bg-sidebar shadow-floating transition-all duration-300 cursor-pointer active:scale-95 group/pip ${
              cornerClasses[pipCorner]
            }`}
          >
            <VideoPlayer stream={localStream} className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white pointer-events-none opacity-0 group-hover/pip:opacity-100 transition-opacity">
              Đổi góc
            </div>
          </div>
        );
      })()}

      {/* ---------- Dock ---------- */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 flex justify-center px-2 sm:px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none transition-all duration-200 ${
          controlsShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-full bg-sidebar/85 backdrop-blur-md border border-border shadow-floating ${
            controlsShown ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <CallControlButton
            label={isMicMuted ? 'Bật mic' : 'Tắt mic'}
            variant={isMicMuted ? 'off' : 'default'}
            onClick={() => webrtcService.toggleMic()}
          >
            {isMicMuted ? <MicrophoneSlash size={22} weight="bold" /> : <Microphone size={22} weight="bold" />}
          </CallControlButton>

          <CallControlButton
            label={isCameraOff ? 'Bật camera' : 'Tắt camera'}
            variant={isCameraOff ? 'off' : 'default'}
            onClick={() => void webrtcService.toggleCamera()}
          >
            {isCameraOff ? <VideoCameraSlash size={22} weight="bold" /> : <VideoCamera size={22} weight="bold" />}
          </CallControlButton>

          <CallControlButton
            label={isSpeakerMuted ? 'Bật loa' : 'Tắt loa (tránh hú khi 2 máy để gần nhau)'}
            variant={isSpeakerMuted ? 'off' : 'default'}
            onClick={toggleSpeaker}
          >
            {isSpeakerMuted ? <SpeakerSlash size={22} weight="bold" /> : <SpeakerHigh size={22} weight="bold" />}
          </CallControlButton>

          {isScreenShareSupported && (
            <CallControlButton
              label={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
              variant={isScreenSharing ? 'accent' : 'default'}
              disabled={callStatus !== 'connected'}
              onClick={handleToggleScreenShare}
            >
              <Screencast size={22} weight="bold" />
            </CallControlButton>
          )}

          <CallControlButton label="Kết thúc cuộc gọi" variant="end" onClick={() => void webrtcService.endCall()}>
            <PhoneDisconnect size={22} weight="bold" />
          </CallControlButton>
        </div>
      </div>
    </div>
  );
};
