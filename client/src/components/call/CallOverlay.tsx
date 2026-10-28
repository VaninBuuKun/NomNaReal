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
    localStream,
    remoteStream,
    callDuration,
    setDuration,
    toggleMic,
    toggleCamera,
    error,
  } = useCallStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind local media stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isMinimized]);

  // Bind remote media stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isMinimized]);

  // Run duration timer when connected
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus, setDuration]);

  if (callStatus !== 'outgoing' && callStatus !== 'connected') {
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

  // Has remote stream delivered video?
  const hasRemoteVideo = Boolean(
    remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled)
  );

  // ---------------------------------------------------------------------------
  // 1. Minimized PiP View (Floating widget in bottom right)
  // ---------------------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-[160] w-80 bg-sidebar border border-border rounded-card shadow-floating p-3 flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-150 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={peer?.avatarUrl} fallback={peer?.displayName || 'User'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{peer?.displayName}</p>
              <p className="text-[11px] text-text-muted">
                {callStatus === 'connected' ? formatDuration(callDuration) : 'Đang kết nối...'}
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
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
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
            onClick={handleEndCall}
            className="p-2 rounded-full bg-danger hover:bg-danger-hover text-on-accent cursor-pointer transition-colors"
            title="Kết thúc cuộc gọi"
          >
            <PhoneDisconnect size={16} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Full Call Stage Overlay (Discord-style)
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[150] bg-overlay backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[86vh] bg-chat border border-border rounded-modal shadow-modal flex flex-col overflow-hidden relative">
        {/* Top Bar: Caller Info, Duration & Minimize */}
        <div className="h-14 px-5 border-b border-border bg-sidebar/80 flex items-center justify-between shrink-0 z-20">
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
                ) : (
                  <span className="text-text-muted animate-pulse">Đang đổ chuông...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Center Stage: Video / Avatar Area */}
        <div className="flex-1 relative bg-rail overflow-hidden flex items-center justify-center">
          {/* Main Remote View */}
          {callStatus === 'connected' && hasRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-rail"
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
        <div className="h-20 px-6 bg-sidebar/95 border-t border-border flex items-center justify-center gap-4 shrink-0 z-20">
          {/* 1. Mute / Unmute Microphone */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3.5 rounded-full cursor-pointer transition-colors shadow-raised ${
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
              className={`p-3.5 rounded-full cursor-pointer transition-colors shadow-raised ${
                isCameraOff
                  ? 'bg-danger-soft text-danger border border-danger/20'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isCameraOff ? 'Bật Camera' : 'Tắt Camera'}
            >
              {isCameraOff ? <VideoCameraSlash size={20} weight="bold" /> : <VideoCamera size={20} weight="bold" />}
            </button>
          )}

          {/* 3. Screen Sharing Toggle */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`p-3.5 rounded-full cursor-pointer transition-colors shadow-raised ${
              isScreenSharing
                ? 'bg-accent-soft text-accent-primary border border-accent-primary/30'
                : 'bg-surface hover:bg-surface-active text-text-primary'
            }`}
            title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
          >
            <Screencast size={20} weight="bold" />
          </button>

          {/* 4. End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-3.5 rounded-full bg-danger hover:bg-danger-hover text-on-accent cursor-pointer transition-transform active:scale-95 shadow-floating"
            title="Kết thúc cuộc gọi"
          >
            <PhoneDisconnect size={20} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
