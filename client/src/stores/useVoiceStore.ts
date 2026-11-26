import { create } from 'zustand';
import type {
  VoiceParticipant,
  VoiceStateChangedPayload,
  VoiceUserLeftPayload,
  VoiceSignalPayload,
} from '../types';
import { signalRService } from '../services/signalr';
import { webrtcService } from '../services/webrtc';
import { useCallStore } from './useCallStore';

interface VoiceStoreState {
  currentUserId: string | null;
  connectedChannelId: string | null;
  connectedChannelName: string | null;
  connectedServerId: string | null;
  connectedWorkspaceId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isCameraActive: boolean;
  isTextChatOpen: boolean;
  pingMs: number;
  participants: VoiceParticipant[];
  channelParticipantsMap: Record<string, VoiceParticipant[]>;
  userVolumes: Record<string, number>;
  liveAudioLevel: number;
  localVideoStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteStreamVersion: number;

  // Actions
  initVoiceListeners: () => void;
  syncServerVoiceParticipants: (serverId: string) => Promise<void>;
  joinVoice: (
    channelId: string,
    channelName: string,
    serverId: string,
    user: { id: string; displayName: string; avatarUrl?: string | null }
  ) => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleSpeaking: () => void;
  toggleScreenSharing: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleTextChat: () => void;
  setTextChatOpen: (open: boolean) => void;
  setUserVolume: (userId: string, volume: number) => void;
}

const sameId = (a?: string | null, b?: string | null): boolean =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

const normId = (id: string): string => id.toLowerCase();

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl = (import.meta.env.VITE_TURN_URL as string | undefined)?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(',').map((u) => u.trim()),
      username: (import.meta.env.VITE_TURN_USERNAME as string | undefined) ?? '',
      credential: (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) ?? '',
    });
  }
  return servers;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: buildIceServers(),
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

interface PeerAudioPipeline {
  audioEl: HTMLAudioElement;
  sourceNode?: MediaStreamAudioSourceNode;
  gainNode?: GainNode;
}

// Media hardware & WebRTC mesh state kept in module closure
let localMediaStream: MediaStream | null = null;
let screenStream: MediaStream | null = null;
let cameraStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let vadAnimationFrame: number | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;
let pingStatsInterval: ReturnType<typeof setInterval> | null = null;
let listenersInitialized = false;

const peerConnections = new Map<string, RTCPeerConnection>();
const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
const peerAudioPipelines = new Map<string, PeerAudioPipeline>();

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext || audioContext.state === 'closed') {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioContext = new Ctx();
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Plays a distinct, Discord-like two-tone synthesized sound cue for voice join, leave, peer-join, peer-leave, mute, or deafen actions.
 */
function playVoiceSoundCue(kind: 'join' | 'leave' | 'peer-join' | 'peer-leave' | 'mute' | 'unmute') {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const scheduleNote = (
      freq: number,
      startTime: number,
      duration: number,
      peakGain = 0.14,
      type: OscillatorType = 'sine'
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    };

    const now = ctx.currentTime;

    if (kind === 'join') {
      // Bright ascending major-third chime (F5 -> A5)
      scheduleNote(698.46, now, 0.09, 0.15, 'triangle');
      scheduleNote(880.0, now + 0.075, 0.16, 0.16, 'triangle');
    } else if (kind === 'peer-join') {
      // Soft ascending chime when another user joins the active voice room (E5 -> G#5)
      scheduleNote(659.25, now, 0.08, 0.11, 'sine');
      scheduleNote(830.61, now + 0.07, 0.14, 0.12, 'sine');
    } else if (kind === 'leave') {
      // Warm descending chime when disconnecting (A5 -> D5)
      scheduleNote(880.0, now, 0.09, 0.14, 'triangle');
      scheduleNote(587.33, now + 0.075, 0.17, 0.15, 'triangle');
    } else if (kind === 'peer-leave') {
      // Soft descending chime when another user leaves the active voice room (G5 -> D5)
      scheduleNote(783.99, now, 0.08, 0.11, 'sine');
      scheduleNote(587.33, now + 0.07, 0.14, 0.11, 'sine');
    } else if (kind === 'mute') {
      // Crisp double low tap
      scheduleNote(480, now, 0.055, 0.1, 'sine');
      scheduleNote(360, now + 0.05, 0.07, 0.1, 'sine');
    } else {
      // Crisp double high tap
      scheduleNote(360, now, 0.055, 0.1, 'sine');
      scheduleNote(520, now + 0.05, 0.07, 0.1, 'sine');
    }
  } catch {
    // Ignore audio cue errors
  }
}

