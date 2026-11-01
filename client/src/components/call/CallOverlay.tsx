import React, { useEffect, useRef, useState } from 'react';
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
  Info,
} from '@phosphor-icons/react';
import { useCallStore } from '../../stores/useCallStore';
import { webrtcService } from '../../services/webrtc';
import { Avatar } from '../ui/Avatar';

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

  const [isMinimized, setIsMinimized] = useState(false);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);
  const [showAcousticHint, setShowAcousticHint] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Bind local media stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isMinimized]);

  // Bind remote media stream to both remote video (muted) and dedicated audio element
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
            .then(() => {
              setIsAudioAutoplayBlocked(false);
            })
            .catch((err) => {
              console.warn('Audio auto-play prevented by browser:', err);
              setIsAudioAutoplayBlocked(true);
            });
        }
      }
    }
  }, [remoteStream, isMinimized, isSpeakerMuted, remoteVolume]);

  // Sync speaker muted state directly to audio element
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  // Run duration timer strictly when connected
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus, setDuration]);

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

  const isScreenShareSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  // Check if remote stream has active video track
  const hasRemoteVideo = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().length > 0 &&
      remoteStream.getVideoTracks().some((t) => t.enabled)
  );

  return (
    <>
      {/* 
        Persistent dedicated audio element for the remote voice stream.
        Placed outside any conditional view rendering to prevent unmounting when minimizing.
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
      {/* 1. Minimized PiP View (Floating widget in bottom right)               */}
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
                ref={remoteVideoRef}
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
        /* 2. Full Call Stage Overlay (Discord-style)                             */
        /* --------------------------------------------------------------------- */
        <div className="fixed inset-0 z-[150] bg-overlay backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
          <div
            className={`w-full bg-chat border border-border shadow-modal flex flex-col overflow-hidden relative transition-all duration-200 ${
              isFullScreen
                ? 'h-full max-w-full rounded-none'
                : 'max-w-5xl h-[88vh] rounded-modal'
            }`}
          >
            {/* Top Bar: Caller Info, Duration & Controls */}
            <div className="h-14 px-4 sm:px-5 border-b border-border bg-sidebar/80 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="sm" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text-primary truncate">{peer?.displayName}</h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {callStatus === 'connected' ? (
                      <span className="flex items-center gap-1.5 text-success font-medium">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        {formatDuration(callDuration)}
                      </span>
                    ) : callStatus === 'connecting' ? (
                      <span className="text-accent-primary animate-pulse font-medium">
                        Đang thiết lập kết nối P2P...
                      </span>
                    ) : (
                      <span className="text-text-muted animate-pulse">Đang đổ chuông...</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Fullscreen toggle for screen share / video */}
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="p-2 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                  title={isFullScreen ? 'Thu nhỏ giao diện' : 'Toàn màn hình'}
                >
                  {isFullScreen ? <CornersIn size={18} weight="bold" /> : <CornersOut size={18} weight="bold" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                  title="Thu nhỏ để tiếp tục chat"
                >
                  <ArrowsInSimple size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* Error notification banner if any */}
            {error && (
              <div className="px-4 py-2 bg-danger-soft text-danger text-xs font-medium text-center border-b border-danger/20 shrink-0">
                {error}
              </div>
            )}

            {/* Acoustic Feedback Prevention Notice (Helpful when testing 2 devices in same room) */}
            {showAcousticHint && callStatus === 'connected' && (
              <div className="px-4 py-1.5 bg-accent-soft/60 border-b border-accent-primary/20 flex items-center justify-between text-[11px] text-text-muted shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Info size={15} weight="bold" className="text-accent-primary shrink-0" />
                  <span className="truncate">
                    Mẹo: Nếu để máy tính & điện thoại gần nhau trong cùng phòng, hãy tắt loa một bên (nút Loa bên dưới) hoặc đeo tai nghe để tránh bị rè/hú vòng lặp.
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

            {/* Center Stage: Video / Avatar Area */}
            <div className="flex-1 relative bg-rail overflow-hidden flex items-center justify-center">
              {/* Main Remote View */}
              {callStatus === 'connected' && hasRemoteVideo ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full bg-rail ${isFullScreen ? 'object-contain' : 'object-contain'}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    {callStatus === 'outgoing' && (
                      <div className="absolute -inset-4 rounded-full bg-accent-primary/20 animate-ping opacity-60" />
                    )}
                    <Avatar
                      src={peer?.avatarUrl}
                      fallback={peer?.displayName || 'User'}
                      size="xl"
                    />
                  </div>
                  <h4 className="text-base font-bold text-text-primary">{peer?.displayName}</h4>
                  <p className="text-xs text-text-muted">
                    {callStatus === 'outgoing'
                      ? 'Đang đổ chuông, vui lòng chờ đối phương nhấc máy...'
                      : callStatus === 'connecting'
                        ? 'Đang bắt tay kết nối thiết bị truyền thông...'
                        : 'Đã kết nối • Camera đối phương đang tắt'}
                  </p>
                </div>
              )}

              {/* Picture-in-Picture Local Video Box (Bottom-Right) */}
              {isVideoCall && (
                <div className="absolute bottom-5 right-5 w-44 sm:w-56 aspect-video bg-sidebar border border-border rounded-control shadow-floating overflow-hidden z-10 flex items-center justify-center">
                  {!isCameraOff && localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-text-muted p-2">
                      <VideoCameraSlash size={22} weight="bold" />
                      <span className="text-[11px] font-medium">Camera đã tắt</span>
                    </div>
                  )}
                  {isScreenSharing && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-control bg-accent-primary text-on-accent text-[10px] font-semibold flex items-center gap-1">
                      <Screencast size={12} weight="bold" />
                      <span>Đang chia sẻ</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Floating Control Bar */}
            <div className="h-20 px-4 sm:px-6 bg-sidebar/95 border-t border-border flex items-center justify-center gap-3 sm:gap-4 shrink-0 z-20">
              {/* 1. Mute / Unmute Microphone */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 sm:p-3.5 rounded-full cursor-pointer transition-colors shadow-raised ${
                  isMicMuted
                    ? 'bg-danger-soft text-danger border border-danger/20'
                    : 'bg-surface hover:bg-surface-active text-text-primary'
                }`}
                title={isMicMuted ? 'Bật Mic (Unmute)' : 'Tắt Mic (Mute)'}
              >
                {isMicMuted ? <MicrophoneSlash size={20} weight="bold" /> : <Microphone size={20} weight="bold" />}
              </button>

              {/* 2. Camera Toggle (Only for video calls) */}
              {isVideoCall && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-3 sm:p-3.5 rounded-full cursor-pointer transition-colors shadow-raised ${
                    isCameraOff
                      ? 'bg-danger-soft text-danger border border-danger/20'
                      : 'bg-surface hover:bg-surface-active text-text-primary'
                  }`}
                  title={isCameraOff ? 'Bật Camera' : 'Tắt Camera'}
                >
                  {isCameraOff ? <VideoCameraSlash size={20} weight="bold" /> : <VideoCamera size={20} weight="bold" />}
                </button>
              )}

              {/* 3. Speaker Mute Toggle (Prevents howling/re when testing devices near each other) */}
              <button
                type="button"
                onClick={toggleSpeaker}
                className={`p-3 sm:p-3.5 rounded-full cursor-pointer transition-colors shadow-raised ${
                  isSpeakerMuted
                    ? 'bg-danger-soft text-danger border border-danger/20'
                    : 'bg-surface hover:bg-surface-active text-text-primary'
                }`}
                title={isSpeakerMuted ? 'Bật loa đối phương' : 'Tắt loa (Tránh tiếng rè/hú khi test gần)'}
              >
                {isSpeakerMuted ? <SpeakerSlash size={20} weight="bold" /> : <SpeakerHigh size={20} weight="bold" />}
              </button>

              {/* 4. Screen Sharing Toggle */}
              <button
                type="button"
                onClick={handleToggleScreenShare}
                disabled={!isScreenShareSupported}
                className={`p-3 sm:p-3.5 rounded-full transition-colors shadow-raised ${
                  !isScreenShareSupported
                    ? 'opacity-40 cursor-not-allowed bg-surface text-text-muted'
                    : isScreenSharing
                      ? 'bg-accent-soft text-accent-primary border border-accent-primary/30 cursor-pointer'
                      : 'bg-surface hover:bg-surface-active text-text-primary cursor-pointer'
                }`}
                title={
                  !isScreenShareSupported
                    ? 'Chia sẻ màn hình chỉ hỗ trợ trên máy tính (Desktop)'
                    : isScreenSharing
                      ? 'Dừng chia sẻ màn hình'
                      : 'Chia sẻ màn hình'
                }
              >
                <Screencast size={20} weight="bold" />
              </button>

              {/* 5. End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="p-3 sm:p-3.5 rounded-full bg-danger hover:bg-danger-hover text-on-accent cursor-pointer transition-transform active:scale-95 shadow-floating"
                title="Kết thúc cuộc gọi"
              >
                <PhoneDisconnect size={20} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
