import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  ArrowsClockwise,
  SquaresFour,
  Monitor,
  ArrowsOut,
  ArrowsIn,
  Info,
} from '@phosphor-icons/react';
import { useCallStore } from '../../stores/useCallStore';
import { webrtcService } from '../../services/webrtc';
import { Avatar } from '../ui/Avatar';

type LayoutMode = 'spotlight' | 'grid';
type PipCorner = 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
type VideoFit = 'contain' | 'cover';

export const CallOverlay: React.FC = () => {
  const {
    callStatus,
    peer,
    isVideoCall,
    isMicMuted,
    isCameraOff,
    isScreenSharing,
    isSpeakerMuted,
    remoteVolume,
    isFullScreen,
    localStream,
    remoteStream,
    callDuration,
    setDuration,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    toggleFullScreen,
    error,
  } = useCallStore();

  // UX Local View States
  const [isMinimized, setIsMinimized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('spotlight');
  const [isSwapped, setIsSwapped] = useState(false);
  const [videoFit, setVideoFit] = useState<VideoFit>('contain');
  const [pipCorner, setPipCorner] = useState<PipCorner>('bottom-right');
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);
  const [showAcousticHint, setShowAcousticHint] = useState(true);

  // Video and Audio DOM references
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Callback ref to reliably bind streams to video elements across swaps and layout shifts
  const setLocalVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el;
      if (el && localStream) {
        el.srcObject = localStream;
      }
    },
    [localStream]
  );

  const setRemoteVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteVideoRef.current = el;
      if (el && remoteStream) {
        el.srcObject = remoteStream;
      }
    },
    [remoteStream]
  );

  // Sync streams whenever streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isSwapped, layoutMode, isMinimized]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = isSpeakerMuted;
        remoteAudioRef.current.volume = remoteVolume;

        const playPromise = remoteAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsAudioAutoplayBlocked(false))
            .catch((err) => {
              console.warn('Audio auto-play prevented by browser:', err);
              setIsAudioAutoplayBlocked(true);
            });
        }
      }
    }
  }, [remoteStream, isSwapped, layoutMode, isMinimized, isSpeakerMuted, remoteVolume]);

  // Sync speaker muted state directly to audio element
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  // Auto-hide controls when idle in full stage view
  const resetControlsTimeout = useCallback(() => {
    setAreControlsVisible(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (callStatus === 'connected' && !isMinimized) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setAreControlsVisible(false);
      }, 3500);
    }
  }, [callStatus, isMinimized]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Run duration timer strictly when connected
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus, setDuration]);

  // Reset swap when screen share changes to naturally focus the new screen
  useEffect(() => {
    if (isScreenSharing) {
      setIsSwapped(true); // You are sharing -> spotlight yourself to see your screen
    } else {
      setIsSwapped(false); // Back to partner's spotlight
    }
  }, [isScreenSharing]);

  if (
    callStatus !== 'outgoing' &&
    callStatus !== 'connecting' &&
    callStatus !== 'connected'
  ) {
    return null;
  }

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await webrtcService.endCall();
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await webrtcService.stopScreenShare();
    } else {
      await webrtcService.startScreenShare();
    }
  };

  const handleManualUnmute = async () => {
    if (remoteAudioRef.current) {
      try {
        await remoteAudioRef.current.play();
        setIsAudioAutoplayBlocked(false);
      } catch (err) {
        console.error('Failed to manually play audio:', err);
      }
    }
  };

  const cyclePipCorner = (e: React.MouseEvent) => {
    e.stopPropagation();
    const corners: PipCorner[] = ['bottom-right', 'top-right', 'top-left', 'bottom-left'];
    const nextIdx = (corners.indexOf(pipCorner) + 1) % corners.length;
    setPipCorner(corners[nextIdx]);
  };

  const getPipCornerClasses = (corner: PipCorner) => {
    switch (corner) {
      case 'bottom-right':
        return 'bottom-20 right-4 sm:bottom-24 sm:right-6';
      case 'top-right':
        return 'top-16 right-4 sm:top-20 sm:right-6';
      case 'top-left':
        return 'top-16 left-4 sm:top-20 sm:left-6';
      case 'bottom-left':
        return 'bottom-20 left-4 sm:bottom-24 sm:left-6';
    }
  };

  const isScreenShareSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  const hasRemoteVideo = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().length > 0 &&
      remoteStream.getVideoTracks().some((t) => t.enabled)
  );

  const hasLocalVideo = Boolean(
    !isCameraOff &&
      localStream &&
      localStream.getVideoTracks().length > 0 &&
      localStream.getVideoTracks().some((t) => t.enabled)
  );

  // Helper to render Remote Video / Avatar tile
  const renderRemoteTile = (isSmallPreview = false) => {
    return (
      <div className="w-full h-full relative bg-rail overflow-hidden flex items-center justify-center select-none">
        {callStatus === 'connected' && hasRemoteVideo ? (
          <video
            ref={setRemoteVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full ${
              isSmallPreview ? 'object-cover' : videoFit === 'contain' ? 'object-contain' : 'object-cover'
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
            <div className="relative">
              {callStatus === 'outgoing' && (
                <div className="absolute -inset-3 rounded-full bg-accent-primary/20 animate-ping opacity-75" />
              )}
              <Avatar
                src={peer?.avatarUrl}
                fallback={peer?.displayName || 'User'}
                size={isSmallPreview ? 'md' : 'xl'}
              />
            </div>
            {!isSmallPreview && (
              <>
                <h4 className="text-sm sm:text-base font-bold text-text-primary">{peer?.displayName}</h4>
                <p className="text-xs text-text-muted">
                  {callStatus === 'outgoing'
                    ? 'Đang đổ chuông, vui lòng chờ...'
                    : callStatus === 'connecting'
                      ? 'Đang bắt tay kết nối P2P...'
                      : 'Đã kết nối • Camera đối phương đang tắt'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Remote Tile Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-control bg-sidebar/80 backdrop-blur-xs border border-border text-[11px] font-medium text-text-primary flex items-center gap-1.5 shadow-raised pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="truncate max-w-[120px]">{peer?.displayName}</span>
        </div>
      </div>
    );
  };

  // Helper to render Local Video / Avatar tile
  const renderLocalTile = (isSmallPreview = false) => {
    return (
      <div className="w-full h-full relative bg-rail overflow-hidden flex items-center justify-center select-none">
        {hasLocalVideo && localStream ? (
          <video
            ref={setLocalVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full ${
              isSmallPreview
                ? 'object-cover'
                : isScreenSharing
                  ? videoFit === 'contain'
                    ? 'object-contain'
                    : 'object-cover'
                  : 'object-cover'
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-text-muted text-center">
            <VideoCameraSlash size={isSmallPreview ? 20 : 32} weight="bold" />
            <span className="text-[11px] font-medium">Camera của bạn đang tắt</span>
          </div>
        )}

        {/* Local Tile Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-control bg-sidebar/80 backdrop-blur-xs border border-border text-[11px] font-medium text-text-primary flex items-center gap-1.5 shadow-raised pointer-events-none">
          {isScreenSharing ? (
            <>
              <Screencast size={13} weight="bold" className="text-accent-primary" />
              <span>Màn hình của bạn</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
              <span>Bạn</span>
            </>
          )}
          {isMicMuted && <MicrophoneSlash size={12} weight="bold" className="text-danger ml-0.5" />}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 
        Dedicated invisible audio element for the remote voice stream.
        Placed outside any conditional view to prevent unmounting when switching modes.
      */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={isSpeakerMuted}
        className="hidden"
      />

      {/* Autoplay blocked banner (click to unlock sound) */}
      {isAudioAutoplayBlocked && (
        <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[250] animate-in slide-in-from-top-2 select-none">
          <button
            type="button"
            onClick={handleManualUnmute}
            className="w-full sm:w-auto bg-accent-primary hover:bg-accent-hover text-on-accent text-xs font-semibold py-2.5 px-4 rounded-control shadow-floating flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <SpeakerHigh size={18} weight="bold" />
            <span>Âm thanh bị chặn bởi trình duyệt. Bấm vào đây để bật tiếng!</span>
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. Minimized PiP View (Floating widget in bottom right of page)         */}
      {/* --------------------------------------------------------------------- */}
      {isMinimized ? (
        <div className="fixed bottom-5 right-5 z-[160] w-80 bg-sidebar border border-border rounded-card shadow-floating p-3 flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-150 select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{peer?.displayName}</p>
                <p className="text-[11px] text-text-muted">
                  {callStatus === 'connected'
                    ? formatDuration(callDuration)
                    : callStatus === 'connecting'
                      ? 'Đang kết nối...'
                      : 'Đang đổ chuông...'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
              title="Phóng to cuộc gọi"
            >
              <ArrowsOutSimple size={16} weight="bold" />
            </button>
          </div>

          {/* Small Video Preview */}
          <div className="h-32 bg-rail rounded-control overflow-hidden relative flex items-center justify-center">
            {callStatus === 'connected' && hasRemoteVideo ? (
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-text-muted">
                <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="md" />
              </div>
            )}
          </div>

          {/* Minimized Controls */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2 rounded-full cursor-pointer transition-colors ${
                isMicMuted
                  ? 'bg-danger-soft text-danger border border-danger/20'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isMicMuted ? 'Bật Mic' : 'Tắt Mic'}
            >
              {isMicMuted ? <MicrophoneSlash size={16} weight="bold" /> : <Microphone size={16} weight="bold" />}
            </button>

            {isVideoCall && (
              <button
                type="button"
                onClick={toggleCamera}
                className={`p-2 rounded-full cursor-pointer transition-colors ${
                  isCameraOff
                    ? 'bg-danger-soft text-danger border border-danger/20'
                    : 'bg-surface hover:bg-surface-active text-text-primary'
                }`}
                title={isCameraOff ? 'Bật Camera' : 'Tắt Camera'}
              >
                {isCameraOff ? <VideoCameraSlash size={16} weight="bold" /> : <VideoCamera size={16} weight="bold" />}
              </button>
            )}

            <button
              type="button"
              onClick={toggleSpeaker}
              className={`p-2 rounded-full cursor-pointer transition-colors ${
                isSpeakerMuted
                  ? 'bg-danger-soft text-danger border border-danger/20'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isSpeakerMuted ? 'Bật loa đối phương' : 'Tắt loa (Tránh rè/hú)'}
            >
              {isSpeakerMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="p-2 rounded-full bg-danger hover:bg-danger-hover text-on-accent cursor-pointer transition-colors"
              title="Kết thúc cuộc gọi"
            >
              <PhoneDisconnect size={16} weight="bold" />
            </button>
          </div>
        </div>
      ) : (
        /* --------------------------------------------------------------------- */
        /* 2. Full Call Stage Overlay (Modern Discord/Meet Layout)                */
        /* --------------------------------------------------------------------- */
        <div
          onMouseMove={resetControlsTimeout}
          onTouchStart={resetControlsTimeout}
          className="fixed inset-0 z-[150] bg-overlay backdrop-blur-xs flex items-center justify-center sm:p-4 select-none animate-in fade-in duration-200"
        >
          <div
            className={`w-full bg-chat border border-border shadow-modal flex flex-col overflow-hidden relative transition-all duration-200 ${
              isFullScreen
                ? 'h-full max-w-full rounded-none'
                : 'h-[100dvh] sm:h-[90vh] max-w-6xl rounded-none sm:rounded-modal'
            }`}
          >
            {/* Top Bar: Caller Info, Duration & Layout Toggles */}
            <div
              className={`h-14 px-3 sm:px-5 border-b border-border bg-sidebar/85 backdrop-blur-md flex items-center justify-between shrink-0 z-30 transition-opacity duration-300 ${
                areControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Left: Caller info & status */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="sm" />
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                    {peer?.displayName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-text-muted">
                    {callStatus === 'connected' ? (
                      <span className="flex items-center gap-1.5 text-success font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        {formatDuration(callDuration)}
                      </span>
                    ) : callStatus === 'connecting' ? (
                      <span className="text-accent-primary animate-pulse font-medium">
                        Đang kết nối...
                      </span>
                    ) : (
                      <span className="text-text-muted animate-pulse">Đang đổ chuông...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center / Right: Screen share banner & View controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Active Screen Sharing Badge & Stop Button */}
                {isScreenSharing && (
                  <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-control bg-accent-soft text-accent-primary border border-accent-primary/20 text-xs font-semibold">
                    <Screencast size={15} weight="bold" />
                    <span>Đang chia sẻ màn hình</span>
                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className="ml-1 px-1.5 py-0.5 rounded-control bg-danger hover:bg-danger-hover text-on-accent text-[10px] cursor-pointer transition-colors"
                    >
                      Dừng
                    </button>
                  </div>
                )}

                {/* Video Fit Toggle (Fit vs Cover/Fill) */}
                <button
                  type="button"
                  onClick={() => setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                  className="p-2 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                  title={videoFit === 'contain' ? 'Chế độ lấp đầy (Fill / Zoom)' : 'Chế độ vừa màn hình (Fit)'}
                >
                  {videoFit === 'contain' ? <ArrowsOut size={17} weight="bold" /> : <ArrowsIn size={17} weight="bold" />}
                </button>

                {/* Layout Mode Toggle (Spotlight vs Grid) */}
                <button
                  type="button"
                  onClick={() => setLayoutMode((prev) => (prev === 'spotlight' ? 'grid' : 'spotlight'))}
                  className={`p-2 rounded-control transition-colors cursor-pointer ${
                    layoutMode === 'grid'
                      ? 'bg-accent-soft text-accent-primary border border-accent-primary/30'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
                  }`}
                  title={layoutMode === 'spotlight' ? 'Chuyển sang chế độ lưới chia đôi' : 'Chuyển sang chế độ tiêu điểm'}
                >
                  {layoutMode === 'spotlight' ? <SquaresFour size={17} weight="bold" /> : <Monitor size={17} weight="bold" />}
                </button>

                {/* Swap Main & Secondary Stage (Spotlight mode) */}
                {layoutMode === 'spotlight' && (
                  <button
                    type="button"
                    onClick={() => setIsSwapped((prev) => !prev)}
                    className={`p-2 rounded-control transition-colors cursor-pointer ${
                      isSwapped
                        ? 'bg-accent-soft text-accent-primary border border-accent-primary/30'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
                    }`}
                    title="Hoán đổi màn hình chính và phụ"
                  >
                    <ArrowsClockwise size={17} weight="bold" />
                  </button>
                )}

                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="p-2 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                  title={isFullScreen ? 'Thu nhỏ giao diện' : 'Toàn màn hình'}
                >
                  {isFullScreen ? <CornersIn size={17} weight="bold" /> : <CornersOut size={17} weight="bold" />}
                </button>

                {/* Minimize to PiP */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                  title="Thu nhỏ để tiếp tục chat"
                >
                  <ArrowsInSimple size={17} weight="bold" />
                </button>
              </div>
            </div>

            {/* Error notification banner if any */}
            {error && (
              <div className="px-4 py-2 bg-danger-soft text-danger text-xs font-medium text-center border-b border-danger/20 shrink-0 z-20">
                {error}
              </div>
            )}

            {/* Acoustic Feedback Prevention Notice */}
            {showAcousticHint && callStatus === 'connected' && (
              <div className="px-3 sm:px-4 py-1.5 bg-accent-soft/60 border-b border-accent-primary/20 flex items-center justify-between text-[11px] text-text-muted shrink-0 z-20">
                <div className="flex items-center gap-2 min-w-0">
                  <Info size={15} weight="bold" className="text-accent-primary shrink-0" />
                  <span className="truncate">
                    Mẹo: Nếu để máy tính & điện thoại gần nhau trong phòng, hãy tắt loa một bên (nút Loa bên dưới) để tránh bị rè/hú vòng lặp.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAcousticHint(false)}
                  className="ml-2 text-text-muted hover:text-text-primary cursor-pointer shrink-0"
                  title="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* Center Stage: Video Tiles Area                                   */}
            {/* ----------------------------------------------------------------- */}
            <div className="flex-1 relative bg-rail overflow-hidden flex items-center justify-center">
              {layoutMode === 'grid' ? (
                /* ============================================================= */
                /* MODE 1: Grid Mode (Side-by-side on desktop, top-down on mobile)*/
                /* ============================================================= */
                <div className="w-full h-full p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                  {/* Tile 1: Remote Partner */}
                  <div className="w-full h-full border border-border rounded-card overflow-hidden shadow-raised relative">
                    {renderRemoteTile()}
                  </div>

                  {/* Tile 2: Local User */}
                  <div className="w-full h-full border border-border rounded-card overflow-hidden shadow-raised relative">
                    {renderLocalTile()}
                  </div>
                </div>
              ) : (
                /* ============================================================= */
                /* MODE 2: Spotlight / PiP Mode (1 Main Stage, 1 Floating PiP)   */
                /* ============================================================= */
                <div className="w-full h-full relative">
                  {/* Main Stage Tile */}
                  <div className="w-full h-full">
                    {isSwapped ? renderLocalTile() : renderRemoteTile()}
                  </div>

                  {/* Floating Secondary Tile (Picture-in-Picture) */}
                  {isVideoCall && (
                    <div
                      onClick={() => setIsSwapped((prev) => !prev)}
                      className={`absolute ${getPipCornerClasses(
                        pipCorner
                      )} w-32 sm:w-56 aspect-video bg-sidebar border border-border/90 rounded-card shadow-floating overflow-hidden z-20 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group`}
                      title="Bấm vào đây để phóng to màn hình này"
                    >
                      {/* Secondary Stream Content */}
                      {isSwapped ? renderRemoteTile(true) : renderLocalTile(true)}

                      {/* Hover Swap Indicator Overlay */}
                      <div className="absolute inset-0 bg-overlay/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-on-accent p-1 text-center">
                        <ArrowsClockwise size={20} weight="bold" className="animate-spin-slow" />
                        <span className="text-[10px] font-semibold">Chạm để phóng to</span>
                      </div>

                      {/* Reposition Corner Button */}
                      <button
                        type="button"
                        onClick={cyclePipCorner}
                        className="absolute top-1.5 right-1.5 p-1 rounded-control bg-sidebar/80 hover:bg-surface-active text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-raised z-30"
                        title="Đổi góc hiển thị"
                      >
                        <ArrowsOut size={12} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* Bottom Floating Control Dock (Pill Shaped Capsule)                */}
            {/* ----------------------------------------------------------------- */}
            <div
              className={`absolute bottom-4 sm:bottom-6 inset-x-0 flex items-center justify-center px-4 pointer-events-none z-30 transition-opacity duration-300 ${
                areControlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="pointer-events-auto bg-sidebar/90 backdrop-blur-md border border-border/80 rounded-full shadow-floating px-3 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3.5">
                {/* 1. Mute / Unmute Microphone */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2.5 sm:p-3 rounded-full cursor-pointer transition-transform active:scale-95 shadow-raised ${
                    isMicMuted
                      ? 'bg-danger-soft text-danger border border-danger/20'
                      : 'bg-surface hover:bg-surface-active text-text-primary'
                  }`}
                  title={isMicMuted ? 'Bật Mic (Unmute)' : 'Tắt Mic (Mute)'}
                >
                  {isMicMuted ? <MicrophoneSlash size={19} weight="bold" /> : <Microphone size={19} weight="bold" />}
                </button>

                {/* 2. Camera Toggle (Only for video calls) */}
                {isVideoCall && (
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`p-2.5 sm:p-3 rounded-full cursor-pointer transition-transform active:scale-95 shadow-raised ${
                      isCameraOff
                        ? 'bg-danger-soft text-danger border border-danger/20'
                        : 'bg-surface hover:bg-surface-active text-text-primary'
                    }`}
                    title={isCameraOff ? 'Bật Camera' : 'Tắt Camera'}
                  >
                    {isCameraOff ? <VideoCameraSlash size={19} weight="bold" /> : <VideoCamera size={19} weight="bold" />}
                  </button>
                )}

                {/* 3. Speaker Mute Toggle (Prevents howling/echo) */}
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  className={`p-2.5 sm:p-3 rounded-full cursor-pointer transition-transform active:scale-95 shadow-raised ${
                    isSpeakerMuted
                      ? 'bg-danger-soft text-danger border border-danger/20'
                      : 'bg-surface hover:bg-surface-active text-text-primary'
                  }`}
                  title={isSpeakerMuted ? 'Bật loa đối phương' : 'Tắt loa (Tránh rè/hú khi test gần)'}
                >
                  {isSpeakerMuted ? <SpeakerSlash size={19} weight="bold" /> : <SpeakerHigh size={19} weight="bold" />}
                </button>

                {/* 4. Screen Sharing Toggle */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  disabled={!isScreenShareSupported}
                  className={`p-2.5 sm:p-3 rounded-full transition-transform active:scale-95 shadow-raised ${
                    !isScreenShareSupported
                      ? 'opacity-40 cursor-not-allowed bg-surface text-text-muted'
                      : isScreenSharing
                        ? 'bg-accent-soft text-accent-primary border border-accent-primary/30 cursor-pointer'
                        : 'bg-surface hover:bg-surface-active text-text-primary cursor-pointer'
                  }`}
                  title={
                    !isScreenShareSupported
                      ? 'Chia sẻ màn hình chỉ hỗ trợ trên Desktop'
                      : isScreenSharing
                        ? 'Dừng chia sẻ màn hình'
                        : 'Chia sẻ màn hình'
                  }
                >
                  <Screencast size={19} weight="bold" />
                </button>

                {/* 5. Swap Stage Button (Quick access) */}
                {layoutMode === 'spotlight' && (
                  <button
                    type="button"
                    onClick={() => setIsSwapped((prev) => !prev)}
                    className="p-2.5 sm:p-3 rounded-full bg-surface hover:bg-surface-active text-text-primary cursor-pointer transition-transform active:scale-95 shadow-raised"
                    title="Hoán đổi màn hình chính/phụ"
                  >
                    <ArrowsClockwise size={19} weight="bold" />
                  </button>
                )}

                {/* Divider */}
                <div className="w-[1px] h-6 bg-border mx-0.5" />

                {/* 6. End Call Button */}
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="p-2.5 sm:p-3 rounded-full bg-danger hover:bg-danger-hover text-on-accent cursor-pointer transition-transform active:scale-95 shadow-floating"
                  title="Kết thúc cuộc gọi"
                >
                  <PhoneDisconnect size={20} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
