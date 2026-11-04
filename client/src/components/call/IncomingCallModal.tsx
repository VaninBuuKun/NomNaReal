import React from 'react';
import { Phone, PhoneDisconnect, VideoCamera } from '@phosphor-icons/react';
import { useCallStore } from '../../stores/useCallStore';
import { webrtcService } from '../../services/webrtc';
import { Avatar } from '../ui/Avatar';

export const IncomingCallModal: React.FC = () => {
  const { callStatus, peer, isVideoCall } = useCallStore();

  if (callStatus !== 'incoming' || !peer) {
    return null;
  }

  const handleAccept = async () => {
    await webrtcService.acceptCall();
  };

  const handleReject = async () => {
    await webrtcService.rejectCall('Người nhận đã từ chối cuộc gọi');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-chat border border-border rounded-modal shadow-modal p-6 w-full max-w-sm flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Ambient background glow */}
        <div className="absolute top-0 inset-x-0 h-24 bg-accent-soft/40 pointer-events-none blur-2xl" />

        {/* Pulsing Avatar Container */}
        <div className="relative mb-4 mt-2">
          <div className="absolute -inset-3 rounded-full bg-accent-primary/20 animate-ping opacity-75" />
          <div className="relative">
            <Avatar
              src={peer.avatarUrl}
              fallback={peer.displayName}
              size="xl"
            />
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-base font-bold text-text-primary truncate max-w-full px-2">
          {peer.displayName}
        </h3>
        <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5 justify-center">
          {isVideoCall ? (
            <>
              <VideoCamera size={15} weight="bold" className="text-accent-primary" />
              <span>Đang gọi video cho bạn...</span>
            </>
          ) : (
            <>
              <Phone size={15} weight="bold" className="text-accent-primary" />
              <span>Đang gọi thoại cho bạn...</span>
            </>
          )}
        </p>

        {/* Action Buttons: Decline & Accept */}
        <div className="flex items-center gap-6 mt-6">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleReject}
              className="w-13 h-13 rounded-full bg-danger hover:bg-danger-hover text-on-accent flex items-center justify-center shadow-floating transition-transform active:scale-95 cursor-pointer"
              title="Từ chối cuộc gọi"
            >
              <PhoneDisconnect size={24} weight="bold" />
            </button>
            <span className="text-[11px] font-medium text-text-muted">Từ chối</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleAccept}
              className="w-13 h-13 rounded-full bg-success hover:bg-success-hover text-on-accent flex items-center justify-center shadow-floating transition-transform active:scale-95 cursor-pointer"
              title="Trả lời"
            >
              {isVideoCall ? (
                <VideoCamera size={24} weight="bold" />
              ) : (
                <Phone size={24} weight="bold" />
              )}
            </button>
            <span className="text-[11px] font-medium text-text-muted">Trả lời</span>
          </div>
        </div>
      </div>
    </div>
  );
};
