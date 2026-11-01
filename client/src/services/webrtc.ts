import { signalRService } from './signalr';
import { callSound } from './callSound';
import { useCallStore } from '../stores/useCallStore';
import type { CallPeer, CallOfferPayload, CallAnswerPayload, IceCandidatePayload } from '../types';

// ============================================================================
// WebRTC Visual Developer Logging Helper  (open DevTools → Console, filter "WebRTC")
// ============================================================================
const BADGE = 'color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;';
const LOG_COLORS = {
  signaling: `background: #6366f1; ${BADGE}`,
  iceLocal: `background: #0ea5e9; ${BADGE}`,
  iceRemote: `background: #14b8a6; ${BADGE}`,
  state: `background: #8b5cf6; ${BADGE}`,
  media: `background: #10b981; ${BADGE}`,
  warn: 'background: #f59e0b; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
  error: `background: #ef4444; ${BADGE}`,
};

function logWebrtc(category: keyof typeof LOG_COLORS, title: string, details?: unknown) {
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
// Configuration
// ============================================================================
const RING_TIMEOUT_MS = 35_000; // unanswered call → auto cancel
const CONNECT_TIMEOUT_MS = 30_000; // answered but P2P never established
const DISCONNECT_GRACE_MS = 8_000; // transient network blips must not kill the call
const NOTICE_MS = 5_000;

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  // Optional TURN relay (needed when both peers sit behind symmetric NAT / strict firewalls):
  //   VITE_TURN_URL=turn:host:3478,turns:host:5349  VITE_TURN_USERNAME=...  VITE_TURN_CREDENTIAL=...
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

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

interface CandidateStats {
  candidateType?: string;
  address?: string;
  port?: number;
  protocol?: string;
}

const sameId = (a?: string | null, b?: string | null) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

class WebRtcService {
  private peerConnection: RTCPeerConnection | null = null;
  private stateChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenStream: MediaStream | null = null;
  private syntheticCtx: AudioContext | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private activePeerId: string | null = null;
  private isInitialized = false;

  /**
   * Incremented on every new session and on every cleanup. Any async step that resumes after an
   * `await` compares its captured id to detect that the call was cancelled meanwhile
   * (user hung up while the permission prompt was open, remote ended, ...), preventing zombie
   * peer connections and "busy" ghosts.
   */
  private sessionId = 0;

  private ringingTimer: number | null = null;
  private connectTimer: number | null = null;
  private disconnectTimer: number | null = null;
  private noticeTimer: number | null = null;

  // ==========================================================================
  // Signaling listeners
  // ==========================================================================

  /** Safe to call multiple times (idempotent). */
  public initSignalRListeners(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    logWebrtc('signaling', 'Init', 'SignalR call listeners registered');

    // 1. Incoming offer
    signalRService.onCallIncoming((payload: CallOfferPayload) => {
      const { callStatus } = useCallStore.getState();
      logWebrtc('signaling', 'CallIncoming', {
        from: payload.callerName,
        isVideo: payload.isVideoCall,
        currentStatus: callStatus,
      });

      if (callStatus !== 'idle') {
        logWebrtc('warn', 'BusyReject', `Auto-rejecting: current status is ${callStatus}`);
        signalRService.rejectCall(payload.callerId, 'Người nhận đang bận trong cuộc gọi khác.').catch(() => {});
        return;
      }

      this.clearTimers();
      this.activePeerId = payload.callerId;
      useCallStore.getState().setIncomingCall(payload);
      callSound.playIncomingRing();

      this.ringingTimer = window.setTimeout(() => {
        logWebrtc('warn', 'IncomingTimeout', 'No answer within 35s');
        void this.rejectCall('Cuộc gọi nhỡ (không có phản hồi)');
      }, RING_TIMEOUT_MS);
    });

    // 2. Answer received (caller side)
    signalRService.onCallAccepted(async (payload: CallAnswerPayload) => {
      const { callStatus } = useCallStore.getState();
      const pc = this.peerConnection;
      if (callStatus !== 'outgoing' || !pc || !sameId(payload.responderId, this.activePeerId)) {
        logWebrtc('warn', 'CallAcceptedIgnored', { callStatus, hasPc: Boolean(pc) });
        return;
      }

      logWebrtc('signaling', 'CallAccepted', { sdpBytes: payload.sdp?.length });
      const sid = this.sessionId;
      this.clearTimers();
      callSound.stop();
      useCallStore.getState().setConnecting();
      this.startConnectTimer();

      try {
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
        if (this.isStale(sid)) return;
        await this.flushPendingCandidates();
      } catch (err) {
        logWebrtc('error', 'SetRemoteAnswerFailed', err);
        if (!this.isStale(sid)) await this.terminate('Không thể thiết lập cuộc gọi (SDP lỗi).');
      }
    });

    // 3. Rejected (caller side)
    signalRService.onCallRejected((payload) => {
      logWebrtc('signaling', 'CallRejected', payload);
      if (this.activePeerId && !sameId(payload.peerId, this.activePeerId)) return;
      callSound.stop();
      callSound.playCallEnd();
      this.cleanup();
      this.notify(payload.reason || 'Cuộc gọi đã bị từ chối');
    });

    // 4. Ended by the other side
    signalRService.onCallEnded((payload) => {
      logWebrtc('signaling', 'CallEnded', payload);
      if (this.activePeerId && !sameId(payload.peerId, this.activePeerId)) return;
      const { callStatus, peer } = useCallStore.getState();
      if (callStatus === 'idle') return;

      callSound.stop();
      this.cleanup();
      if (callStatus === 'incoming') {
        this.notify(`Cuộc gọi nhỡ từ ${peer?.displayName ?? 'người dùng'}`);
      } else {
        callSound.playCallEnd();
      }
    });

    // 5. Remote ICE candidate
    signalRService.onReceiveIceCandidate(async (payload: IceCandidatePayload) => {
      if (useCallStore.getState().callStatus === 'idle') return; // stale candidate from a finished call
      if (this.activePeerId && !sameId(payload.senderId, this.activePeerId)) return;

      try {
        const candidateInit: RTCIceCandidateInit =
          typeof payload.candidate === 'string' ? JSON.parse(payload.candidate) : payload.candidate;

        if (candidateInit.candidate) {
          const info = parseCandidateInfo(candidateInit.candidate);
          logWebrtc('iceRemote', 'CandidateReceived', `[${info.type}] ${info.ip}:${info.port} (${info.proto})`);
        }

        const pc = this.peerConnection;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(candidateInit);
        } else {
          this.pendingCandidates.push(candidateInit);
        }
      } catch (err) {
        logWebrtc('warn', 'CandidateError', err);
      }
    });
  }

  // ==========================================================================
  // Public call controls
  // ==========================================================================

  public async startCall(peer: CallPeer, isVideo: boolean): Promise<void> {
    const store = useCallStore.getState();
    if (store.callStatus !== 'idle') {
      logWebrtc('warn', 'StartCallIgnored', `Already in state "${store.callStatus}"`);
      return;
    }

    this.cleanup();
    const sid = this.sessionId;
    this.activePeerId = peer.id;

    logWebrtc('signaling', 'StartCall', { target: peer.displayName, isVideo });
    useCallStore.getState().setOutgoingCall(peer, isVideo);
    callSound.playOutgoingRing();

    this.ringingTimer = window.setTimeout(() => {
      logWebrtc('warn', 'OutgoingTimeout', 'No answer within 35s');
      void this.terminate('Người nhận không nhấc máy.');
    }, RING_TIMEOUT_MS);

    try {
      const stream = await this.acquireMedia(isVideo);
      if (this.isStale(sid)) return this.discardStream(stream);
      this.attachLocalStream(stream);

      const pc = this.createPeerConnection(peer.id);
      this.peerConnection = pc;

      // Caller: declare both m-lines up-front so camera / screen can be (re)attached any time
      // later with replaceTrack() — no renegotiation needed.
      const audioTrack = stream.getAudioTracks()[0] ?? null;
      if (audioTrack) pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [stream] });
      else pc.addTransceiver('audio', { direction: 'sendrecv' });

      if (this.cameraTrack) pc.addTransceiver(this.cameraTrack, { direction: 'sendrecv', streams: [stream] });
      else pc.addTransceiver('video', { direction: 'sendrecv' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.isStale(sid)) return;
      logWebrtc('signaling', 'OfferCreated', `SDP ${offer.sdp?.length ?? 0} bytes`);

      await signalRService.startCall(peer.id, offer.sdp || '', isVideo);
    } catch (err) {
      if (this.isStale(sid)) return;
      logWebrtc('error', 'StartCallFailed', err);
      callSound.stop();
      this.cleanup();
      this.notify(this.describeMediaError(err, 'Không thể bắt đầu cuộc gọi.'));
    }
  }

  public async acceptCall(): Promise<void> {
    const { incomingOffer, callStatus } = useCallStore.getState();
    if (!incomingOffer || callStatus !== 'incoming') return;

    this.clearTimers();
    callSound.stop();
    const sid = ++this.sessionId;
    this.activePeerId = incomingOffer.callerId;
    useCallStore.getState().setConnecting();

    logWebrtc('signaling', 'AcceptCall', { from: incomingOffer.callerName, isVideo: incomingOffer.isVideoCall });

    try {
      const stream = await this.acquireMedia(incomingOffer.isVideoCall);
      if (this.isStale(sid)) return this.discardStream(stream);
      this.attachLocalStream(stream);

      const pc = this.createPeerConnection(incomingOffer.callerId);
      this.peerConnection = pc;

      // Callee: apply the offer FIRST so the transceivers are created from the offer's m-lines,
      // then attach our tracks to those exact transceivers. (Tracks/transceivers added before
      // setRemoteDescription are not guaranteed to be reused → video could never be sent back.)
      await pc.setRemoteDescription({ type: 'offer', sdp: incomingOffer.sdp });
      if (this.isStale(sid)) return;

      const audioTrack = stream.getAudioTracks()[0] ?? null;
      for (const tx of pc.getTransceivers()) {
        const track = tx.receiver.track.kind === 'audio' ? audioTrack : this.cameraTrack;
        tx.direction = 'sendrecv';
        if (track) await tx.sender.replaceTrack(track);
      }

      await this.flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (this.isStale(sid)) return;
      logWebrtc('signaling', 'AnswerCreated', `SDP ${answer.sdp?.length ?? 0} bytes`);

      await signalRService.acceptCall(incomingOffer.callerId, answer.sdp || '');
      if (!this.isStale(sid)) this.startConnectTimer();
    } catch (err) {
      if (this.isStale(sid)) return;
      logWebrtc('error', 'AcceptCallFailed', err);
      const message = this.describeMediaError(err, 'Không thể kết nối cuộc gọi.');
      await this.rejectCall('Lỗi thiết bị truyền thông');
      this.notify(message);
    }
  }

  public async rejectCall(reason?: string): Promise<void> {
    const { incomingOffer, peer } = useCallStore.getState();
    const callerId = incomingOffer?.callerId || peer?.id || this.activePeerId;
    logWebrtc('signaling', 'RejectCall', { callerId, reason });
    callSound.stop();
    this.cleanup();
    if (callerId) {
      try {
        await signalRService.rejectCall(callerId, reason);
      } catch (err) {
        logWebrtc('warn', 'RejectDispatchError', err);
      }
    }
  }

  /** User hang-up (also used for cancel while ringing). */
  public async endCall(): Promise<void> {
    callSound.stop();
    callSound.playCallEnd();
    await this.terminate();
  }

  public toggleMic(): void {
    const next = !useCallStore.getState().isMicMuted;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !next));
    useCallStore.getState().setMicMuted(next);
    this.sendMediaState();
  }

  public async toggleCamera(): Promise<void> {
    const store = useCallStore.getState();
    if (!this.localStream) return;

    // Camera already acquired → just enable / disable it
    if (this.cameraTrack) {
      const nextOff = !store.isCameraOff;
      this.cameraTrack.enabled = !nextOff;
      useCallStore.getState().setCameraOff(nextOff);
      this.sendMediaState();
      return;
    }

    // No camera yet (voice call, or the device was busy at start) → try to open it now
    const sid = this.sessionId;
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS });
      const track = cam.getVideoTracks()[0];
      if (!track) return;
      if (this.isStale(sid) || !this.localStream) {
        track.stop();
        return;
      }
      this.cameraTrack = track;
      this.localStream.addTrack(track);
      if (!this.screenStream) await this.getVideoSender()?.replaceTrack(track);
      logWebrtc('media', 'CameraEnabled', track.label);
      useCallStore.getState().setCameraOff(false);
      this.sendMediaState();
    } catch (err) {
      logWebrtc('warn', 'CameraEnableFailed', err);
      this.notify('Không thể bật camera (bị chặn hoặc đang được ứng dụng / tab khác sử dụng).');
    }
  }

  public async startScreenShare(): Promise<void> {
    const pc = this.peerConnection;
    if (!pc || this.screenStream) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.notify('Thiết bị này không hỗ trợ chia sẻ màn hình.');
      return;
    }

    const sid = this.sessionId;
    try {
      logWebrtc('media', 'StartScreenShare', 'Prompting display picker');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (!track || this.isStale(sid)) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Hint the encoder to keep text sharp instead of smoothing motion
      (track as MediaStreamTrack & { contentHint?: string }).contentHint = 'detail';

      const sender = this.getVideoSender();
      if (!sender) {
        stream.getTracks().forEach((t) => t.stop());
        this.notify('Kết nối chưa sẵn sàng để chia sẻ màn hình.');
        return;
      }
      await sender.replaceTrack(track);
      await this.tuneScreenSender(sender);

      this.screenStream = stream;
      track.onended = () => {
        logWebrtc('media', 'ScreenShareNativeEnded', 'Stopped via browser UI');
        void this.stopScreenShare();
      };

      logWebrtc('media', 'ScreenShareStarted', track.label);
      useCallStore.getState().setScreenSharing(true);
      this.sendMediaState();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return; // user cancelled picker
      logWebrtc('error', 'ScreenShareFailed', err);
      this.notify('Không thể chia sẻ màn hình.');
    }
  }

  public async stopScreenShare(): Promise<void> {
    const stream = this.screenStream;
    if (!stream) return;
    this.screenStream = null;
    stream.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });

    try {
      await this.getVideoSender()?.replaceTrack(this.cameraTrack);
    } catch (err) {
      logWebrtc('warn', 'RestoreCameraFailed', err);
    }

    logWebrtc('media', 'ScreenShareStopped', 'Camera track restored');
    useCallStore.getState().setScreenSharing(false);
    this.sendMediaState();
  }

  // ==========================================================================
  // Internals
  // ==========================================================================

  private isStale(sid: number): boolean {
    return sid !== this.sessionId;
  }

  private discardStream(stream: MediaStream): void {
    stream.getTracks().forEach((t) => t.stop());
    this.closeSyntheticContext();
  }

  /** Signals the peer, tears everything down and optionally shows a notice. */
  private async terminate(notice?: string): Promise<void> {
    const peerId = this.activePeerId || useCallStore.getState().peer?.id;
    logWebrtc('signaling', 'EndCall', { peerId, notice });
    this.cleanup();
    if (peerId) {
      try {
        await signalRService.endCall(peerId);
      } catch (err) {
        logWebrtc('warn', 'EndCallDispatchError', err);
      }
    }
    if (notice) this.notify(notice);
  }

  private notify(message: string, durationMs = NOTICE_MS): void {
    useCallStore.getState().setError(message);
    if (this.noticeTimer !== null) clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      this.noticeTimer = null;
      if (useCallStore.getState().error === message) useCallStore.getState().setError(null);
    }, durationMs);
  }

  private describeMediaError(err: unknown, fallback: string): string {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') return 'Hãy cấp quyền Micro/Camera cho trình duyệt rồi thử lại.';
    if (name === 'NotFoundError') return 'Không tìm thấy micro hoặc camera trên thiết bị.';
    if (name === 'NotReadableError') return 'Micro/Camera đang được ứng dụng hoặc tab khác sử dụng.';
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }

  private attachLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    this.cameraTrack = stream.getVideoTracks()[0] ?? null;
    const store = useCallStore.getState();
    store.setLocalStream(stream);
    store.setCameraOff(!this.cameraTrack);
    store.setMicMuted(false);
    store.setScreenSharing(false);
  }

  /**
   * Opens mic (+ camera for video calls) and degrades gracefully:
   *  1. camera + mic  →  2. mic only (camera busy/missing)  →  3. silent stream (mic busy, e.g. 2 tabs on one PC)
   * Only a *permission denial* is surfaced as a hard failure.
   */
  private async acquireMedia(isVideo: boolean): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt chỉ cho dùng Micro/Camera qua HTTPS hoặc localhost.');
    }

    if (isVideo) {
      try {
        logWebrtc('media', 'RequestMedia', 'Camera + Microphone');
        return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: CAMERA_CONSTRAINTS });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') throw err;
        logWebrtc('warn', 'CameraUnavailable', err);
        this.notify('Không mở được camera (đang được tab/ứng dụng khác dùng). Bạn vẫn nghe và xem được đối phương.');
      }
    }

    try {
      logWebrtc('media', 'RequestMedia', 'Microphone only');
      return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') throw err;
      logWebrtc('warn', 'MicUnavailable', 'Using a silent stream so the call can still connect');
      this.notify('Không mở được micro. Bạn vẫn nghe được đối phương.');
      return this.createSilentStream();
    }
  }

  private createSilentStream(): MediaStream {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const dest = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        this.syntheticCtx = ctx;
        return dest.stream;
      }
    } catch {
      // fall through
    }
    return new MediaStream();
  }

  private closeSyntheticContext(): void {
    if (this.syntheticCtx) {
      this.syntheticCtx.close().catch(() => {});
      this.syntheticCtx = null;
    }
  }

  private getVideoSender(): RTCRtpSender | null {
    const tx = this.peerConnection?.getTransceivers().find((t) => t.receiver.track.kind === 'video');
    return tx?.sender ?? null;
  }

  private async tuneScreenSender(sender: RTCRtpSender): Promise<void> {
    try {
      const params = sender.getParameters() as RTCRtpSendParameters & { degradationPreference?: string };
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0].maxBitrate = 3_000_000;
      params.degradationPreference = 'maintain-resolution';
      await sender.setParameters(params);
    } catch (err) {
      logWebrtc('warn', 'TuneScreenSenderFailed', err);
    }
  }

  /** Broadcasts our camera / mic / screen state so the peer renders the right thing (avatar vs video). */
  private sendMediaState(): void {
    const ch = this.stateChannel;
    if (!ch || ch.readyState !== 'open') return;
    const s = useCallStore.getState();
    try {
      ch.send(
        JSON.stringify({ cameraOff: s.isCameraOff, micMuted: s.isMicMuted, screenSharing: s.isScreenSharing })
      );
    } catch (err) {
      logWebrtc('warn', 'StateSendFailed', err);
    }
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    logWebrtc('state', 'CreatePeerConnection', {
      iceServers: RTC_CONFIG.iceServers?.map((s) => s.urls),
    });

    // Pre-negotiated data channel (same id on both sides → no signaling needed)
    const channel = pc.createDataChannel('nomna-state', { negotiated: true, id: 0 });
    channel.onopen = () => {
      logWebrtc('state', 'StateChannelOpen');
      this.sendMediaState();
    };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        useCallStore.getState().setRemoteMedia({
          cameraOff: data.cameraOff === true,
          micMuted: data.micMuted === true,
          screenSharing: data.screenSharing === true,
        });
      } catch {
        // ignore malformed message
      }
    };
    this.stateChannel = channel;

    pc.onicecandidate = (event) => {
      if (this.peerConnection !== pc) return;
      if (event.candidate) {
        const info = parseCandidateInfo(event.candidate.candidate);
        logWebrtc('iceLocal', 'CandidateGenerated', `[${info.type}] ${info.ip}:${info.port} (${info.proto})`);
        signalRService.sendIceCandidate(targetUserId, JSON.stringify(event.candidate)).catch(() => {});
      } else {
        logWebrtc('iceLocal', 'GatheringCompleted');
      }
    };

    pc.ontrack = (event) => {
      if (this.peerConnection !== pc) return;
      const { track } = event;
      logWebrtc('media', 'RemoteTrack', `${track.kind} (${track.id})`);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        useCallStore.getState().setRemoteStream(this.remoteStream);
      }
      if (!this.remoteStream.getTracks().includes(track)) this.remoteStream.addTrack(track);

      const bump = () => useCallStore.getState().bumpRemoteTrackVersion();
      track.onmute = bump;
      track.onunmute = bump;
      track.onended = bump;
      bump();
    };

    pc.oniceconnectionstatechange = () => {
      if (this.peerConnection !== pc) return;
      logWebrtc('state', 'IceConnectionState', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        void this.terminate('Không thể kết nối trực tiếp giữa 2 thiết bị (mạng chặn P2P).');
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.peerConnection !== pc) return;
      logWebrtc('state', 'ConnectionState', pc.connectionState);

      if (pc.connectionState === 'connected') {
        this.clearConnectionTimers();
        useCallStore.getState().setConnected();
        void this.logSelectedCandidatePair(pc);
      } else if (pc.connectionState === 'disconnected') {
        // Usually transient (wifi roaming, CPU spike). Give it time to recover before giving up.
        if (this.disconnectTimer === null) {
          this.disconnectTimer = window.setTimeout(() => {
            this.disconnectTimer = null;
            if (this.peerConnection === pc && pc.connectionState !== 'connected') {
              void this.terminate('Mất kết nối mạng với đối phương.');
            }
          }, DISCONNECT_GRACE_MS);
        }
      } else if (pc.connectionState === 'failed') {
        void this.terminate('Kết nối bị gián đoạn.');
      }
    };

    pc.onsignalingstatechange = () => {
      if (this.peerConnection !== pc) return;
      logWebrtc('state', 'SignalingState', pc.signalingState);
    };

    return pc;
  }

  /** Logs which ICE path won (host = LAN, srflx = via STUN/public IP, relay = via TURN). */
  private async logSelectedCandidatePair(pc: RTCPeerConnection): Promise<void> {
    try {
      const stats = await pc.getStats();
      let pairId: string | undefined;
      stats.forEach((report) => {
        if (report.type === 'transport') {
          pairId = (report as RTCTransportStats).selectedCandidatePairId ?? pairId;
        }
      });
      if (!pairId) return;
      const pair = stats.get(pairId) as RTCIceCandidatePairStats | undefined;
      if (!pair) return;
      const local = stats.get(pair.localCandidateId) as CandidateStats | undefined;
      const remote = stats.get(pair.remoteCandidateId) as CandidateStats | undefined;
      const fmt = (c?: CandidateStats) =>
        c ? `[${(c.candidateType ?? '?').toUpperCase()}] ${c.address ?? 'mdns'}:${c.port ?? '?'} (${c.protocol ?? '?'})` : 'n/a';
      logWebrtc('state', 'SelectedCandidatePair', { local: fmt(local), remote: fmt(remote) });
    } catch {
      // stats are best-effort diagnostics only
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    const pc = this.peerConnection;
    if (!pc || !pc.remoteDescription) return;
    const queued = this.pendingCandidates.splice(0);
    if (queued.length) logWebrtc('iceRemote', 'FlushCandidates', `${queued.length} buffered`);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        logWebrtc('warn', 'FlushCandidateError', err);
      }
    }
  }

  private startConnectTimer(): void {
    if (this.connectTimer !== null) clearTimeout(this.connectTimer);
    this.connectTimer = window.setTimeout(() => {
      this.connectTimer = null;
      if (useCallStore.getState().callStatus === 'connecting') {
        logWebrtc('error', 'ConnectTimeout', 'P2P not established within 30s');
        void this.terminate('Không kết nối được trực tiếp sau 30 giây. Hãy kiểm tra mạng (cùng Wi-Fi / không bật cách ly thiết bị).');
      }
    }, CONNECT_TIMEOUT_MS);
  }

  private clearConnectionTimers(): void {
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.disconnectTimer !== null) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.ringingTimer !== null) {
      clearTimeout(this.ringingTimer);
      this.ringingTimer = null;
    }
    this.clearConnectionTimers();
  }

  private cleanup(): void {
    logWebrtc('state', 'Cleanup', 'Destroying session');
    this.sessionId++;
    this.clearTimers();
    callSound.stop();

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.screenStream = null;
    }

    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.cameraTrack = null;
    this.closeSyntheticContext();

    this.remoteStream?.getTracks().forEach((t) => {
      t.onmute = null;
      t.onunmute = null;
      t.onended = null;
    });
    this.remoteStream = null;

    if (this.stateChannel) {
      this.stateChannel.onopen = null;
      this.stateChannel.onmessage = null;
      this.stateChannel.close();
      this.stateChannel = null;
    }

    const pc = this.peerConnection;
    this.peerConnection = null; // handlers compare against this → become no-ops
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.onsignalingstatechange = null;
      pc.close();
    }

    this.pendingCandidates = [];
    this.activePeerId = null;

    useCallStore.getState().resetCall();
  }
}

export const webrtcService = new WebRtcService();
