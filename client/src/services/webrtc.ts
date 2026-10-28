import { signalRService } from './signalr';
import { callSound } from './callSound';
import { useCallStore } from '../stores/useCallStore';
import type { CallPeer, CallOfferPayload, CallAnswerPayload, IceCandidatePayload } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

class WebRtcService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private activePeerId: string | null = null;
  private isInitialized = false;

  /**
   * Initializes SignalR event listeners for Call Signaling.
   * Safe to call multiple times (idempotent).
   */
  public initSignalRListeners(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    signalRService.onCallIncoming((payload: CallOfferPayload) => {
      const { callStatus } = useCallStore.getState();
      // If user is already in a call, reject with busy message
      if (callStatus !== 'idle') {
        signalRService.rejectCall(payload.callerId, 'Người nhận đang bận trong cuộc gọi khác.');
        return;
      }

      useCallStore.getState().setIncomingCall(payload);
      callSound.playIncomingRing();
    });

    signalRService.onCallAccepted(async (payload: CallAnswerPayload) => {
      try {
        callSound.stop();
        if (this.peerConnection) {
          const desc = new RTCSessionDescription({ type: 'answer', sdp: payload.sdp });
          await this.peerConnection.setRemoteDescription(desc);
          await this.flushPendingCandidates();
          useCallStore.getState().setConnected();
        }
      } catch (err) {
        console.error('Failed to set remote description on CallAccepted:', err);
      }
    });

    signalRService.onCallRejected((payload) => {
      callSound.stop();
      callSound.playCallEnd();
      const reason = payload.reason || 'Cuộc gọi đã bị từ chối';
      useCallStore.getState().setError(reason);
      setTimeout(() => {
        this.cleanup();
      }, 1500);
    });

    signalRService.onCallEnded(() => {
      callSound.stop();
      callSound.playCallEnd();
      this.cleanup();
    });

    signalRService.onReceiveIceCandidate(async (payload: IceCandidatePayload) => {
      try {
        const candidateInit: RTCIceCandidateInit = JSON.parse(payload.candidate);
        if (this.peerConnection && this.peerConnection.remoteDescription) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } else {
          this.pendingCandidates.push(candidateInit);
        }
      } catch (err) {
        console.warn('Error adding received ICE candidate:', err);
      }
    });
  }

  /**
   * Initiates an outgoing call to the specified user.
   */
  public async startCall(peer: CallPeer, isVideo: boolean): Promise<void> {
    try {
      this.cleanup();
      this.activePeerId = peer.id;
      useCallStore.getState().setOutgoingCall(peer, isVideo);
      callSound.playOutgoingRing();

      // 1. Acquire Local Media
      const stream = await this.getMediaStream(isVideo);
      this.localStream = stream;
      this.cameraTrack = stream.getVideoTracks()[0] || null;
      useCallStore.getState().setLocalStream(stream);

      // 2. Create PeerConnection
      const pc = this.createPeerConnection(peer.id);
      this.peerConnection = pc;

      // 3. Add Local Tracks to PC
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 4. Create Offer & Set Local Description
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      // 5. Send Offer via SignalR
      await signalRService.startCall(peer.id, offer.sdp || '', isVideo);
    } catch (err: any) {
      console.error('Failed to start call:', err);
      callSound.stop();
      const msg = err.name === 'NotAllowedError'
        ? 'Vui lòng cấp quyền truy cập Camera/Micro trong trình duyệt.'
        : (err.message || 'Không thể bắt đầu cuộc gọi.');
      useCallStore.getState().setError(msg);
      setTimeout(() => this.cleanup(), 2000);
    }
  }

  /**
   * Accepts an incoming call offer.
   */
  public async acceptCall(): Promise<void> {
    const { incomingOffer } = useCallStore.getState();
    if (!incomingOffer) return;

    try {
      callSound.stop();
      this.activePeerId = incomingOffer.callerId;

      // 1. Acquire Local Media
      const stream = await this.getMediaStream(incomingOffer.isVideoCall);
      this.localStream = stream;
      this.cameraTrack = stream.getVideoTracks()[0] || null;
      useCallStore.getState().setLocalStream(stream);

      // 2. Create PeerConnection
      const pc = this.createPeerConnection(incomingOffer.callerId);
      this.peerConnection = pc;

      // 3. Add Local Tracks to PC
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 4. Set Remote Description (Offer)
      const offerDesc = new RTCSessionDescription({ type: 'offer', sdp: incomingOffer.sdp });
      await pc.setRemoteDescription(offerDesc);

      // 5. Flush any candidates that arrived while setting up
      await this.flushPendingCandidates();

      // 6. Create Answer & Set Local Description
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 7. Send Answer via SignalR
      await signalRService.acceptCall(incomingOffer.callerId, answer.sdp || '');
      useCallStore.getState().setConnected();
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      callSound.stop();
      const msg = err.name === 'NotAllowedError'
        ? 'Vui lòng cấp quyền truy cập Camera/Micro để trả lời.'
        : (err.message || 'Không thể kết nối cuộc gọi.');
      useCallStore.getState().setError(msg);
      this.rejectCall('Lỗi thiết bị truyền thông');
      setTimeout(() => this.cleanup(), 2000);
    }
  }

  /**
   * Rejects an incoming call.
   */
  public async rejectCall(reason?: string): Promise<void> {
    const { incomingOffer, peer } = useCallStore.getState();
    const callerId = incomingOffer?.callerId || peer?.id;
    callSound.stop();
    if (callerId) {
      await signalRService.rejectCall(callerId, reason);
    }
    this.cleanup();
  }

  /**
   * Ends the active or pending call.
   */
  public async endCall(): Promise<void> {
    const peerId = this.activePeerId || useCallStore.getState().peer?.id;
    callSound.stop();
    callSound.playCallEnd();
    if (peerId) {
      try {
        await signalRService.endCall(peerId);
      } catch (err) {
        console.warn('Failed to dispatch EndCall:', err);
      }
    }
    this.cleanup();
  }

  /**
   * Starts sharing the screen, swapping the active video track.
   */
  public async startScreenShare(): Promise<void> {
    if (!this.peerConnection) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;
      this.screenTrack = screenTrack;

      // Replace outgoing video track on the WebRTC sender
      const videoSender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      }

      // Update local preview to show the screen stream
      useCallStore.getState().setScreenSharing(true);

      // When user clicks the native browser "Stop sharing" button
      screenTrack.onended = () => {
        this.stopScreenShare();
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Failed to share screen:', err);
      }
    }
  }

  /**
   * Stops screen sharing and restores the camera track.
   */
  public async stopScreenShare(): Promise<void> {
    if (this.screenTrack) {
      this.screenTrack.stop();
      this.screenTrack = null;
    }

    if (this.peerConnection && this.cameraTrack) {
      const videoSender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(this.cameraTrack);
      }
    }

    useCallStore.getState().setScreenSharing(false);
  }

  // ==========================================
  // Internal Helpers
  // ==========================================

  private async getMediaStream(isVideo: boolean): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: isVideo
        ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          }
        : false,
    };
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalRService.sendIceCandidate(targetUserId, JSON.stringify(event.candidate));
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        useCallStore.getState().setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall();
      }
    };

    return pc;
  }

  private async flushPendingCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidateInit = this.pendingCandidates.shift();
      if (candidateInit) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.warn('Error flushing buffered ICE candidate:', err);
        }
      }
    }
  }

  private cleanup(): void {
    callSound.stop();

    if (this.screenTrack) {
      this.screenTrack.stop();
      this.screenTrack = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.cameraTrack = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.pendingCandidates = [];
    this.activePeerId = null;
    useCallStore.getState().resetCall();
  }
}

export const webrtcService = new WebRtcService();