function getActiveLocalVideoTrack(): MediaStreamTrack | null {
  const screenTrack = screenStream?.getVideoTracks()[0];
  if (screenTrack && screenTrack.readyState === 'live') return screenTrack;
  const camTrack = cameraStream?.getVideoTracks()[0];
  if (camTrack && camTrack.readyState === 'live') return camTrack;
  return null;
}

function getActiveLocalVideoStream(): MediaStream | null {
  if (screenStream && screenStream.getVideoTracks().length > 0) return screenStream;
  if (cameraStream && cameraStream.getVideoTracks().length > 0) return cameraStream;
  return null;
}

async function replaceVideoTrackAcrossMesh(track: MediaStreamTrack | null) {
  for (const pc of peerConnections.values()) {
    const videoTx = pc
      .getTransceivers()
      .find((tx) => tx.receiver.track?.kind === 'video' || tx.sender.track?.kind === 'video');
    if (videoTx?.sender) {
      try {
        await videoTx.sender.replaceTrack(track);
      } catch (err) {
        console.warn('Failed to replace video track for peer:', err);
      }
    }
  }
}

async function replaceAudioTrackAcrossMesh(track: MediaStreamTrack | null) {
  for (const pc of peerConnections.values()) {
    const audioTx = pc
      .getTransceivers()
      .find((tx) => tx.receiver.track?.kind === 'audio' || tx.sender.track?.kind === 'audio');
    if (audioTx?.sender) {
      try {
        await audioTx.sender.replaceTrack(track);
      } catch (err) {
        console.warn('Failed to replace audio track for peer:', err);
      }
    }
  }
}

function updatePeerAudioGain(peerUserId: string, volumePercent: number, isDeafened: boolean) {
  const key = normId(peerUserId);
  const pipeline = peerAudioPipelines.get(key);
  if (!pipeline) return;

  const effectiveGain = isDeafened ? 0 : Math.max(0, Math.min(2.0, volumePercent / 100));
  if (pipeline.gainNode) {
    pipeline.gainNode.gain.value = effectiveGain;
    pipeline.audioEl.muted = true;
  } else {
    pipeline.audioEl.muted = isDeafened;
    pipeline.audioEl.volume = Math.max(0, Math.min(1.0, effectiveGain));
  }
}

function attachRemoteAudioPipeline(
  peerUserId: string,
  stream: MediaStream,
  volumePercent: number,
  isDeafened: boolean
) {
  const key = normId(peerUserId);
  let pipeline = peerAudioPipelines.get(key);

  if (!pipeline) {
    const audioEl = new Audio();
    audioEl.autoplay = true;
    (audioEl as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    pipeline = { audioEl };
    peerAudioPipelines.set(key, pipeline);
  }

  if (pipeline.audioEl.srcObject !== stream) {
    pipeline.audioEl.srcObject = stream;
  }

  // Route through Web Audio GainNode to support 0% - 200% per-user volume amplification
  const ctx = ensureAudioContext();
  if (ctx && !pipeline.gainNode && stream.getAudioTracks().length > 0) {
    try {
      const sourceNode = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      sourceNode.connect(gainNode);
      gainNode.connect(ctx.destination);
      pipeline.sourceNode = sourceNode;
      pipeline.gainNode = gainNode;
      // Keep audioEl playing while muted so Chromium pumps the WebRTC media stream
      pipeline.audioEl.muted = true;
    } catch {
      pipeline.audioEl.muted = isDeafened;
    }
  }

  updatePeerAudioGain(peerUserId, volumePercent, isDeafened);
  pipeline.audioEl.play().catch(() => {});
}

function closePeerConnection(peerUserId: string) {
  const key = normId(peerUserId);
  pendingCandidates.delete(key);

  const pipeline = peerAudioPipelines.get(key);
  if (pipeline) {
    try {
      pipeline.audioEl.pause();
      pipeline.audioEl.srcObject = null;
      pipeline.sourceNode?.disconnect();
      pipeline.gainNode?.disconnect();
    } catch {
      // Ignore cleanup errors
    }
    peerAudioPipelines.delete(key);
  }

  const pc = peerConnections.get(key);
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
    peerConnections.delete(key);
  }
}

function cleanupAllPeers() {
  for (const key of Array.from(peerConnections.keys())) {
    closePeerConnection(key);
  }
  peerConnections.clear();
  pendingCandidates.clear();
  peerAudioPipelines.clear();
}

