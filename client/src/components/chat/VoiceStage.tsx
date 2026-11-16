import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SpeakerHigh,
  Microphone,
  MicrophoneSlash,
  Headphones,
  PhoneDisconnect,
  PhoneCall,
  Screencast,
  VideoCamera,
  VideoCameraSlash,
  ChatTeardropText,
  Users,
  Waveform,
  Sliders,
  ArrowsOutSimple,
  ArrowsInSimple,
  X,
  CornersOut,
  CornersIn,
  SquaresFour,
} from '@phosphor-icons/react';
import type { Channel, User, VoiceParticipant } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { UserAvatar } from '../ui/UserAvatar';
import { VideoPlayer } from '../call/VideoPlayer';

interface VoiceStageProps {
  currentChannel: Channel;
  currentUser: User | null;
  isChatOpen: boolean;
  onToggleChat: () => void;
  isMemberListOpen?: boolean;
  onToggleMemberList?: () => void;
  onLeaveVoice?: () => void;
}

const sameId = (a?: string | null, b?: string | null): boolean =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export const VoiceStage: React.FC<VoiceStageProps> = ({
  currentChannel,
  currentUser,
  isChatOpen,
  onToggleChat,
  isMemberListOpen = false,
  onToggleMemberList,
  onLeaveVoice,
}) => {
  const {
    connectedChannelId,
    isMuted,
    isDeafened,
    isScreenSharing,
    isCameraActive,
    participants,
    channelParticipantsMap,
    userVolumes,
    liveAudioLevel,
    localVideoStream,
    remoteStreams,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleScreenSharing,
    toggleCamera,
    setUserVolume,
  } = useVoiceStore();

  const [activeVolumeUserId, setActiveVolumeUserId] = useState<string | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [forceGridMode, setForceGridMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsHidden, setIsControlsHidden] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastAutoJoinedChannelRef = useRef<string | null>(null);
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnectedHere = sameId(connectedChannelId, currentChannel.id);

  // Auto-hide controls and header when idle in fullscreen
  const resetActivityTimer = useCallback(() => {
    setIsControlsHidden(false);
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    if (isFullscreen) {
      activityTimeoutRef.current = setTimeout(() => {
        // Do not auto-hide if volume adjustment or user input is actively focused
        if (!activeVolumeUserId) {
          setIsControlsHidden(true);
        }
      }, 2500);
    }
  }, [isFullscreen, activeVolumeUserId]);

  useEffect(() => {
    if (!isFullscreen) {
      setIsControlsHidden(false);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      return;
    }
    resetActivityTimer();
    return () => {
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [isFullscreen, resetActivityTimer]);

  // Auto-connect only when navigating into a new voice channel, preventing infinite reconnect after manual disconnect
  useEffect(() => {
    if (!currentUser) return;
    if (lastAutoJoinedChannelRef.current !== currentChannel.id) {
      lastAutoJoinedChannelRef.current = currentChannel.id;
      if (!sameId(connectedChannelId, currentChannel.id)) {
        void joinVoice(
          currentChannel.id,
          currentChannel.name || 'Kênh thoại',
          currentChannel.serverId || currentChannel.workspaceId || '',
          {
            id: currentUser.id,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
          }
        );
      }
    }
  }, [
    currentChannel.id,
    currentChannel.name,
    currentChannel.serverId,
    currentChannel.workspaceId,
    connectedChannelId,
    currentUser,
    joinVoice,
  ]);

  // Sync fullscreen state with document fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
      );

      if (!isCurrentlyFs) {
        const el = stageRef.current;
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any)?.webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        } else {
          // Fallback toggle for browsers/devices without native fullscreen API (e.g. iOS Safari)
          setIsFullscreen((prev) => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any)?.webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed, falling back to viewport mode:', err);
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  const handleJoinCurrentChannel = () => {
    if (!currentUser) return;
    void joinVoice(
      currentChannel.id,
      currentChannel.name || 'Kênh thoại',
      currentChannel.serverId || currentChannel.workspaceId || '',
      {
        id: currentUser.id,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      }
    );
  };

  const handleDisconnect = () => {
    leaveVoice();
    onLeaveVoice?.();
  };

  const chKey = currentChannel.id.toLowerCase();
  const stageParticipants: VoiceParticipant[] = isConnectedHere
    ? participants
    : channelParticipantsMap[chKey] || channelParticipantsMap[currentChannel.id] || [];

  const getParticipantStream = (p: VoiceParticipant): MediaStream | null => {
    if (!p.isScreenSharing && !p.isCameraActive) return null;
    if (sameId(p.userId, currentUser?.id)) {
      return localVideoStream;
    }
    const stream = remoteStreams[p.userId.toLowerCase()] ?? remoteStreams[p.userId] ?? null;
    if (stream && stream.getVideoTracks().length > 0) {
      return stream;
    }
    return null;
  };

  // Determine grid layout columns dynamically based on participant count
  const participantCount = Math.max(1, stageParticipants.length);
  const gridClasses =
    participantCount === 1
      ? 'grid-cols-1 max-w-sm sm:max-w-md'
      : participantCount === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl sm:max-w-3xl'
      : participantCount <= 4
      ? 'grid-cols-2 max-w-2xl sm:max-w-4xl'
      : participantCount <= 6
      ? 'grid-cols-2 sm:grid-cols-3 max-w-3xl sm:max-w-5xl'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-6xl';

  const hasActiveMedia = stageParticipants.some((p) => p.isScreenSharing || p.isCameraActive);

  // Reset forceGridMode when all media streams stop so next screen share automatically spotlights
  useEffect(() => {
    if (!hasActiveMedia) {
      setForceGridMode(false);
    }
  }, [hasActiveMedia]);

  const spotlightUser = forceGridMode
    ? null
    : stageParticipants.find((p) => sameId(p.userId, focusedUserId)) ||
      stageParticipants.find((p) => p.isScreenSharing || p.isCameraActive) ||
      null;

  const spotlightStream = spotlightUser ? getParticipantStream(spotlightUser) : null;

  return (
    <div
      ref={stageRef}
      onMouseMove={resetActivityTimer}
      onTouchStart={resetActivityTimer}
      onPointerDown={resetActivityTimer}
      className={`flex flex-col min-h-0 bg-chat select-none relative overflow-hidden transition-all duration-200 ${
        isFullscreen
          ? `fixed inset-0 z-50 w-screen h-screen ${isControlsHidden ? 'cursor-none' : 'cursor-default'}`
          : 'flex-1 w-full h-full'
      }`}
    >
      {/* 1. Header: Voice Room Title, Fullscreen, Member List & Chat Actions */}
      <div
        className={`h-[52px] sm:h-[54px] border-b border-border px-3 sm:px-5 flex items-center justify-between bg-sidebar/90 backdrop-blur-xl z-30 transition-all duration-300 ease-in-out ${
          isFullscreen ? 'absolute top-0 inset-x-0' : 'shrink-0'
        } ${
          isControlsHidden
            ? 'opacity-0 -translate-y-full pointer-events-none'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-control bg-surface border border-border flex items-center justify-center text-text-secondary shrink-0 shadow-2xs">
            <SpeakerHigh size={17} weight="bold" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-text-primary truncate">
              {currentChannel.name || 'Kênh thoại'}
            </h2>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-text-muted">
              <span>{stageParticipants.length} đang tham gia</span>
              {isConnectedHere && (
                <span className="flex items-center gap-1 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="hidden xs:inline">Đã kết nối</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`px-2 sm:px-2.5 py-1.5 rounded-control transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isFullscreen
                ? 'bg-surface-active text-text-primary border border-border'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title={isFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <ArrowsInSimple size={16} weight="bold" />
            ) : (
              <ArrowsOutSimple size={16} weight="bold" />
            )}
            <span className="hidden md:inline">
              {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            </span>
          </button>

          {/* Member List Toggle Button */}
          {onToggleMemberList && (
            <button
              type="button"
              onClick={onToggleMemberList}
              className={`px-2 sm:px-2.5 py-1.5 rounded-control transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isMemberListOpen
                  ? 'bg-surface-active text-text-primary border border-border'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
              }`}
              title={
                isMemberListOpen
                  ? 'Ẩn danh sách thành viên'
                  : 'Hiển thị danh sách thành viên'
              }
            >
              <Users size={16} weight={isMemberListOpen ? 'bold' : 'regular'} />
              <span className="hidden sm:inline">Thành viên ({stageParticipants.length})</span>
            </button>
          )}

          {/* Toggle In-Voice Text Chat Button */}
          <button
            type="button"
            onClick={onToggleChat}
            className={`px-2.5 sm:px-3 py-1.5 rounded-control transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isChatOpen
                ? 'bg-surface-active text-text-primary border border-border'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title={isChatOpen ? 'Đóng trò chuyện văn bản' : 'Mở trò chuyện văn bản'}
          >
            <ChatTeardropText size={16} weight={isChatOpen ? 'fill' : 'bold'} />
            <span className="hidden sm:inline">
              {isChatOpen ? 'Đang mở chat' : 'Trò chuyện'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main Voice Stage Viewport with Subtle Radial Glow */}
      <div
        className={`flex-1 flex flex-col min-h-0 justify-between overflow-hidden relative z-10 ${
          isFullscreen
            ? 'p-0 bg-rail'
            : 'p-2.5 sm:p-4 md:p-5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface/20 via-chat to-chat'
        }`}
      >
        {stageParticipants.length === 0 && !isConnectedHere ? (
          /* Empty Lobby State when disconnected and room is empty */
          <div className="w-full flex-1 flex flex-col items-center justify-center text-center max-w-sm sm:max-w-md mx-auto my-auto gap-4 p-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary shadow-raised">
              <SpeakerHigh size={32} weight="duotone" className="sm:text-4xl" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary">
                {currentChannel.name || 'Kênh thoại'}
              </h3>
              <p className="text-[11px] sm:text-xs text-text-muted mt-1 leading-relaxed">
                Chưa có ai trong phòng thoại này. Nhấn nút bên dưới để kết nối và trò chuyện ngay.
              </p>
            </div>
            <button
              type="button"
              onClick={handleJoinCurrentChannel}
              className="h-9 sm:h-10 px-5 rounded-full bg-accent-primary text-white hover:bg-accent-hover transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-raised active:scale-95"
            >
              <PhoneCall size={17} weight="bold" />
              <span>Tham gia kênh thoại</span>
            </button>
          </div>
        ) : spotlightUser ? (
          /* Spotlight Mode: Prioritizing Screen Sharing or Camera with Participant Filmstrip */
          <div
            className={`w-full flex-1 min-h-0 flex flex-col items-center justify-center max-h-full ${
              isFullscreen ? 'gap-0 p-0' : 'gap-2 sm:gap-3 my-auto'
            }`}
          >
            {/* Primary Showcase Viewport */}
            <div
              className={`w-full flex-1 min-h-0 bg-surface overflow-hidden relative flex flex-col items-center justify-center transition-all duration-200 ${
                isFullscreen
                  ? 'max-w-none max-h-none h-full rounded-none border-0'
                  : `max-w-7xl max-h-full rounded-card border shadow-raised ${
                      spotlightUser.isSpeaking
                        ? 'border-success ring-2 ring-success/60 shadow-[0_0_24px_rgba(34,197,94,0.22)]'
                        : 'border-border'
                    }`
              }`}
            >
              {spotlightStream ? (
                <VideoPlayer
                  stream={spotlightStream}
                  className={`w-full h-full ${
                    spotlightUser.isScreenSharing ? 'object-contain bg-rail' : 'object-cover'
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-active text-text-secondary flex items-center justify-center mb-2.5">
                    {spotlightUser.isScreenSharing ? (
                      <Screencast size={28} weight="bold" />
                    ) : (
                      <VideoCamera size={28} weight="bold" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-text-primary">
                    {spotlightUser.displayName}{' '}
                    {spotlightUser.isScreenSharing
                      ? 'đang chia sẻ màn hình'
                      : spotlightUser.isCameraActive
                      ? 'đang bật camera'
                      : 'đang trên sân khấu'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-text-muted mt-0.5">
                    {isConnectedHere
                      ? 'Đang đồng bộ luồng video trực tiếp...'
                      : 'Tham gia kênh thoại để xem phát trực tiếp'}
                  </p>
                </div>
              )}

              {/* Tag bottom-left with Speaking Highlight */}
              <div
                className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-control backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 z-10 transition-opacity duration-200 ${
                  isControlsHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
                } ${
                  spotlightUser.isSpeaking
                    ? 'bg-surface/95 border-success text-success shadow-raised'
                    : 'bg-surface/90 border-border text-text-primary shadow-raised'
                }`}
              >
                <span className="truncate max-w-[130px] sm:max-w-[200px]">
                  {spotlightUser.displayName}
                </span>
                {spotlightUser.isSpeaking && (
                  <Waveform size={13} weight="bold" className="text-success animate-pulse" />
                )}
                {spotlightUser.isMuted && (
                  <MicrophoneSlash size={12} weight="bold" className="text-danger" />
                )}
              </div>

              {/* Top-Right Showcase Controls: Return to Grid & Fullscreen Toggle */}
              <div
                className={`absolute ${
                  isFullscreen ? 'top-16' : 'top-3'
                } right-3 flex items-center gap-1.5 z-20 transition-all duration-200 ${
                  isControlsHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFocusedUserId(null);
                    setForceGridMode(true);
                  }}
                  className="px-2.5 py-1.5 rounded-control bg-surface/90 hover:bg-surface-active backdrop-blur-md border border-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-raised"
                  title="Chuyển về bố cục lưới"
                >
                  <SquaresFour size={15} weight="bold" />
                  <span className="hidden sm:inline">Dạng lưới</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-control bg-surface/90 hover:bg-surface-active backdrop-blur-md border border-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer shadow-raised"
                  title={isFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình luồng phát'}
                >
                  {isFullscreen ? (
                    <CornersIn size={15} weight="bold" />
                  ) : (
                    <CornersOut size={15} weight="bold" />
                  )}
                </button>
              </div>
            </div>

            {/* Compact Participant Filmstrip Under Showcase (Auto-hides in Fullscreen when idle) */}
            <div
              className={`flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-2 max-w-5xl w-full no-scrollbar transition-all duration-200 ${
                isFullscreen
                  ? `absolute bottom-16 z-20 justify-center ${
                      isControlsHidden ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'
                    }`
                  : 'shrink-0'
              }`}
            >
              {stageParticipants.map((p) => {
                const isFocused = sameId(p.userId, spotlightUser.userId);
                return (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => {
                      if (isFocused) {
                        setFocusedUserId(null);
                        setForceGridMode(true);
                      } else {
                        setForceGridMode(false);
                        setFocusedUserId(p.userId);
                      }
                    }}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border transition-all cursor-pointer shrink-0 shadow-raised ${
                      isFocused
                        ? 'border-accent-primary ring-1 ring-accent-primary/60 bg-surface-active'
                        : p.isSpeaking
                        ? 'border-success ring-1 ring-success/60 bg-surface-active'
                        : 'border-border hover:border-border-hover'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        name={p.displayName}
                        avatarUrl={p.avatarUrl}
                        size="sm"
                        roundedClassName="rounded-full"
                        className={
                          p.isSpeaking
                            ? 'ring-2 ring-success ring-offset-1 ring-offset-surface'
                            : ''
                        }
                      />
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-semibold truncate max-w-[70px] sm:max-w-[110px] ${
                        p.isSpeaking ? 'text-success' : 'text-text-primary'
                      }`}
                    >
                      {p.displayName}
                    </span>
                    {p.isSpeaking && (
                      <Waveform
                        size={12}
                        weight="bold"
                        className="text-success animate-pulse shrink-0"
                      />
                    )}
                    {p.isMuted && (
                      <MicrophoneSlash size={11} weight="bold" className="text-danger shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Adaptive Grid Layout with Prominent Green Speaking Rings */
          <div className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center my-auto p-1">
            <div className={`w-full grid gap-2.5 sm:gap-4 md:gap-5 justify-center ${gridClasses}`}>
              {stageParticipants.map((p) => {
                const isMe = sameId(p.userId, currentUser?.id);
                const volume = userVolumes[p.userId] ?? userVolumes[p.userId.toLowerCase()] ?? 100;
                const isVolumeOpen = activeVolumeUserId === p.userId;
                const tileStream = getParticipantStream(p);

                return (
                  <div
                    key={p.userId}
                    onClick={() => {
                      setForceGridMode(false);
                      setFocusedUserId(p.userId);
                    }}
                    className={`relative group flex flex-col items-center justify-center p-3.5 sm:p-5 md:p-6 rounded-card border transition-all duration-200 min-h-[140px] sm:min-h-[180px] md:min-h-[210px] shadow-raised overflow-hidden bg-surface cursor-pointer ${
                      p.isSpeaking
                        ? 'border-success/80 ring-2 ring-success/30 shadow-[0_0_24px_rgba(34,197,94,0.22)] bg-surface-active/50'
                        : 'border-border hover:border-border-hover'
                    }`}
                  >
                    {/* Live Video Stream inside Tile if active */}
                    {tileStream && (
                      <div className="absolute inset-0 z-0">
                        <VideoPlayer stream={tileStream} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Participant Avatar with Green Speaking Glow Ring */}
                    {!tileStream && (
                      <div className="relative mb-2 sm:mb-3 flex items-center justify-center z-10">
                        <div
                          className={`rounded-full transition-all duration-200 p-1 ${
                            p.isSpeaking
                              ? 'ring-3 ring-success ring-offset-2 ring-offset-surface shadow-[0_0_16px_rgba(34,197,94,0.4)]'
                              : 'ring-1 ring-border'
                          }`}
                        >
                          <UserAvatar
                            name={p.displayName}
                            avatarUrl={p.avatarUrl}
                            size="2xl"
                            roundedClassName="rounded-full"
                            className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 shadow-raised transition-transform duration-200"
                          />
                        </div>

                        {/* Live microphone level wave indicator (Self only) */}
                        {isMe && !isMuted && liveAudioLevel > 0.05 && (
                          <div className="absolute -bottom-1.5 flex items-center gap-0.5 bg-surface px-1.5 py-0.5 rounded-full border border-border text-success text-[10px] shadow-xs">
                            <Waveform size={12} weight="bold" className="animate-pulse" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Badges in Tile Top-Right */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 sm:gap-1.5 z-10">
                      {p.isMuted && (
                        <span
                          className="p-1 sm:p-1.5 rounded-full bg-danger-soft text-danger border border-danger/20 shadow-raised"
                          title="Microphone đang tắt"
                        >
                          <MicrophoneSlash size={13} weight="bold" />
                        </span>
                      )}
                      {p.isDeafened && (
                        <span
                          className="p-1 sm:p-1.5 rounded-full bg-danger-soft text-danger border border-danger/20 shadow-raised"
                          title="Đã tắt âm thanh"
                        >
                          <Headphones size={13} weight="fill" />
                        </span>
                      )}
                      {p.isScreenSharing && (
                        <span
                          className="p-1 sm:p-1.5 rounded-full bg-surface-active text-text-primary border border-border shadow-raised"
                          title="Đang chia sẻ màn hình"
                        >
                          <Screencast size={13} weight="bold" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForceGridMode(false);
                          setFocusedUserId(p.userId);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 rounded-control bg-surface/90 text-text-muted hover:text-text-primary border border-border transition-opacity cursor-pointer shadow-raised"
                        title="Phóng to ô này lên sân khấu"
                      >
                        <CornersOut size={13} weight="bold" />
                      </button>
                    </div>

                    {/* Translucent Bottom Tag with Green Speaking Pill */}
                    <div className="w-full mt-auto px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-control bg-chat/90 backdrop-blur-md border border-border flex items-center justify-between text-xs font-semibold z-10">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-text-primary truncate font-bold max-w-[110px] sm:max-w-[160px]">
                          {p.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-text-muted font-normal shrink-0">
                            (bạn)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isSpeaking && (
                          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-success bg-success/15 px-1.5 sm:px-2 py-0.5 rounded-full border border-success/30 animate-pulse">
                            <Waveform size={12} weight="bold" />
                            <span className="hidden sm:inline">Đang nói</span>
                          </span>
                        )}

                        {/* Volume Adjuster Button for Remote Participants */}
                        {!isMe && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveVolumeUserId(isVolumeOpen ? null : p.userId)
                            }
                            className="p-1 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                            title="Điều chỉnh âm lượng người này"
                          >
                            <Sliders size={13} weight="bold" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Popover slider to tune per-user volume */}
                    {isVolumeOpen && !isMe && (
                      <div className="absolute inset-x-2.5 bottom-11 sm:bottom-12 p-3 rounded-card bg-surface/98 backdrop-blur-md border border-border shadow-floating z-30 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-text-primary">Âm lượng</span>
                          <span className="font-mono text-text-secondary font-bold">{volume}%</span>
                          <button
                            type="button"
                            onClick={() => setActiveVolumeUserId(null)}
                            className="p-0.5 text-text-muted hover:text-text-primary"
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={volume}
                          onChange={(e) =>
                            setUserVolume(p.userId, Number(e.target.value))
                          }
                          className="w-full accent-accent-primary cursor-pointer h-1.5 bg-surface-active rounded-control"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Floating Bottom Controls Dock with Safe-Area Inset Support */}
        <div
          className={`flex justify-center pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 z-30 px-2 max-w-full transition-all duration-300 ease-in-out ${
            isFullscreen ? 'absolute bottom-0 inset-x-0 pointer-events-none' : 'shrink-0'
          } ${
            isControlsHidden
              ? 'opacity-0 translate-y-full pointer-events-none'
              : 'opacity-100 translate-y-0'
          }`}
        >
          {isConnectedHere ? (
            <div className="pointer-events-auto h-11 sm:h-[52px] px-2.5 sm:px-4 rounded-full bg-surface/95 backdrop-blur-xl border border-border shadow-floating inline-flex items-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto no-scrollbar">
              {/* Mic Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isMuted
                    ? 'bg-danger text-white hover:bg-danger-hover shadow-raised'
                    : 'bg-surface hover:bg-surface-active text-text-primary border border-border'
                }`}
                title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
              >
                {isMuted ? (
                  <MicrophoneSlash size={16} weight="bold" className="sm:text-lg" />
                ) : (
                  <Microphone size={16} weight="bold" className="sm:text-lg" />
                )}
              </button>

              {/* Deafen Toggle */}
              <button
                type="button"
                onClick={toggleDeafen}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDeafened
                    ? 'bg-danger text-white hover:bg-danger-hover shadow-raised'
                    : 'bg-surface hover:bg-surface-active text-text-primary border border-border'
                }`}
                title={isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
              >
                <Headphones size={16} weight={isDeafened ? 'fill' : 'bold'} className="sm:text-lg" />
                {isDeafened && (
                  <span
                    className="absolute w-4 sm:w-[18px] h-[2px] bg-white rotate-45 rounded-full pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </button>

              {/* Video Camera Toggle */}
              <button
                type="button"
                onClick={toggleCamera}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isCameraActive
                    ? 'bg-surface-active text-text-primary border border-border-hover shadow-raised'
                    : 'bg-surface hover:bg-surface-active text-text-primary border border-border'
                }`}
                title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
              >
                {isCameraActive ? (
                  <VideoCamera size={16} weight="bold" className="sm:text-lg" />
                ) : (
                  <VideoCameraSlash size={16} weight="bold" className="sm:text-lg" />
                )}
              </button>

              {/* Screen Share Toggle */}
              <button
                type="button"
                onClick={toggleScreenSharing}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isScreenSharing
                    ? 'bg-surface-active text-text-primary border border-border-hover shadow-raised'
                    : 'bg-surface hover:bg-surface-active text-text-primary border border-border'
                }`}
                title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
              >
                <Screencast size={16} weight="bold" className="sm:text-lg" />
              </button>

              {/* Fullscreen Quick Toggle */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-surface hover:bg-surface-active text-text-primary border border-border transition-all cursor-pointer shrink-0"
                title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              >
                {isFullscreen ? (
                  <ArrowsInSimple size={16} weight="bold" />
                ) : (
                  <ArrowsOutSimple size={16} weight="bold" />
                )}
              </button>

              {/* Divider */}
              <div className="w-px h-4 sm:h-5 bg-border mx-0.5 shrink-0" />

              {/* RED Disconnect Button */}
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-8 px-3 sm:h-9 sm:px-4 rounded-full bg-danger text-white hover:bg-danger-hover transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-raised active:scale-95 shrink-0"
                title="Ngắt kết nối phòng thoại"
              >
                <PhoneDisconnect size={16} weight="bold" className="sm:text-lg" />
                <span className="hidden xs:inline">Ngắt kết nối</span>
              </button>
            </div>
          ) : stageParticipants.length > 0 ? (
            <button
              type="button"
              onClick={handleJoinCurrentChannel}
              className="pointer-events-auto h-9 sm:h-10 px-5 rounded-full bg-accent-primary text-white hover:bg-accent-hover transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-floating active:scale-95"
            >
              <PhoneCall size={17} weight="bold" />
              <span>Tham gia kênh thoại</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
