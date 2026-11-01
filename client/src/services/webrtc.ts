import { signalRService } from './signalr';
import { callSound } from './callSound';
import { useCallStore } from '../stores/useCallStore';
import type { CallPeer, CallOfferPayload, CallAnswerPayload, IceCandidatePayload } from '../types';

// ============================================================================
// WebRTC Visual Developer Logging Helper
// ============================================================================
const LOG_COLORS = {
  signaling: 'background: #6366f1; color: white; font-weight: bold; padding: 2px 5px; rounded: 3px;',
  iceLocal: 'background: #0ea5e9; color: white; font-weight: bold; padding: 2px 5px; rounded: 3px;',
  iceRemote: 'background: #14b8a6; color: white; font-weight: bold; padding: 2px 5px; rounded: 3px;',
  state: 'background: #8b5cf6; color: white; font-weight: bold; padding: 2px 5px; rounded: 3px;',
  media: 'background: #10b981; color: white; font-weight: bold; padding: 2px 5px; rounded: 3px;',
  warn: 'background: #f59e0b; color: black; font-weight: bold; padding: 2px 5px; rounded: 3px;',
  error: 'background: #ef4444; color: white; font-weight: bold; padding: 2px 5px; rounded: 3px;',
};

function logWebrtc(category: keyof typeof LOG_COLORS, title: string, details?: any) {
  const badge = `[WebRTC:${title}]`;
  const style = LOG_COLORS[category];
  if (details !== undefined) {
    console.log(`%c${badge}%c`, style, 'color: inherit;', details);
  } else {
    console.log(`%c${badge}%c`, style, 'color: inherit;');
  }
}

interface CandidateInfo {
  type: string;
  proto: string;
  ip: string;
  port: string;
}

function parseCandidateInfo(candStr: string): CandidateInfo {
  // Candidate format example:
  // "candidate:842163049 1 udp 1677729535 192.168.1.15 58231 typ host ..."
  const parts = candStr.trim().split(' ');
  const proto = parts[2] ? parts[2].toUpperCase() : 'UDP';
  const ip = parts[4] || 'unknown-ip';
  const port = parts[5] || 'unknown-port';
  const typeIndex = parts.indexOf('typ');
  const type = typeIndex !== -1 && parts[typeIndex + 1] ? parts[typeIndex + 1].toUpperCase() : 'UNKNOWN';
  return { type, proto, ip, port };
}

// ============================================================================
// WebRTC Configuration
// ============================================================================
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

