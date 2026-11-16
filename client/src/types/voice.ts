export interface VoiceParticipant {
  userId: string;
  channelId?: string;
  displayName: string;
  avatarUrl?: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  isCameraActive?: boolean;
}

export interface VoiceStateChangedPayload {
  channelId: string;
  userId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isCameraActive: boolean;
}

export interface VoiceUserLeftPayload {
  channelId: string;
  userId: string;
}

export interface VoiceSignalPayload {
  channelId: string;
  senderUserId: string;
  targetUserId: string;
  signalData: string;
}
