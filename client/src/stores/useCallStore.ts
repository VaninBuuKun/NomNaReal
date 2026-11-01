import { create } from 'zustand';
import type { CallPeer, CallOfferPayload, CallStatus } from '../types';

interface CallStoreState {
  callStatus: CallStatus;
  peer: CallPeer | null;
  isVideoCall: boolean;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeakerMuted: boolean;
  remoteVolume: number; // 0 to 1
  isFullScreen: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingOffer: CallOfferPayload | null;
  callDuration: number;
  error: string | null;

  // Actions
  setIncomingCall: (offer: CallOfferPayload) => void;
  setOutgoingCall: (peer: CallPeer, isVideo: boolean) => void;
  setConnecting: () => void;
  setConnected: (remoteStream?: MediaStream | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setIsVideoCall: (isVideo: boolean) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  setRemoteVolume: (vol: number) => void;
  setScreenSharing: (sharing: boolean) => void;
  toggleFullScreen: () => void;
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
  remoteVolume: 1,
  isFullScreen: false,
  localStream: null,
  remoteStream: null,
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
      incomingOffer: null,
      error: null,
      callDuration: 0,
    }),

  setConnecting: () =>
    set({
      callStatus: 'connecting',
      error: null,
    }),

  setConnected: (remoteStream) =>
    set((state) => ({
      callStatus: 'connected',
      remoteStream: remoteStream !== undefined ? remoteStream : state.remoteStream,
      error: null,
    })),

  setLocalStream: (stream) => set({ localStream: stream }),

  setRemoteStream: (stream) => set({ remoteStream: stream }),

  setIsVideoCall: (isVideo) => set({ isVideoCall: isVideo }),

  toggleMic: () =>
    set((state) => {
      const nextMuted = !state.isMicMuted;
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }
      return { isMicMuted: nextMuted };
    }),

  toggleCamera: () =>
    set((state) => {
      const nextOff = !state.isCameraOff;
      if (state.localStream) {
        state.localStream.getVideoTracks().forEach((track) => {
          track.enabled = !nextOff;
        });
      }
      return { isCameraOff: nextOff };
    }),

  toggleSpeaker: () =>
    set((state) => ({
      isSpeakerMuted: !state.isSpeakerMuted,
    })),

  setRemoteVolume: (vol) =>
    set({
      remoteVolume: Math.max(0, Math.min(1, vol)),
    }),

  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  toggleFullScreen: () =>
    set((state) => ({
      isFullScreen: !state.isFullScreen,
    })),

  setError: (err) => set({ error: err }),

  setDuration: (update) =>
    set((state) => ({
      callDuration: typeof update === 'function' ? update(state.callDuration) : update,
    })),

  resetCall: () => {
    set(initialState);
  },
}));