class WebRtcService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private activePeerId: string | null = null;
  private isInitialized = false;

  // Timers
  private ringingTimeoutTimer: number | null = null;
  private cleanupDelayTimer: number | null = null;

  /**
   * Initializes SignalR event listeners for Call Signaling.
   * Safe to call multiple times (idempotent).
   */
  public initSignalRListeners(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    logWebrtc('signaling', 'Init', 'SignalR Call Signaling listeners registered');

    // 1. Incoming Call Offer
    signalRService.onCallIncoming((payload: CallOfferPayload) => {
      const { callStatus } = useCallStore.getState();
      logWebrtc('signaling', 'CallIncoming', {
        callerId: payload.callerId,
        callerName: payload.callerName,
        isVideo: payload.isVideoCall,
        currentStatus: callStatus,
      });

      // If user is already in a call or connecting, reject with busy message
      if (callStatus !== 'idle') {
        logWebrtc('warn', 'BusyReject', `Auto-rejecting call because current status is ${callStatus}`);
        signalRService.rejectCall(payload.callerId, 'Người nhận đang bận trong cuộc gọi khác.');
        return;
      }

      this.clearTimers();
      this.activePeerId = payload.callerId;
      useCallStore.getState().setIncomingCall(payload);
      callSound.playIncomingRing();

      // Set a 35s auto-reject timer if callee doesn't answer
      this.ringingTimeoutTimer = window.setTimeout(() => {
        logWebrtc('warn', 'IncomingTimeout', 'Incoming call timed out after 35 seconds without answer');
        this.rejectCall('Cuộc gọi nhỡ (không có phản hồi)');
      }, 35000);
    });

    // 2. Call Accepted
    signalRService.onCallAccepted(async (payload: CallAnswerPayload) => {
      logWebrtc('signaling', 'CallAccepted', {
        responderId: payload.responderId,
        sdpBytes: payload.sdp?.length,
      });
      this.clearTimers();
      callSound.stop();
      useCallStore.getState().setConnecting();

      try {
        if (this.peerConnection) {
          const desc = new RTCSessionDescription({ type: 'answer', sdp: payload.sdp });
          logWebrtc('signaling', 'SetRemoteDescription', 'Applying SDP Answer');
          await this.peerConnection.setRemoteDescription(desc);
          await this.flushPendingCandidates();
        }
      } catch (err) {
        logWebrtc('error', 'SetRemoteDescriptionError', err);
      }
    });

    // 3. Call Rejected
    signalRService.onCallRejected((payload) => {
      logWebrtc('signaling', 'CallRejected', payload);
      this.clearTimers();
      callSound.stop();
      callSound.playCallEnd();
      const reason = payload.reason || 'Cuộc gọi đã bị từ chối';
      useCallStore.getState().setError(reason);

      // Reset immediately to idle to avoid getting stuck in busy state
      this.cleanup();
    });

    // 4. Call Ended
    signalRService.onCallEnded((payload) => {
      logWebrtc('signaling', 'CallEnded', payload);
      this.clearTimers();
      callSound.stop();
      callSound.playCallEnd();
      this.cleanup();
    });

    // 5. Receive ICE Candidate
    signalRService.onReceiveIceCandidate(async (payload: IceCandidatePayload) => {
      try {
        const candidateInit: RTCIceCandidateInit =
          typeof payload.candidate === 'string'
            ? JSON.parse(payload.candidate)
            : payload.candidate;

        if (candidateInit.candidate) {
          const info = parseCandidateInfo(candidateInit.candidate);
          logWebrtc('iceRemote', 'CandidateReceived', `[${info.type}] ${info.ip}:${info.port} (${info.proto})`);
        } else {
          logWebrtc('iceRemote', 'CandidateReceived', '[END-OF-CANDIDATES]');
        }

        if (this.peerConnection && this.peerConnection.remoteDescription) {
          await this.peerConnection.addIceCandidate(candidateInit);
        } else {
          logWebrtc('iceRemote', 'Buffered', 'Queued ICE candidate pending remoteDescription');
          this.pendingCandidates.push(candidateInit);
        }
      } catch (err) {
        logWebrtc('warn', 'CandidateParseError', err);
      }
    });
  }

  /**
   * Initiates an outgoing call to the specified user.
   */
  public async startCall(peer: CallPeer, isVideo: boolean): Promise<void> {
    try {
      this.clearTimers();
      this.cleanup();
      this.activePeerId = peer.id;

      logWebrtc('signaling', 'StartCall', { target: peer.displayName, isVideo });
      useCallStore.getState().setOutgoingCall(peer, isVideo);
      callSound.playOutgoingRing();

      // Auto cancel after 35s if no answer
      this.ringingTimeoutTimer = window.setTimeout(() => {
        logWebrtc('warn', 'OutgoingTimeout', 'Outgoing call timed out after 35 seconds without answer');
        useCallStore.getState().setError('Người nhận không nhấc máy.');
        this.endCall();
      }, 35000);

      // 1. Acquire Local Media
      const stream = await this.getMediaStream(isVideo);
      this.localStream = stream;
      this.cameraTrack = stream.getVideoTracks()[0] || null;
      useCallStore.getState().setLocalStream(stream);

      // 2. Create PeerConnection
      const pc = this.createPeerConnection(peer.id);
      this.peerConnection = pc;

      // 3. Add Local Tracks & Ensure Dual Transceivers
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
        logWebrtc('media', 'LocalAudioAttached', `Audio track ID: ${audioTrack.id}`);
      } else {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }

      if (this.cameraTrack) {
        pc.addTrack(this.cameraTrack, stream);
        logWebrtc('media', 'LocalVideoAttached', `Camera track ID: ${this.cameraTrack.id}`);
      } else {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }

      // 4. Create Offer & Set Local Description
      logWebrtc('signaling', 'CreateOffer', 'Creating SDP Offer with Audio & Video');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      logWebrtc('signaling', 'OfferCreated', `Offer SDP size: ${offer.sdp?.length} bytes`);

      // 5. Send Offer via SignalR
      await signalRService.startCall(peer.id, offer.sdp || '', isVideo);
    } catch (err: any) {
      logWebrtc('error', 'StartCallFailed', err);
      callSound.stop();
      const msg =
        err.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền Micro/Camera trong trình duyệt.'
          : err.name === 'NotReadableError'
            ? 'Thiết bị Micro/Camera đang bị chiếm dụng bởi tab hoặc ứng dụng khác.'
            : err.message || 'Không thể bắt đầu cuộc gọi.';
      useCallStore.getState().setError(msg);
      this.cleanup();
    }
  }

  /**
   * Accepts an incoming call offer.
   */
  public async acceptCall(): Promise<void> {
    const { incomingOffer } = useCallStore.getState();
    if (!incomingOffer) return;

    try {
      this.clearTimers();
      callSound.stop();
      this.activePeerId = incomingOffer.callerId;
      useCallStore.getState().setConnecting();

      logWebrtc('signaling', 'AcceptCall', { callerId: incomingOffer.callerId, isVideo: incomingOffer.isVideoCall });

      // 1. Acquire Local Media
      const stream = await this.getMediaStream(incomingOffer.isVideoCall);
      this.localStream = stream;
      this.cameraTrack = stream.getVideoTracks()[0] || null;
      useCallStore.getState().setLocalStream(stream);

      // 2. Create PeerConnection
      const pc = this.createPeerConnection(incomingOffer.callerId);
      this.peerConnection = pc;

      // 3. Add Local Tracks & Ensure Transceivers
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      } else {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }

      if (this.cameraTrack) {
        pc.addTrack(this.cameraTrack, stream);
      } else {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }

      // 4. Set Remote Description (Offer)
      logWebrtc('signaling', 'SetRemoteOffer', `Parsing Offer SDP (${incomingOffer.sdp?.length} bytes)`);
      const offerDesc = new RTCSessionDescription({ type: 'offer', sdp: incomingOffer.sdp });
      await pc.setRemoteDescription(offerDesc);

      // 5. Flush any candidates that arrived while setting up
      await this.flushPendingCandidates();

      // 6. Create Answer & Set Local Description
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      logWebrtc('signaling', 'AnswerCreated', `Answer SDP size: ${answer.sdp?.length} bytes`);

      // 7. Send Answer via SignalR
      await signalRService.acceptCall(incomingOffer.callerId, answer.sdp || '');
    } catch (err: any) {
      logWebrtc('error', 'AcceptCallFailed', err);
      callSound.stop();
      const msg =
        err.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền Micro/Camera để trả lời.'
          : err.name === 'NotReadableError'
            ? 'Thiết bị Micro/Camera đang bị chiếm dụng bởi tab hoặc ứng dụng khác.'
            : err.message || 'Không thể kết nối cuộc gọi.';
      useCallStore.getState().setError(msg);
      this.rejectCall('Lỗi thiết bị truyền thông');
      this.cleanup();
    }
  }

  /**
   * Rejects an incoming call.
   */
  public async rejectCall(reason?: string): Promise<void> {
    const { incomingOffer, peer } = useCallStore.getState();
    const callerId = incomingOffer?.callerId || peer?.id || this.activePeerId;
    this.clearTimers();
    callSound.stop();
    logWebrtc('signaling', 'RejectCall', { callerId, reason });
    if (callerId) {
      try {
        await signalRService.rejectCall(callerId, reason);
      } catch (err) {
        logWebrtc('warn', 'RejectDispatchError', err);
      }
    }
    this.cleanup();
  }

  /**
   * Ends the active or pending call.
   */
  public async endCall(): Promise<void> {
    const peerId = this.activePeerId || useCallStore.getState().peer?.id;
    this.clearTimers();
    callSound.stop();
    callSound.playCallEnd();
    logWebrtc('signaling', 'EndCall', { peerId });
    if (peerId) {
      try {
        await signalRService.endCall(peerId);
      } catch (err) {
        logWebrtc('warn', 'EndCallDispatchError', err);
      }
    }
    this.cleanup();
  }

  /**
   * Starts sharing the screen, swapping the active video track with system audio support.
   */
  public async startScreenShare(): Promise<void> {
    if (!this.peerConnection) return;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        useCallStore.getState().setError('Trình duyệt không hỗ trợ chia sẻ màn hình.');
        return;
      }

      logWebrtc('media', 'StartScreenShare', 'Prompting display media picker');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          frameRate: { ideal: 30, max: 60 },
        } as any,
        audio: true, // Capture tab / system audio if user permits
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;
      this.screenTrack = screenTrack;

      logWebrtc('media', 'ScreenTrackAcquired', {
        id: screenTrack.id,
        label: screenTrack.label,
      });

      // Replace outgoing video track on the WebRTC video transceiver
      const videoTransceiver = this.peerConnection.getTransceivers().find(
        (t) => t.receiver.track.kind === 'video'
      );

      if (videoTransceiver && videoTransceiver.sender) {
        await videoTransceiver.sender.replaceTrack(screenTrack);
      } else {
        const videoSender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      // Update local preview to show the screen stream in Picture-in-Picture
      useCallStore.getState().setLocalStream(screenStream);
      useCallStore.getState().setScreenSharing(true);

      // When user clicks the native browser "Stop sharing" floating bar
      screenTrack.onended = () => {
        logWebrtc('media', 'ScreenShareNativeEnded', 'User stopped sharing via browser bar');
        this.stopScreenShare();
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        logWebrtc('error', 'ScreenShareFailed', err);
        useCallStore.getState().setError('Không thể chia sẻ màn hình: ' + (err.message || ''));
      }
    }
  }

  /**
   * Stops screen sharing and restores the camera track.
   */
  public async stopScreenShare(): Promise<void> {
    logWebrtc('media', 'StopScreenShare', 'Restoring camera track');
    if (this.screenTrack) {
      this.screenTrack.stop();
      this.screenTrack = null;
    }

    if (this.peerConnection) {
      const videoTransceiver = this.peerConnection.getTransceivers().find(
        (t) => t.receiver.track.kind === 'video'
      );
      if (videoTransceiver && videoTransceiver.sender) {
        await videoTransceiver.sender.replaceTrack(this.cameraTrack);
      } else {
        const videoSender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(this.cameraTrack);
        }
      }
    }

    // Restore local camera stream in PIP
    if (this.localStream) {
      useCallStore.getState().setLocalStream(this.localStream);
    }
    useCallStore.getState().setScreenSharing(false);
  }

  // ============================================================================
  // Internal Helpers & Hardware Acquisition
  // ============================================================================

  private async getMediaStream(isVideo: boolean): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Trình duyệt không hỗ trợ truy cập Micro/Camera. Vui lòng đảm bảo truy cập qua HTTPS hoặc localhost.'
      );
    }

    // High quality audio constraints with Acoustic Echo Cancellation, Noise Suppression, and Highpass Filter
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
      channelCount: 1, // Mono voice avoids acoustic phasing / buzzing feedback loops
      sampleRate: 48000,
      // @ts-ignore - Chromium specific properties
      googEchoCancellation: true,
      // @ts-ignore
      googAutoGainControl: true,
      // @ts-ignore
      googNoiseSuppression: true,
      // @ts-ignore
      googHighpassFilter: true, // Cut 50Hz/60Hz rumble & buzzing
      // @ts-ignore
      googAudioMirroring: false,
    };

    if (isVideo) {
      try {
        logWebrtc('media', 'RequestMedia', 'Attempting Camera + Microphone');
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
      } catch (err: any) {
        logWebrtc('warn', 'CameraBusyOrMissing', 'Webcam locked or missing, falling back to audio only');
        useCallStore.getState().setIsVideoCall(false);
      }
    }

    try {
      logWebrtc('media', 'RequestMedia', 'Attempting Microphone only');
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
    } catch (err: any) {
      logWebrtc('warn', 'MicBusyOrMissing', 'Microphone locked or not accessible. Creating silent synthetic stream.');
      // When 2 tabs on the same machine conflict on hardware access, create a dummy silent stream
      // so the connection succeeds rather than crashing!
      return this.createSyntheticSilentStream();
    }
  }

  /**
   * Generates a synthetic silent stream via Web Audio API.
   * Prevents crashes when testing 2 tabs on the same machine when device lock occurs.
   */
  private createSyntheticSilentStream(): MediaStream {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        const dummyOsc = ctx.createOscillator();
        const dummyGain = ctx.createGain();
        dummyGain.gain.value = 0; // Completely silent
        dummyOsc.connect(dummyGain);
        dummyGain.connect(dest);
        dummyOsc.start();
        return dest.stream;
      }
    } catch {
      // ignore
    }
    return new MediaStream();
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    logWebrtc('state', 'CreatePeerConnection', 'Initialized RTCPeerConnection instance');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const info = parseCandidateInfo(event.candidate.candidate);
        logWebrtc('iceLocal', 'CandidateGenerated', `[${info.type}] ${info.ip}:${info.port} (${info.proto})`);
        signalRService.sendIceCandidate(targetUserId, JSON.stringify(event.candidate));
      } else {
        logWebrtc('iceLocal', 'GatheringCompleted', 'All local ICE candidates collected');
      }
    };

    pc.ontrack = (event) => {
      logWebrtc('media', 'RemoteTrack', `${event.track.kind.toUpperCase()} track received (${event.track.id})`);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      // Add track to local accumulator if not present
      if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }

      // Create a fresh MediaStream wrapper so Zustand/React registers reference change
      useCallStore.getState().setRemoteStream(new MediaStream(this.remoteStream.getTracks()));

      event.track.onunmute = () => {
        logWebrtc('media', 'TrackUnmuted', `${event.track.kind} unmuted`);
        if (this.remoteStream) {
          useCallStore.getState().setRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        }
      };

      event.track.onended = () => {
        logWebrtc('media', 'TrackEnded', `${event.track.kind} ended`);
        if (this.remoteStream) {
          this.remoteStream.removeTrack(event.track);
          useCallStore.getState().setRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        }
      };
    };

    pc.oniceconnectionstatechange = () => {
      logWebrtc('state', 'IceConnectionState', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.clearTimers();
        useCallStore.getState().setConnected();
      } else if (pc.iceConnectionState === 'failed') {
        logWebrtc('error', 'IceFailed', 'P2P network path could not be established');
        useCallStore.getState().setError('Không thể thiết lập kết nối mạng P2P.');
        this.endCall();
      }
    };

    pc.onconnectionstatechange = () => {
      logWebrtc('state', 'ConnectionState', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.clearTimers();
        useCallStore.getState().setConnected();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall();
      }
    };

    pc.onsignalingstatechange = () => {
      logWebrtc('state', 'SignalingState', pc.signalingState);
    };

    return pc;
  }

  private async flushPendingCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    logWebrtc('iceRemote', 'FlushCandidates', `Flushing ${this.pendingCandidates.length} buffered candidates`);
    while (this.pendingCandidates.length > 0) {
      const candidateInit = this.pendingCandidates.shift();
      if (candidateInit) {
        try {
          await this.peerConnection.addIceCandidate(candidateInit);
        } catch (err) {
          logWebrtc('warn', 'FlushCandidateError', err);
        }
      }
    }
  }

  private clearTimers(): void {
    if (this.ringingTimeoutTimer !== null) {
      clearTimeout(this.ringingTimeoutTimer);
      this.ringingTimeoutTimer = null;
    }
    if (this.cleanupDelayTimer !== null) {
      clearTimeout(this.cleanupDelayTimer);
      this.cleanupDelayTimer = null;
    }
  }

  private cleanup(): void {
    logWebrtc('state', 'Cleanup', 'Destroying WebRTC session and resetting state');
    this.clearTimers();
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

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      // Detach listeners before closing to prevent re-entrant callbacks
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.pendingCandidates = [];
    this.activePeerId = null;

    // Immediately reset store to idle so neither caller nor callee is locked in busy state
    useCallStore.getState().resetCall();
  }
}

export const webrtcService = new WebRtcService();
