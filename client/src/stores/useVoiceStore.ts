import { create } from 'zustand';

export interface VoiceParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing?: boolean;
}

interface VoiceStoreState {
  connectedChannelId: string | null;
  connectedChannelName: string | null;
  connectedWorkspaceId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isTextChatOpen: boolean;
  pingMs: number;
  participants: VoiceParticipant[];

  // Actions
  joinVoice: (
    channelId: string,
    channelName: string,
    workspaceId: string,
    user: { id: string; displayName: string; avatarUrl?: string | null }
  ) => void;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleSpeaking: () => void;
  toggleScreenSharing: () => void;
  toggleTextChat: () => void;
  setTextChatOpen: (open: boolean) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  connectedChannelId: null,
  connectedChannelName: null,
  connectedWorkspaceId: null,
  isMuted: false,
  isDeafened: false,
  isSpeaking: false,
  isScreenSharing: false,
  isTextChatOpen: true,
  pingMs: 18,
  participants: [],

  joinVoice: (channelId, channelName, workspaceId, user) =>
    set((state) => {
      const existingUser = state.participants.find((p) => p.userId === user.id);
      const userParticipant: VoiceParticipant = existingUser || {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isSpeaking: false,
        isMuted: state.isMuted,
        isDeafened: state.isDeafened,
        isScreenSharing: false,
      };

      // Add a simulated bot / companion participant for fun realism
      const companion: VoiceParticipant = {
        userId: 'simulated-nomna-bot',
        displayName: 'NomNa AudioBot',
        avatarUrl: '/default-avatar.png',
        isSpeaking: false,
        isMuted: false,
        isDeafened: false,
        isScreenSharing: false,
      };

      return {
        connectedChannelId: channelId,
        connectedChannelName: channelName,
        connectedWorkspaceId: workspaceId,
        participants: [userParticipant, companion],
      };
    }),

  leaveVoice: () =>
    set({
      connectedChannelId: null,
      connectedChannelName: null,
      connectedWorkspaceId: null,
      isSpeaking: false,
      isScreenSharing: false,
      participants: [],
    }),

  toggleMute: () =>
    set((state) => {
      const nextMuted = !state.isMuted;
      return {
        isMuted: nextMuted,
        isSpeaking: nextMuted ? false : state.isSpeaking,
        participants: state.participants.map((p) =>
          p.userId !== 'simulated-nomna-bot'
            ? { ...p, isMuted: nextMuted, isSpeaking: nextMuted ? false : p.isSpeaking }
            : p
        ),
      };
    }),

  toggleDeafen: () =>
    set((state) => {
      const nextDeafened = !state.isDeafened;
      return {
        isDeafened: nextDeafened,
        isMuted: nextDeafened ? true : state.isMuted,
        isSpeaking: nextDeafened ? false : state.isSpeaking,
        participants: state.participants.map((p) =>
          p.userId !== 'simulated-nomna-bot'
            ? {
                ...p,
                isDeafened: nextDeafened,
                isMuted: nextDeafened ? true : p.isMuted,
                isSpeaking: nextDeafened ? false : p.isSpeaking,
              }
            : p
        ),
      };
    }),

  toggleSpeaking: () =>
    set((state) => {
      if (state.isMuted) return state;
      const nextSpeaking = !state.isSpeaking;
      return {
        isSpeaking: nextSpeaking,
        participants: state.participants.map((p) =>
          p.userId !== 'simulated-nomna-bot' ? { ...p, isSpeaking: nextSpeaking } : p
        ),
      };
    }),

  toggleScreenSharing: () =>
    set((state) => {
      const nextSharing = !state.isScreenSharing;
      return {
        isScreenSharing: nextSharing,
        participants: state.participants.map((p) =>
          p.userId !== 'simulated-nomna-bot' ? { ...p, isScreenSharing: nextSharing } : p
        ),
      };
    }),

  toggleTextChat: () =>
    set((state) => ({
      isTextChatOpen: !state.isTextChatOpen,
    })),

  setTextChatOpen: (open) => set({ isTextChatOpen: open }),
}));
