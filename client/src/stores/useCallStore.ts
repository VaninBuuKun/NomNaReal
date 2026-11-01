import { create } from 'zustand';
import type { CallPeer, CallOfferPayload, CallStatus } from '../types';

/** Media state the remote peer reports over the WebRTC data channel. */
export interface RemoteMediaState {
  cameraOff: boolean;
  micMuted: boolean;
  screenSharing: boolean;
}

const initialRemoteMedia: RemoteMediaState = {
  cameraOff: false,
  micMuted: false,
  screenSharing: false,
};

interface CallStoreState {
  callStatus: CallStatus;
  peer: CallPeer | null;
  isVideoCall: boolean;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeakerMuted: boolean;
  /** Stable MediaStream (camera + mic). Never replaced by the screen-share stream. */
  localStream: MediaStream | null;
  /** Stable MediaStream that accumulates remote tracks. */
  remoteStream: MediaStream | null;
  /** Bumped whenever a remote track is added / muted / unmuted / ended so React re-renders. */
  remoteTrackVersion: number;
  remoteMedia: RemoteMediaState;
  incomingOffer: CallOfferPayload | null;
  callDuration: number;
  error: string | null;

  // Actions
  setIncomingCall: (offer: CallOfferPayload) => void;
  setOutgoingCall: (peer: CallPeer, isVideo: boolean) => void;
  setConnecting: () => void;
  setConnected: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  bumpRemoteTrackVersion: () => void;
  setRemoteMedia: (media: Partial<RemoteMediaState>) => void;
  setCameraOff: (isOff: boolean) => void;
  setMicMuted: (muted: boolean) => void;
  toggleSpeaker: () => void;
  setScreenSharing: (sharing: boolean) => void;
  setError: (err: string | null) => void;
  setDuration: (duration: number | ((prev: number) => number)) => void;
  resetCall: () => void;
}

const initialState = {
  callStatus: 'idle' as CallStatus,
  peer: null,
  isVideoCall: true,
  isMicMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isSpeakerMuted: false,
  localStream: null,
  remoteStream: null,
  remoteTrackVersion: 0,
  remoteMedia: initialRemoteMedia,
  incomingOffer: null,
  callDuration: 0,
  error: null,
};

export const useCallStore = create<CallStoreState>((set) => ({
  ...initialState,

  setIncomingCall: (offer) =>
    set({
      callStatus: 'incoming',
      incomingOffer: offer,
      isVideoCall: offer.isVideoCall,
      isCameraOff: !offer.isVideoCall,
      peer: {
        id: offer.callerId,
        displayName: offer.callerName,
        avatarUrl: offer.callerAvatar,
      },
      error: null,
    }),

  setOutgoingCall: (peer, isVideo) =>
    set({
      callStatus: 'outgoing',
      peer,
      isVideoCall: isVideo,
      isCameraOff: !isVideo,
      incomingOffer: null,
      error: null,
      callDuration: 0,
    }),

  setConnecting: () => set({ callStatus: 'connecting' }),

  setConnected: () =>
    set((state) => (state.callStatus === 'connected' ? state : { callStatus: 'connected' })),

  setLocalStream: (stream) => set({ localStream: stream }),

  setRemoteStream: (stream) => set({ remoteStream: stream }),

  bumpRemoteTrackVersion: () => set((state) => ({ remoteTrackVersion: state.remoteTrackVersion + 1 })),

  setRemoteMedia: (media) => set((state) => ({ remoteMedia: { ...state.remoteMedia, ...media } })),

  setCameraOff: (isOff) => set({ isCameraOff: isOff }),

  setMicMuted: (muted) => set({ isMicMuted: muted }),

  toggleSpeaker: () => set((state) => ({ isSpeakerMuted: !state.isSpeakerMuted })),

  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  setError: (err) => set({ error: err }),

  setDuration: (update) =>
    set((state) => ({
      callDuration: typeof update === 'function' ? update(state.callDuration) : update,
    })),

  resetCall: () => {
    set((state) => ({
      ...initialState,
      // Keep a reject / failure message visible after the session is torn down
      error: state.error,
    }));
  },
}));
