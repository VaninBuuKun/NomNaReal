export interface CallOfferPayload {
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  targetUserId: string;
  sdp: string;
  isVideoCall: boolean;
}

export interface CallAnswerPayload {
  responderId: string;
  callerId: string;
  sdp: string;
}

export interface IceCandidatePayload {
  senderId: string;
  targetUserId: string;
  candidate: string; // JSON string of RTCIceCandidateInit
}

export interface CallRejectedPayload {
  peerId: string;
  reason?: string;
}

export interface CallEndedPayload {
  peerId: string;
}

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected';

export interface CallPeer {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}