function cleanupMediaHardware() {
  if (vadAnimationFrame) {
    cancelAnimationFrame(vadAnimationFrame);
    vadAnimationFrame = null;
  }
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (pingStatsInterval) {
    clearInterval(pingStatsInterval);
    pingStatsInterval = null;
  }
  cleanupAllPeers();

  if (localMediaStream) {
    localMediaStream.getTracks().forEach((track) => track.stop());
    localMediaStream = null;
  }
  if (screenStream) {
    screenStream.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenStream = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  analyserNode = null;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => {
  const flushPeerCandidates = async (peerUserId: string) => {
    const key = normId(peerUserId);
    const pc = peerConnections.get(key);
    if (!pc || !pc.remoteDescription) return;

    const queue = pendingCandidates.get(key);
    if (!queue || queue.length === 0) return;
    pendingCandidates.set(key, []);

    for (const cand of queue) {
      try {
        await pc.addIceCandidate(cand);
      } catch (err) {
        console.warn('Failed to add buffered voice ICE candidate:', err);
      }
    }
  };

  const getOrCreatePeerConnection = (
    channelId: string,
    peerUserId: string,
    isInitiator: boolean
  ): RTCPeerConnection => {
    const key = normId(peerUserId);
    const existing = peerConnections.get(key);
    if (existing) {
      closePeerConnection(peerUserId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.set(key, pc);

    if (isInitiator) {
      const audioTrack = localMediaStream?.getAudioTracks()[0] ?? null;
      if (audioTrack && localMediaStream) {
        pc.addTransceiver(audioTrack, {
          direction: 'sendrecv',
          streams: [localMediaStream],
        });
      } else {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }

      const videoTrack = getActiveLocalVideoTrack();
      const videoStream = getActiveLocalVideoStream();
      if (videoTrack && videoStream) {
        pc.addTransceiver(videoTrack, {
          direction: 'sendrecv',
          streams: [videoStream],
        });
      } else {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
    }

    pc.onicecandidate = (event) => {
      if (peerConnections.get(key) !== pc) return;
      if (event.candidate && get().connectedChannelId === channelId) {
        signalRService.sendVoiceSignal(
          channelId,
          peerUserId,
          JSON.stringify({ type: 'candidate', candidate: event.candidate })
        );
      }
    };

    pc.ontrack = (event) => {
      if (peerConnections.get(key) !== pc) return;
      const { track } = event;

      const currentStreams = get().remoteStreams;
      let peerStream = currentStreams[key];
      if (!peerStream) {
        peerStream = new MediaStream();
      }
      if (!peerStream.getTracks().includes(track)) {
        peerStream.addTrack(track);
      }

      if (track.kind === 'audio') {
        const vol = get().userVolumes[peerUserId] ?? get().userVolumes[key] ?? 100;
        attachRemoteAudioPipeline(peerUserId, peerStream, vol, get().isDeafened);
      }

      const bump = () =>
        set((state) => ({
          remoteStreams: { ...state.remoteStreams, [key]: peerStream! },
          remoteStreamVersion: state.remoteStreamVersion + 1,
        }));

      track.onmute = bump;
      track.onunmute = bump;
      track.onended = bump;
      bump();
    };

    return pc;
  };

  const initiateOfferToPeer = async (channelId: string, peerUserId: string) => {
    try {
      const pc = getOrCreatePeerConnection(channelId, peerUserId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (get().connectedChannelId === channelId && offer.sdp) {
        await signalRService.sendVoiceSignal(
          channelId,
          peerUserId,
          JSON.stringify({ type: 'offer', sdp: offer.sdp })
        );
      }
    } catch (err) {
      console.warn('Failed to create WebRTC voice offer for peer:', peerUserId, err);
    }
  };

  return {
    currentUserId: null,
    connectedChannelId: null,
    connectedChannelName: null,
    connectedServerId: null,
    connectedWorkspaceId: null,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    isScreenSharing: false,
    isCameraActive: false,
    isTextChatOpen: true,
    pingMs: 18,
    participants: [],
    channelParticipantsMap: {},
    userVolumes: {},
    liveAudioLevel: 0,
    localVideoStream: null,
    remoteStreams: {},
    remoteStreamVersion: 0,

    initVoiceListeners: () => {
      if (listenersInitialized) return;
      listenersInitialized = true;

      signalRService.onCurrentVoiceParticipants((roomParticipants) => {
        const state = get();
        const activeChId = state.connectedChannelId;
        if (!activeChId) return;

        const selfId = state.currentUserId;
        const currentSelf = state.participants.find((p) => sameId(p.userId, selfId));
        const map = new Map<string, VoiceParticipant>();
        if (currentSelf) {
          map.set(normId(currentSelf.userId), currentSelf);
        }

        roomParticipants.forEach((p) => {
          const pKey = normId(p.userId);
          if (sameId(p.userId, selfId)) {
            map.set(pKey, { ...p, ...currentSelf });
          } else {
            map.set(pKey, p);
          }
        });

        const mergedList = Array.from(map.values());
        const chKey = normId(activeChId);
        set((s) => ({
          participants: mergedList,
          channelParticipantsMap: {
            ...s.channelParticipantsMap,
            [chKey]: mergedList,
          },
        }));

        // Initiate WebRTC P2P connections to all existing peers in the voice channel
        for (const peer of mergedList) {
          if (!sameId(peer.userId, selfId)) {
            void initiateOfferToPeer(activeChId, peer.userId);
          }
        }
      });

      signalRService.onUserJoinedVoice((peer) => {
        const targetChId = peer.channelId || get().connectedChannelId;
        if (!targetChId) return;
        const targetKey = normId(targetChId);
        const currentState = get();
        const isCurrentVoiceRoom = sameId(targetChId, currentState.connectedChannelId);
        const isPeerSelf = sameId(peer.userId, currentState.currentUserId);
        const alreadyInRoom = currentState.participants.some((p) => sameId(p.userId, peer.userId));

        if (isCurrentVoiceRoom && !isPeerSelf && !alreadyInRoom && !currentState.isDeafened) {
          playVoiceSoundCue('peer-join');
        }

        set((state) => {
          const existingInChannel =
            state.channelParticipantsMap[targetKey] ||
            state.channelParticipantsMap[targetChId] ||
            [];
          const hasPeerInChannel = existingInChannel.some((p) => sameId(p.userId, peer.userId));
          const updatedChannelList = hasPeerInChannel
            ? existingInChannel.map((p) => (sameId(p.userId, peer.userId) ? { ...p, ...peer } : p))
            : [...existingInChannel, peer];

          // Also remove this user from any other voice channel in the map to prevent ghost entries
          const nextMap: Record<string, VoiceParticipant[]> = {};
          for (const [chKey, list] of Object.entries(state.channelParticipantsMap)) {
            if (sameId(chKey, targetKey)) {
              nextMap[normId(chKey)] = updatedChannelList;
            } else {
              nextMap[normId(chKey)] = list.filter((p) => !sameId(p.userId, peer.userId));
            }
          }
          nextMap[targetKey] = updatedChannelList;

          if (!sameId(targetChId, state.connectedChannelId)) {
            return { channelParticipantsMap: nextMap };
          }

          const existsInRoom = state.participants.some((p) => sameId(p.userId, peer.userId));
          const updatedRoom = existsInRoom
            ? state.participants.map((p) => (sameId(p.userId, peer.userId) ? { ...p, ...peer } : p))
            : [...state.participants, peer];

          return {
            participants: updatedRoom,
            channelParticipantsMap: nextMap,
          };
        });
      });

      signalRService.onUserLeftVoice((payload: VoiceUserLeftPayload) => {
        closePeerConnection(payload.userId);
        const peerKey = normId(payload.userId);
        const chKey = normId(payload.channelId);
        const currentState = get();
        const isCurrentVoiceRoom = sameId(payload.channelId, currentState.connectedChannelId);
        const isPeerSelf = sameId(payload.userId, currentState.currentUserId);
        const wasInRoom = currentState.participants.some((p) => sameId(p.userId, payload.userId));

        if (isCurrentVoiceRoom && !isPeerSelf && wasInRoom && !currentState.isDeafened) {
          playVoiceSoundCue('peer-leave');
        }

        set((state) => {
          const nextStreams = { ...state.remoteStreams };
          delete nextStreams[peerKey];

          const chList =
            state.channelParticipantsMap[chKey] ||
            state.channelParticipantsMap[payload.channelId] ||
            [];
          const nextMap = { ...state.channelParticipantsMap };
          delete nextMap[payload.channelId];
          nextMap[chKey] = chList.filter((p) => !sameId(p.userId, payload.userId));

          if (!sameId(payload.channelId, state.connectedChannelId)) {
            return {
              channelParticipantsMap: nextMap,
              remoteStreams: nextStreams,
            };
          }

          return {
            participants: state.participants.filter((p) => !sameId(p.userId, payload.userId)),
            channelParticipantsMap: nextMap,
            remoteStreams: nextStreams,
            remoteStreamVersion: state.remoteStreamVersion + 1,
          };
        });
      });

      signalRService.onVoiceStateChanged((payload: VoiceStateChangedPayload) => {
        const chKey = normId(payload.channelId);
        set((state) => {
          const applyUpdate = (list: VoiceParticipant[]) =>
            list.map((p) =>
              sameId(p.userId, payload.userId)
                ? {
                    ...p,
                    isMuted: payload.isMuted,
                    isDeafened: payload.isDeafened,
                    isSpeaking: payload.isSpeaking,
                    isScreenSharing: payload.isScreenSharing,
                    isCameraActive: payload.isCameraActive,
                  }
                : p
            );

          const chList =
            state.channelParticipantsMap[chKey] ||
            state.channelParticipantsMap[payload.channelId];
          const nextMap = chList
            ? {
                ...state.channelParticipantsMap,
                [chKey]: applyUpdate(chList),
              }
            : state.channelParticipantsMap;

          if (!sameId(payload.channelId, state.connectedChannelId)) {
            return { channelParticipantsMap: nextMap };
          }

          return {
            participants: applyUpdate(state.participants),
            channelParticipantsMap: nextMap,
          };
        });
      });

      signalRService.onVoiceSignalReceived(async (payload: VoiceSignalPayload) => {
        const activeChId = get().connectedChannelId;
        if (!activeChId || !sameId(payload.channelId, activeChId)) return;

        try {
          const data = JSON.parse(payload.signalData) as {
            type: 'offer' | 'answer' | 'candidate';
            sdp?: string;
            candidate?: RTCIceCandidateInit;
          };

          const senderId = payload.senderUserId;
          const senderKey = normId(senderId);

          if (data.type === 'offer' && data.sdp) {
            const pc = getOrCreatePeerConnection(activeChId, senderId, false);
            await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });

            const audioTrack = localMediaStream?.getAudioTracks()[0] ?? null;
            const videoTrack = getActiveLocalVideoTrack();

            for (const tx of pc.getTransceivers()) {
              tx.direction = 'sendrecv';
              if (tx.receiver.track.kind === 'audio' && audioTrack) {
                await tx.sender.replaceTrack(audioTrack);
              } else if (tx.receiver.track.kind === 'video' && videoTrack) {
                await tx.sender.replaceTrack(videoTrack);
              }
            }

            await flushPeerCandidates(senderId);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (answer.sdp) {
              await signalRService.sendVoiceSignal(
                activeChId,
                senderId,
                JSON.stringify({ type: 'answer', sdp: answer.sdp })
              );
            }
          } else if (data.type === 'answer' && data.sdp) {
            const pc = peerConnections.get(senderKey);
            if (pc && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
              await flushPeerCandidates(senderId);
            }
          } else if (data.type === 'candidate' && data.candidate) {
            const pc = peerConnections.get(senderKey);
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(data.candidate);
            } else {
              const queue = pendingCandidates.get(senderKey) || [];
              queue.push(data.candidate);
              pendingCandidates.set(senderKey, queue);
            }
          }
        } catch (err) {
          console.warn('Error handling WebRTC voice signal:', err);
        }
      });
    },

    syncServerVoiceParticipants: async (serverId: string) => {
      if (!serverId) return;
      get().initVoiceListeners();

      // Ensure SignalR connection is active before requesting rosters
      let attempts = 0;
      while (
        !signalRService.isConnected() &&
        attempts < 6
      ) {
        await new Promise((r) => setTimeout(r, 400));
        attempts++;
      }

      const allParticipants = await signalRService.getServerVoiceParticipants(serverId);
      const grouped: Record<string, VoiceParticipant[]> = {};

      for (const p of allParticipants) {
        if (!p.channelId) continue;
        const chKey = normId(p.channelId);
        if (!grouped[chKey]) grouped[chKey] = [];
        if (!grouped[chKey].some((existing) => sameId(existing.userId, p.userId))) {
          grouped[chKey].push(p);
        }
      }

      set((state) => {
        const nextMap = { ...state.channelParticipantsMap };
        for (const [k, v] of Object.entries(grouped)) {
          nextMap[k] = v;
          nextMap[normId(k)] = v;
        }

        // Always preserve current user's active room participants if connected
        if (state.connectedChannelId && state.participants.length > 0) {
          nextMap[normId(state.connectedChannelId)] = state.participants;
        }
        return { channelParticipantsMap: nextMap };
      });
    },

    joinVoice: async (channelId, channelName, serverId, user) => {
      get().initVoiceListeners();

      // If already connected to this channel, no-op
      if (sameId(get().connectedChannelId, channelId)) return;

      // If user is in an active 1-1 call, leave the 1-1 call cleanly first
      if (useCallStore.getState().callStatus !== 'idle') {
        await webrtcService.endCall();
      }

      // Leave any existing voice room first
      if (get().connectedChannelId) {
        get().leaveVoice();
      }

      const initialMuted = get().isMuted;
      const initialDeafened = get().isDeafened;
      const chKey = normId(channelId);

      const selfParticipant: VoiceParticipant = {
        userId: user.id,
        channelId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isSpeaking: false,
        isMuted: initialMuted,
        isDeafened: initialDeafened,
        isScreenSharing: false,
        isCameraActive: false,
      };

      set((state) => {
        const existingChannelList =
          state.channelParticipantsMap[chKey] ||
          state.channelParticipantsMap[channelId] ||
          [];
        const mergedInitial = [
          selfParticipant,
          ...existingChannelList.filter((p) => !sameId(p.userId, user.id)),
        ];

        // Remove self from any previous voice channel in the map
        const cleanedMap: Record<string, VoiceParticipant[]> = {};
        for (const [key, list] of Object.entries(state.channelParticipantsMap)) {
          cleanedMap[normId(key)] = list.filter((p) => !sameId(p.userId, user.id));
        }
        cleanedMap[chKey] = mergedInitial;

        return {
          currentUserId: user.id,
          connectedChannelId: channelId,
          connectedChannelName: channelName,
          connectedServerId: serverId,
          connectedWorkspaceId: serverId,
          participants: mergedInitial,
          channelParticipantsMap: cleanedMap,
          localVideoStream: null,
          remoteStreams: {},
        };
      });

      playVoiceSoundCue('join');

      // 1. Dispatch JoinVoiceChannel RPC to SignalR Hub IMMEDIATELY so peers see us without waiting on getUserMedia prompt
      try {
        await signalRService.joinVoiceChannel(channelId, initialMuted, initialDeafened);
      } catch (err) {
        console.error('Failed to join voice channel on Hub:', err);
      }

      // 2. Acquire microphone access and start Web Audio VAD
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          // Verify user hasn't left while awaiting permission prompt
          if (!sameId(get().connectedChannelId, channelId)) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          localMediaStream = stream;
          const audioTrack = stream.getAudioTracks()[0] ?? null;

          stream.getAudioTracks().forEach((track) => {
            track.enabled = !get().isMuted;
          });

          // Attach audio track to any peer connections already created
          if (audioTrack) {
            await replaceAudioTrackAcrossMesh(audioTrack);
          }

          const audioCtx = ensureAudioContext();
          if (audioCtx) {
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserNode = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkVAD = () => {
              if (!analyserNode || !sameId(get().connectedChannelId, channelId)) return;
              analyserNode.getByteFrequencyData(dataArray);

              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / (dataArray.length * 255);
              const energy = Math.min(1.0, avg * 2.2);

              set({ liveAudioLevel: Math.round(energy * 100) / 100 });

              const currentState = get();
              if (currentState.isMuted) {
                if (currentState.isSpeaking) {
                  set({ isSpeaking: false });
                  signalRService.updateVoiceState(
                    channelId,
                    currentState.isMuted,
                    currentState.isDeafened,
                    false,
                    currentState.isScreenSharing,
                    currentState.isCameraActive
                  );
                }
              } else {
                const VAD_THRESHOLD = 0.08;
                if (energy > VAD_THRESHOLD) {
                  if (silenceTimer) {
                    clearTimeout(silenceTimer);
                    silenceTimer = null;
                  }
                  if (!currentState.isSpeaking) {
                    set((state) => {
                      const updated = state.participants.map((p) =>
                        sameId(p.userId, user.id) ? { ...p, isSpeaking: true } : p
                      );
                      return {
                        isSpeaking: true,
                        participants: updated,
                        channelParticipantsMap: {
                          ...state.channelParticipantsMap,
                          [chKey]: updated,
                        },
                      };
                    });
                    signalRService.updateVoiceState(
                      channelId,
                      currentState.isMuted,
                      currentState.isDeafened,
                      true,
                      currentState.isScreenSharing,
                      currentState.isCameraActive
                    );
                  }
                } else if (currentState.isSpeaking && !silenceTimer) {
                  silenceTimer = setTimeout(() => {
                    const latest = get();
                    if (!sameId(latest.connectedChannelId, channelId)) return;
                    set((state) => {
                      const updated = state.participants.map((p) =>
                        sameId(p.userId, user.id) ? { ...p, isSpeaking: false } : p
                      );
                      return {
                        isSpeaking: false,
                        participants: updated,
                        channelParticipantsMap: {
                          ...state.channelParticipantsMap,
                          [chKey]: updated,
                        },
                      };
                    });
                    signalRService.updateVoiceState(
                      channelId,
                      latest.isMuted,
                      latest.isDeafened,
                      false,
                      latest.isScreenSharing,
                      latest.isCameraActive
                    );
                    silenceTimer = null;
                  }, 300);
                }
              }

              vadAnimationFrame = requestAnimationFrame(checkVAD);
            };

            checkVAD();
          }
        }
      } catch (err) {
        console.warn('Microphone stream access unavailable for voice channel:', err);
      }

      // 3. Periodically measure real WebRTC RTT ping across active peer connections
      if (pingStatsInterval) clearInterval(pingStatsInterval);
      pingStatsInterval = setInterval(async () => {
        if (peerConnections.size === 0) return;
        for (const pc of peerConnections.values()) {
          if (pc.connectionState !== 'connected') continue;
          try {
            const stats = await pc.getStats();
            stats.forEach((report) => {
              if (
                report.type === 'candidate-pair' &&
                report.state === 'succeeded' &&
                typeof report.currentRoundTripTime === 'number'
              ) {
                const rttMs = Math.max(1, Math.round(report.currentRoundTripTime * 1000));
                set({ pingMs: rttMs });
              }
            });
            break;
          } catch {
            // Ignore stats errors
          }
        }
      }, 3000);
    },

    leaveVoice: () => {
      const channelId = get().connectedChannelId;
      const selfId = get().currentUserId;
      const serverId = get().connectedServerId || get().connectedWorkspaceId;

      if (channelId) {
        signalRService.leaveVoiceChannel(channelId);
        playVoiceSoundCue('leave');
      }

      cleanupMediaHardware();

      set((state) => {
        const nextMap = { ...state.channelParticipantsMap };
        if (channelId) {
          const chKey = normId(channelId);
          const currentList = nextMap[chKey] || nextMap[channelId] || state.participants || [];
          const remaining = currentList.filter((p) => !sameId(p.userId, selfId));
          nextMap[chKey] = remaining;
          nextMap[channelId] = remaining;
        }

        return {
          connectedChannelId: null,
          connectedChannelName: null,
          connectedServerId: null,
          connectedWorkspaceId: null,
          isSpeaking: false,
          isScreenSharing: false,
          isCameraActive: false,
          liveAudioLevel: 0,
          localVideoStream: null,
          remoteStreams: {},
          participants: [],
          channelParticipantsMap: nextMap,
        };
      });

      // Synchronize fresh roster from server after leaving
      if (serverId) {
        void get().syncServerVoiceParticipants(serverId);
      }
    },

    toggleMute: () => {
      const nextMuted = !get().isMuted;
      if (localMediaStream) {
        localMediaStream.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }

      playVoiceSoundCue(nextMuted ? 'mute' : 'unmute');

      const channelId = get().connectedChannelId;
      const selfId = get().currentUserId;
      const state = get();

      set((s) => {
        const updated = s.participants.map((p) =>
          sameId(p.userId, selfId)
            ? { ...p, isMuted: nextMuted, isSpeaking: nextMuted ? false : p.isSpeaking }
            : p
        );
        return {
          isMuted: nextMuted,
          isSpeaking: nextMuted ? false : s.isSpeaking,
          participants: updated,
          channelParticipantsMap: channelId
            ? { ...s.channelParticipantsMap, [normId(channelId)]: updated }
            : s.channelParticipantsMap,
        };
      });

      if (channelId) {
        signalRService.updateVoiceState(
          channelId,
          nextMuted,
          state.isDeafened,
          nextMuted ? false : state.isSpeaking,
          state.isScreenSharing,
          state.isCameraActive
        );
      }
    },

    toggleDeafen: () => {
      const nextDeafened = !get().isDeafened;
      const nextMuted = nextDeafened ? true : get().isMuted;

      if (localMediaStream) {
        localMediaStream.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }

      playVoiceSoundCue(nextDeafened ? 'mute' : 'unmute');

      const channelId = get().connectedChannelId;
      const selfId = get().currentUserId;
      const state = get();

      // Update all remote peer audio pipelines to mute/unmute incoming audio
      for (const peerId of peerAudioPipelines.keys()) {
        const vol = state.userVolumes[peerId] ?? 100;
        updatePeerAudioGain(peerId, vol, nextDeafened);
      }

      set((s) => {
        const updated = s.participants.map((p) =>
          sameId(p.userId, selfId)
            ? {
                ...p,
                isDeafened: nextDeafened,
                isMuted: nextMuted,
                isSpeaking: nextDeafened ? false : p.isSpeaking,
              }
            : p
        );
        return {
          isDeafened: nextDeafened,
          isMuted: nextMuted,
          isSpeaking: nextDeafened ? false : s.isSpeaking,
          participants: updated,
          channelParticipantsMap: channelId
            ? { ...s.channelParticipantsMap, [normId(channelId)]: updated }
            : s.channelParticipantsMap,
        };
      });

      if (channelId) {
        signalRService.updateVoiceState(
          channelId,
          nextMuted,
          nextDeafened,
          nextDeafened ? false : state.isSpeaking,
          state.isScreenSharing,
          state.isCameraActive
        );
      }
    },

    toggleSpeaking: () => {
      if (get().isMuted) return;
      const nextSpeaking = !get().isSpeaking;
      const channelId = get().connectedChannelId;
      const selfId = get().currentUserId;
      const state = get();

      set((s) => {
        const updated = s.participants.map((p) =>
          sameId(p.userId, selfId) ? { ...p, isSpeaking: nextSpeaking } : p
        );
        return {
          isSpeaking: nextSpeaking,
          participants: updated,
          channelParticipantsMap: channelId
            ? { ...s.channelParticipantsMap, [normId(channelId)]: updated }
            : s.channelParticipantsMap,
        };
      });

      if (channelId) {
        signalRService.updateVoiceState(
          channelId,
          state.isMuted,
          state.isDeafened,
          nextSpeaking,
          state.isScreenSharing,
          state.isCameraActive
        );
      }
    },

    toggleScreenSharing: async () => {
      const nextSharing = !get().isScreenSharing;
      const channelId = get().connectedChannelId;
      const selfId = get().currentUserId;

      if (nextSharing && navigator?.mediaDevices?.getDisplayMedia) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              frameRate: { ideal: 20, max: 30 },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
          screenStream = stream;
          const videoTrack = stream.getVideoTracks()[0];

          if (videoTrack) {
            videoTrack.onended = () => {
              if (screenStream) {
                screenStream.getTracks().forEach((t) => t.stop());
                screenStream = null;
              }
              const fallbackTrack = getActiveLocalVideoTrack();
              void replaceVideoTrackAcrossMesh(fallbackTrack);
              const latest = get();
              const activeCh = latest.connectedChannelId;
              set((s) => {
                const updated = s.participants.map((p) =>
                  sameId(p.userId, s.currentUserId) ? { ...p, isScreenSharing: false } : p
                );
                return {
                  isScreenSharing: false,
                  localVideoStream: getActiveLocalVideoStream(),
                  participants: updated,
                  channelParticipantsMap: activeCh
                    ? { ...s.channelParticipantsMap, [normId(activeCh)]: updated }
                    : s.channelParticipantsMap,
                };
              });
              if (activeCh) {
                signalRService.updateVoiceState(
                  activeCh,
                  latest.isMuted,
                  latest.isDeafened,
                  latest.isSpeaking,
                  false,
                  latest.isCameraActive
                );
              }
            };
            await replaceVideoTrackAcrossMesh(videoTrack);
          }
        } catch {
          return;
        }
      } else if (!nextSharing && screenStream) {
        screenStream.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
        screenStream = null;
        await replaceVideoTrackAcrossMesh(getActiveLocalVideoTrack());
      }

      const state = get();
      set((s) => {
        const updated = s.participants.map((p) =>
          sameId(p.userId, selfId) ? { ...p, isScreenSharing: nextSharing } : p
        );
        return {
          isScreenSharing: nextSharing,
          localVideoStream: getActiveLocalVideoStream(),
          participants: updated,
          channelParticipantsMap: channelId
            ? { ...s.channelParticipantsMap, [normId(channelId)]: updated }
            : s.channelParticipantsMap,
        };
      });

      if (channelId) {
        signalRService.updateVoiceState(
          channelId,
          state.isMuted,
          state.isDeafened,
          state.isSpeaking,
          nextSharing,
          state.isCameraActive
        );
      }
    },

    toggleCamera: async () => {
      const nextCamera = !get().isCameraActive;
      const channelId = get().connectedChannelId;
      const selfId = get().currentUserId;

      if (nextCamera && navigator?.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
          });
          cameraStream = stream;
          await replaceVideoTrackAcrossMesh(getActiveLocalVideoTrack());
        } catch {
          return;
        }
      } else if (!nextCamera && cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        cameraStream = null;
        await replaceVideoTrackAcrossMesh(getActiveLocalVideoTrack());
      }

      const state = get();
      set((s) => {
        const updated = s.participants.map((p) =>
          sameId(p.userId, selfId) ? { ...p, isCameraActive: nextCamera } : p
        );
        return {
          isCameraActive: nextCamera,
          localVideoStream: getActiveLocalVideoStream(),
          participants: updated,
          channelParticipantsMap: channelId
            ? { ...s.channelParticipantsMap, [normId(channelId)]: updated }
            : s.channelParticipantsMap,
        };
      });

      if (channelId) {
        signalRService.updateVoiceState(
          channelId,
          state.isMuted,
          state.isDeafened,
          state.isSpeaking,
          state.isScreenSharing,
          nextCamera
        );
      }
    },

    toggleTextChat: () =>
      set((state) => ({
        isTextChatOpen: !state.isTextChatOpen,
      })),

    setTextChatOpen: (open) => set({ isTextChatOpen: open }),

    setUserVolume: (userId, volume) => {
      const clamped = Math.max(0, Math.min(200, volume));
      const key = normId(userId);
      updatePeerAudioGain(userId, clamped, get().isDeafened);

      set((state) => ({
        userVolumes: {
          ...state.userVolumes,
          [userId]: clamped,
          [key]: clamped,
        },
      }));
    },
  };
});

// Immediately register SignalR voice callbacks so they survive Vite HMR and early lifecycle hooks
useVoiceStore.getState().initVoiceListeners();
