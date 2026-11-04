import { signalRService } from "./signalr";
import { callSound } from "./callSound";
import { useCallStore } from "../stores/useCallStore";
import type {
  CallPeer,
  CallOfferPayload,
  CallAnswerPayload,
  IceCandidatePayload,
} from "../types";

// ============================================================================
// Bộ công cụ ghi Log trực quan cho WebRTC (Mở F12 → Console, gõ filter "WebRTC")
// ============================================================================
const BADGE =
  "color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;";
const LOG_COLORS = {
  signaling: `background: #6366f1; ${BADGE}`,
  iceLocal: `background: #0ea5e9; ${BADGE}`,
  iceRemote: `background: #14b8a6; ${BADGE}`,
  state: `background: #8b5cf6; ${BADGE}`,
  media: `background: #10b981; ${BADGE}`,
  warn: "background: #f59e0b; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
  error: `background: #ef4444; ${BADGE}`,
};

function logWebrtc(
  category: keyof typeof LOG_COLORS,
  title: string,
  details?: unknown,
) {
  const badge = `[WebRTC:${title}]`;
  const style = LOG_COLORS[category];
  if (details !== undefined) {
    console.log(`%c${badge}%c`, style, "color: inherit;", details);
  } else {
    console.log(`%c${badge}%c`, style, "color: inherit;");
  }
}

interface CandidateInfo {
  type: string;
  proto: string;
  ip: string;
  port: string;
}

/**
 * Phân tích chuỗi candidate thô để lấy ra loại kết nối, IP và Port dễ đọc:
 * Ví dụ: "candidate:842163049 1 udp 1677729535 192.168.1.15 58231 typ host ..."
 */
function parseCandidateInfo(candStr: string): CandidateInfo {
  const parts = candStr.trim().split(" ");
  const proto = parts[2] ? parts[2].toUpperCase() : "UDP";
  const ip = parts[4] || "unknown-ip";
  const port = parts[5] || "unknown-port";
  const typeIndex = parts.indexOf("typ");
  const type =
    typeIndex !== -1 && parts[typeIndex + 1]
      ? parts[typeIndex + 1].toUpperCase()
      : "UNKNOWN";
  return { type, proto, ip, port };
}

// ============================================================================
// Cấu hình các mốc thời gian và STUN/TURN server
// ============================================================================
const RING_TIMEOUT_MS = 35_000; // Đổ chuông 35s không ai bắt máy -> Tự động hủy
const CONNECT_TIMEOUT_MS = 30_000; // Đã bắt máy nhưng quá 30s không nối được P2P -> Báo lỗi mạng
const DISCONNECT_GRACE_MS = 8_000; // Cho phép mạng chập chờn tối đa 8s trước khi dập máy
const NOTICE_MS = 5_000; // Thời gian hiển thị thông báo lỗi (5 giây)

/**
 * Xây dựng danh sách STUN/TURN server để tìm đường kết nối xuyên qua NAT/Router
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  // TURN relay dự phòng (cần thiết khi cả 2 máy đều ở sau mạng Symmetric NAT / tường lửa doanh nghiệp)
  const turnUrl = (import.meta.env.VITE_TURN_URL as string | undefined)?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()),
      username:
        (import.meta.env.VITE_TURN_USERNAME as string | undefined) ?? "",
      credential:
        (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) ?? "",
    });
  }
  return servers;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: buildIceServers(),
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// Cấu hình lọc âm thanh: chống hú, khử ồn, tự cân chỉnh âm lượng
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

// Cấu hình camera mặc định (HD 720p)
const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
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
   * Tăng dần mỗi khi bắt đầu phiên mới hoặc dọn dẹp. Bất kỳ tác vụ async nào sau `await`
   * đều so sánh lại sessionId này để phát hiện xem cuộc gọi có bị hủy giữa chừng không
   * (ví dụ: người dùng dập máy lúc đang bấm cho phép camera), giúp tránh tình trạng cuộc gọi ma (zombie calls).
   */
  private sessionId = 0;

  private ringingTimer: number | null = null;
  private connectTimer: number | null = null;
  private disconnectTimer: number | null = null;
  private noticeTimer: number | null = null;

  // ==========================================================================
  // Đăng ký các bộ lắng nghe sự kiện Signaling từ SignalR
  // ==========================================================================

  /** Gọi một lần duy nhất khi khởi động ứng dụng (idempotent - gọi nhiều lần không sao) */
  public initSignalRListeners(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    logWebrtc("signaling", "Init", "SignalR call listeners registered");

    // 1. Nhận được cuộc gọi đến (Incoming Offer) từ người khác
    signalRService.onCallIncoming((payload: CallOfferPayload) => {
      const { callStatus } = useCallStore.getState();
      logWebrtc("signaling", "CallIncoming", {
        from: payload.callerName,
        isVideo: payload.isVideoCall,
        currentStatus: callStatus,
      });

      // Nếu đang trong cuộc gọi khác thì tự động từ chối và báo bận
      if (callStatus !== "idle") {
        logWebrtc(
          "warn",
          "BusyReject",
          `Auto-rejecting: current status is ${callStatus}`,
        );
        signalRService
          .rejectCall(
            payload.callerId,
            "Người nhận đang bận trong cuộc gọi khác.",
          )
          .catch(() => {});
        return;
      }

      this.clearTimers();
      this.activePeerId = payload.callerId;
      useCallStore.getState().setIncomingCall(payload);
      callSound.playIncomingRing();

      // Đặt hẹn giờ 35s không trả lời thì tự hủy cuộc gọi
      this.ringingTimer = window.setTimeout(() => {
        logWebrtc("warn", "IncomingTimeout", "No answer within 35s");
        void this.rejectCall("Cuộc gọi nhỡ (không có phản hồi)");
      }, RING_TIMEOUT_MS);
    });

    // 2. Nhận được câu trả lời chấp nhận (Call Accepted - Phía người gọi nhận được Answer SDP)
    signalRService.onCallAccepted(async (payload: CallAnswerPayload) => {
      const { callStatus } = useCallStore.getState();
      const pc = this.peerConnection;
      if (
        callStatus !== "outgoing" ||
        !pc ||
        !sameId(payload.responderId, this.activePeerId)
      ) {
        logWebrtc("warn", "CallAcceptedIgnored", {
          callStatus,
          hasPc: Boolean(pc),
        });
        return;
      }

      logWebrtc("signaling", "CallAccepted", { sdpBytes: payload.sdp?.length });
      const sid = this.sessionId;
      this.clearTimers();
      callSound.stop();
      useCallStore.getState().setConnecting();
      this.startConnectTimer();

      try {
        // pc đã được tạo từ lúc bấm nút Gọi.
        // Nạp Answer SDP của đối phương vào pc trước, sau đó mới xả hàng đợi flushPendingCandidates!
        await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
        if (this.isStale(sid)) return;
        await this.flushPendingCandidates();
      } catch (err) {
        logWebrtc("error", "SetRemoteAnswerFailed", err);
        if (!this.isStale(sid))
          await this.terminate("Không thể thiết lập cuộc gọi (SDP lỗi).");
      }
    });

    // 3. Cuộc gọi bị đối phương từ chối (Call Rejected)
    signalRService.onCallRejected((payload) => {
      logWebrtc("signaling", "CallRejected", payload);
      if (this.activePeerId && !sameId(payload.peerId, this.activePeerId))
        return;
      callSound.stop();
      callSound.playCallEnd();
      this.cleanup();
      this.notify(payload.reason || "Cuộc gọi đã bị từ chối");
    });

    // 4. Đối phương dập máy kết thúc cuộc gọi (Call Ended)
    signalRService.onCallEnded((payload) => {
      logWebrtc("signaling", "CallEnded", payload);
      if (this.activePeerId && !sameId(payload.peerId, this.activePeerId))
        return;
      const { callStatus, peer } = useCallStore.getState();
      if (callStatus === "idle") return;

      callSound.stop();
      this.cleanup();
      if (callStatus === "incoming") {
        this.notify(`Cuộc gọi nhỡ từ ${peer?.displayName ?? "người dùng"}`);
      } else {
        callSound.playCallEnd();
      }
    });

    // 5. Nhận gói tin tìm đường ICE Candidate từ đối phương
    signalRService.onReceiveIceCandidate(
      async (payload: IceCandidatePayload) => {
        if (useCallStore.getState().callStatus === "idle") return;
        if (this.activePeerId && !sameId(payload.senderId, this.activePeerId))
          return;

        try {
          const candidateInit: RTCIceCandidateInit =
            typeof payload.candidate === "string"
              ? JSON.parse(payload.candidate)
              : payload.candidate;

          if (candidateInit.candidate) {
            const info = parseCandidateInfo(candidateInit.candidate);
            logWebrtc(
              "iceRemote",
              "CandidateReceived",
              `[${info.type}] ${info.ip}:${info.port} (${info.proto})`,
            );
          }

          const pc = this.peerConnection;
          // QUY TẮC CỐT LÕI: Chỉ nạp Candidate vào pc KHI ĐÃ CÓ remoteDescription (SDP)!
          // Nếu SDP chưa nạp xong thì tạm thời lưu vào hàng đợi pendingCandidates.
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(candidateInit);
          } else {
            this.pendingCandidates.push(candidateInit);
          }
        } catch (err) {
          logWebrtc("warn", "CandidateError", err);
        }
      },
    );
  }

  // ==========================================================================
  // Các hàm điều khiển cuộc gọi công khai (Public Call Controls)
  // ==========================================================================

  /**
   * Bắt đầu cuộc gọi 1v1 tới một người dùng
   */
  public async startCall(peer: CallPeer, isVideo: boolean): Promise<void> {
    const store = useCallStore.getState();
    if (store.callStatus !== "idle") {
      logWebrtc(
        "warn",
        "StartCallIgnored",
        `Already in state "${store.callStatus}"`,
      );
      return;
    }

    this.cleanup();
    const sid = this.sessionId;
    this.activePeerId = peer.id;

    logWebrtc("signaling", "StartCall", { target: peer.displayName, isVideo });
    useCallStore.getState().setOutgoingCall(peer, isVideo);
    callSound.playOutgoingRing();

    // Hẹn giờ 35s nếu bên kia không nghe máy thì dập máy
    this.ringingTimer = window.setTimeout(() => {
      logWebrtc("warn", "OutgoingTimeout", "No answer within 35s");
      void this.terminate("Người nhận không nhấc máy.");
    }, RING_TIMEOUT_MS);

    try {
      // 1. Mở micro và camera của máy mình
      const stream = await this.acquireMedia(isVideo);
      if (this.isStale(sid)) return this.discardStream(stream);
      this.attachLocalStream(stream);

      // 2. Khởi tạo đối tượng PeerConnection
      const pc = this.createPeerConnection(peer.id);
      this.peerConnection = pc;

      // 3. Khai báo sẵn cả 2 m-lines (audio & video) để sau này có bật cam hay chia sẻ màn hình
      // thì chỉ cần dùng replaceTrack() mà không cần phải thương lượng lại SDP (re-negotiation).
      const audioTrack = stream.getAudioTracks()[0] ?? null;
      if (audioTrack)
        pc.addTransceiver(audioTrack, {
          direction: "sendrecv",
          streams: [stream],
        });
      else pc.addTransceiver("audio", { direction: "sendrecv" });

      if (this.cameraTrack)
        pc.addTransceiver(this.cameraTrack, {
          direction: "sendrecv",
          streams: [stream],
        });
      else pc.addTransceiver("video", { direction: "sendrecv" });

      // 4. Tạo Offer SDP và lưu vào LocalDescription của chính mình
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.isStale(sid)) return;
      logWebrtc(
        "signaling",
        "OfferCreated",
        `SDP ${offer.sdp?.length ?? 0} bytes`,
      );

      // 5. Gửi Offer SDP sang cho người nhận qua SignalR
      await signalRService.startCall(peer.id, offer.sdp || "", isVideo);
    } catch (err) {
      if (this.isStale(sid)) return;
      logWebrtc("error", "StartCallFailed", err);
      callSound.stop();
      this.cleanup();
      this.notify(this.describeMediaError(err, "Không thể bắt đầu cuộc gọi."));
    }
  }

  /**
   * Người nhận bấm nút Chấp nhận cuộc gọi (Nút Xanh)
   */
  public async acceptCall(): Promise<void> {
    const { incomingOffer, callStatus } = useCallStore.getState();
    if (!incomingOffer || callStatus !== "incoming") return;

    this.clearTimers();
    callSound.stop();
    const sid = ++this.sessionId;
    this.activePeerId = incomingOffer.callerId;
    useCallStore.getState().setConnecting();

    logWebrtc("signaling", "AcceptCall", {
      from: incomingOffer.callerName,
      isVideo: incomingOffer.isVideoCall,
    });

    try {
      // 1. Mở camera/micro của người nhận
      const stream = await this.acquireMedia(incomingOffer.isVideoCall);
      if (this.isStale(sid)) return this.discardStream(stream);
      this.attachLocalStream(stream);

      // 2. Tạo đối tượng PeerConnection cho người nhận
      const pc = this.createPeerConnection(incomingOffer.callerId);
      this.peerConnection = pc;

      // 3. Nạp Offer SDP của người gọi vào pc trước để tạo transceiver tương ứng
      await pc.setRemoteDescription({ type: "offer", sdp: incomingOffer.sdp });
      if (this.isStale(sid)) return;

      // 4. Gắn audio & video track của máy mình vào các transceiver đã mở
      const audioTrack = stream.getAudioTracks()[0] ?? null;
      for (const tx of pc.getTransceivers()) {
        const track =
          tx.receiver.track.kind === "audio" ? audioTrack : this.cameraTrack;
        tx.direction = "sendrecv";
        if (track) await tx.sender.replaceTrack(track);
      }

      // 5. Xả các ICE Candidate đã nhận được từ trước (nếu có)
      await this.flushPendingCandidates();

      // 6. Tạo Answer SDP và lưu vào LocalDescription
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (this.isStale(sid)) return;
      logWebrtc(
        "signaling",
        "AnswerCreated",
        `SDP ${answer.sdp?.length ?? 0} bytes`,
      );

      // 7. Gửi Answer SDP ngược về cho người gọi qua SignalR
      await signalRService.acceptCall(incomingOffer.callerId, answer.sdp || "");
      if (!this.isStale(sid)) this.startConnectTimer();
    } catch (err) {
      if (this.isStale(sid)) return;
      logWebrtc("error", "AcceptCallFailed", err);
      const message = this.describeMediaError(
        err,
        "Không thể kết nối cuộc gọi.",
      );
      await this.rejectCall("Lỗi thiết bị truyền thông");
      this.notify(message);
    }
  }

  /**
   * Người nhận bấm nút Từ chối cuộc gọi (Nút Đỏ)
   */
  public async rejectCall(reason?: string): Promise<void> {
    const { incomingOffer, peer } = useCallStore.getState();
    const callerId = incomingOffer?.callerId || peer?.id || this.activePeerId;
    logWebrtc("signaling", "RejectCall", { callerId, reason });
    callSound.stop();
    this.cleanup();
    if (callerId) {
      try {
        await signalRService.rejectCall(callerId, reason);
      } catch (err) {
        logWebrtc("warn", "RejectDispatchError", err);
      }
    }
  }

  /**
   * Người dùng chủ động dập máy kết thúc cuộc gọi
   */
  public async endCall(): Promise<void> {
    callSound.stop();
    callSound.playCallEnd();
    await this.terminate();
  }

  /**
   * Bật/Tắt Micro
   */
  public toggleMic(): void {
    const next = !useCallStore.getState().isMicMuted; //muted : tắt tiếng
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !next));
    useCallStore.getState().setMicMuted(next);
    this.sendMediaState();
  }

  /**
   * Bật/Tắt Camera
   */
  public async toggleCamera(): Promise<void> {
    const store = useCallStore.getState();
    if (!this.localStream) return;

    // Nếu camera đã được bật trước đó -> chỉ cần chuyển trạng thái track.enabled
    if (this.cameraTrack) {
      const nextOff = !store.isCameraOff;
      this.cameraTrack.enabled = !nextOff;
      useCallStore.getState().setCameraOff(nextOff);
      this.sendMediaState();
      return;
    }

    // Nếu ban đầu là cuộc gọi thoại (chưa xin camera) -> thử xin quyền mở camera ngay lúc này
    const sid = this.sessionId;
    try {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: CAMERA_CONSTRAINTS,
      });
      const track = cam.getVideoTracks()[0];
      if (!track) return;
      if (this.isStale(sid) || !this.localStream) {
        track.stop();
        return;
      }
      this.cameraTrack = track;
      this.localStream.addTrack(track);
      if (!this.screenStream) await this.getVideoSender()?.replaceTrack(track);
      logWebrtc("media", "CameraEnabled", track.label);
      useCallStore.getState().setCameraOff(false);
      this.sendMediaState();
    } catch (err) {
      logWebrtc("warn", "CameraEnableFailed", err);
      this.notify(
        "Không thể bật camera (bị chặn hoặc đang được ứng dụng / tab khác sử dụng).",
      );
    }
  }

  /**
   * Bắt đầu chia sẻ màn hình
   */
  public async startScreenShare(): Promise<void> {
    const pc = this.peerConnection;
    if (!pc || this.screenStream) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.notify("Thiết bị này không hỗ trợ chia sẻ màn hình.");
      return;
    }

    const sid = this.sessionId;
    try {
      logWebrtc("media", "StartScreenShare", "Prompting display picker");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (!track || this.isStale(sid)) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Báo bộ nén ưu tiên giữ chữ sắc nét (detail) thay vì làm mượt khung hình
      (track as MediaStreamTrack & { contentHint?: string }).contentHint =
        "detail";

      const sender = this.getVideoSender();
      if (!sender) {
        stream.getTracks().forEach((t) => t.stop());
        this.notify("Kết nối chưa sẵn sàng để chia sẻ màn hình.");
        return;
      }

      // Thay thế track camera bằng track màn hình trực tiếp
      await sender.replaceTrack(track);
      await this.tuneScreenSender(sender);

      this.screenStream = stream;
      // Khi người dùng bấm nút "Dừng chia sẻ" trên thanh popup của trình duyệt
      track.onended = () => {
        logWebrtc("media", "ScreenShareNativeEnded", "Stopped via browser UI");
        void this.stopScreenShare();
      };

      logWebrtc("media", "ScreenShareStarted", track.label);
      useCallStore.getState().setScreenSharing(true);
      this.sendMediaState();
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return; // Người dùng bấm Hủy
      logWebrtc("error", "ScreenShareFailed", err);
      this.notify("Không thể chia sẻ màn hình.");
    }
  }

  /**
   * Dừng chia sẻ màn hình và phục hồi lại camera ban đầu
   */
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
      logWebrtc("warn", "RestoreCameraFailed", err);
    }

    logWebrtc("media", "ScreenShareStopped", "Camera track restored");
    useCallStore.getState().setScreenSharing(false);
    this.sendMediaState();
  }

  // ==========================================================================
  // Các hàm tiện ích nội bộ (Internal Helpers)
  // ==========================================================================

  private isStale(sid: number): boolean {
    return sid !== this.sessionId;
  }

  private discardStream(stream: MediaStream): void {
    stream.getTracks().forEach((t) => t.stop());
    this.closeSyntheticContext();
  }

  /** Dập máy, báo đối phương và dọn dẹp sạch tài nguyên */
  private async terminate(notice?: string): Promise<void> {
    const peerId = this.activePeerId || useCallStore.getState().peer?.id;
    logWebrtc("signaling", "EndCall", { peerId, notice });
    this.cleanup();
    if (peerId) {
      try {
        await signalRService.endCall(peerId);
      } catch (err) {
        logWebrtc("warn", "EndCallDispatchError", err);
      }
    }
    if (notice) this.notify(notice);
  }

  private notify(message: string, durationMs = NOTICE_MS): void {
    useCallStore.getState().setError(message);
    if (this.noticeTimer !== null) clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      this.noticeTimer = null;
      if (useCallStore.getState().error === message)
        useCallStore.getState().setError(null);
    }, durationMs);
  }

  private describeMediaError(err: unknown, fallback: string): string {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError")
      return "Hãy cấp quyền Micro/Camera cho trình duyệt rồi thử lại.";
    if (name === "NotFoundError")
      return "Không tìm thấy micro hoặc camera trên thiết bị.";
    if (name === "NotReadableError")
      return "Micro/Camera đang được ứng dụng hoặc tab khác sử dụng.";
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
   * Xin quyền Micro (+ Camera nếu là video call) theo cơ chế hạ cấp mượt mà (Graceful Degradation):
   * 1. Camera + Mic  ->  2. Chỉ Mic (nếu cam bận/không có)  ->  3. Stream câm (nếu mic bị chiếm khi mở 2 tab cùng máy)
   * Chỉ khi người dùng bấm Từ Chối cấp quyền mới báo lỗi.
   */
  private async acquireMedia(isVideo: boolean): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Trình duyệt chỉ cho dùng Micro/Camera qua HTTPS hoặc localhost.",
      );
    }

    if (isVideo) {
      try {
        logWebrtc("media", "RequestMedia", "Camera + Microphone");
        return await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
          video: CAMERA_CONSTRAINTS,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError")
          throw err;
        logWebrtc("warn", "CameraUnavailable", err);
        this.notify(
          "Không mở được camera (đang được tab/ứng dụng khác dùng). Bạn vẫn nghe và xem được đối phương.",
        );
      }
    }

    try {
      logWebrtc("media", "RequestMedia", "Microphone only");
      return await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError")
        throw err;
      logWebrtc(
        "warn",
        "MicUnavailable",
        "Using a silent stream so the call can still connect",
      );
      this.notify("Không mở được micro. Bạn vẫn nghe được đối phương.");
      return this.createSilentStream();
    }
  }

  /** Tạo luồng âm thanh câm giả lập nếu micro phần cứng bị khóa độc quyền */
  private createSilentStream(): MediaStream {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
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
    const tx = this.peerConnection
      ?.getTransceivers()
      .find((t) => t.receiver.track.kind === "video");
    return tx?.sender ?? null;
  }

  private async tuneScreenSender(sender: RTCRtpSender): Promise<void> {
    try {
      const params = sender.getParameters() as RTCRtpSendParameters & {
        degradationPreference?: string;
      };
      if (!params.encodings || params.encodings.length === 0)
        params.encodings = [{}];
      params.encodings[0].maxBitrate = 3_000_000;
      params.degradationPreference = "maintain-resolution";
      await sender.setParameters(params);
    } catch (err) {
      logWebrtc("warn", "TuneScreenSenderFailed", err);
    }
  }

  /** Phát trạng thái Camera/Mic/Màn hình qua RTCDataChannel để bên kia biết hiển thị avatar hay video */
  private sendMediaState(): void {
    const ch = this.stateChannel;
    if (!ch || ch.readyState !== "open") return;
    const s = useCallStore.getState();
    try {
      ch.send(
        JSON.stringify({
          cameraOff: s.isCameraOff,
          micMuted: s.isMicMuted,
          screenSharing: s.isScreenSharing,
        }),
      );
    } catch (err) {
      logWebrtc("warn", "StateSendFailed", err);
    }
  }

  /**
   * Khởi tạo đối tượng RTCPeerConnection và đăng ký các sự kiện mạng
   */
  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    logWebrtc("state", "CreatePeerConnection", {
      iceServers: RTC_CONFIG.iceServers?.map((s) => s.urls),
    });

    // Kênh truyền dữ liệu trạng thái nhanh (RTCDataChannel)
    const channel = pc.createDataChannel("nomna-state", {
      negotiated: true,
      id: 0,
    });
    channel.onopen = () => {
      logWebrtc("state", "StateChannelOpen");
      this.sendMediaState();
    };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<
          string,
          unknown
        >;
        useCallStore.getState().setRemoteMedia({
          cameraOff: data.cameraOff === true,
          micMuted: data.micMuted === true,
          screenSharing: data.screenSharing === true,
        });
      } catch {
        // bỏ qua gói tin lỗi
      }
    };
    this.stateChannel = channel;

    // Trình duyệt tự sinh ra địa chỉ mạng (ICE Candidate) của máy mình -> Gửi sang bên kia qua SignalR
    pc.onicecandidate = (event) => {
      if (this.peerConnection !== pc) return;
      if (event.candidate) {
        const info = parseCandidateInfo(event.candidate.candidate);
        logWebrtc(
          "iceLocal",
          "CandidateGenerated",
          `[${info.type}] ${info.ip}:${info.port} (${info.proto})`,
        );
        signalRService
          .sendIceCandidate(targetUserId, JSON.stringify(event.candidate))
          .catch(() => {});
      } else {
        logWebrtc("iceLocal", "GatheringCompleted");
      }
    };

    // Khi nhận được luồng hình ảnh hoặc âm thanh từ đối phương truyền sang
    pc.ontrack = (event) => {
      if (this.peerConnection !== pc) return;
      const { track } = event;
      logWebrtc("media", "RemoteTrack", `${track.kind} (${track.id})`);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        useCallStore.getState().setRemoteStream(this.remoteStream);
      }
      if (!this.remoteStream.getTracks().includes(track))
        this.remoteStream.addTrack(track);

      const bump = () => useCallStore.getState().bumpRemoteTrackVersion();
      track.onmute = bump;
      track.onunmute = bump;
      track.onended = bump;
      bump();
    };

    pc.oniceconnectionstatechange = () => {
      if (this.peerConnection !== pc) return;
      logWebrtc("state", "IceConnectionState", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        void this.terminate(
          "Không thể kết nối trực tiếp giữa 2 thiết bị (mạng chặn P2P).",
        );
      }
    };

    // Theo dõi trạng thái kết nối mạng tổng thể giữa 2 máy
    pc.onconnectionstatechange = () => {
      if (this.peerConnection !== pc) return;
      logWebrtc("state", "ConnectionState", pc.connectionState);

      if (pc.connectionState === "connected") {
        this.clearConnectionTimers();
        useCallStore.getState().setConnected();
        void this.logSelectedCandidatePair(pc);
      } else if (pc.connectionState === "disconnected") {
        // Mạng có thể bị chập chờn tạm thời (chuyển wifi, CPU quá tải) -> Cho 8 giây để tự hồi phục
        if (this.disconnectTimer === null) {
          this.disconnectTimer = window.setTimeout(() => {
            this.disconnectTimer = null;
            if (
              this.peerConnection === pc &&
              pc.connectionState !== "connected"
            ) {
              void this.terminate("Mất kết nối mạng với đối phương.");
            }
          }, DISCONNECT_GRACE_MS);
        }
      } else if (pc.connectionState === "failed") {
        void this.terminate("Kết nối bị gián đoạn.");
      }
    };

    pc.onsignalingstatechange = () => {
      if (this.peerConnection !== pc) return;
      logWebrtc("state", "SignalingState", pc.signalingState);
    };

    return pc;
  }

  /** Ghi log chẩn đoán xem cặp kết nối nào đã chiến thắng (host = mạng LAN nội bộ, srflx = qua STUN/IP public, relay = qua TURN) */
  private async logSelectedCandidatePair(pc: RTCPeerConnection): Promise<void> {
    try {
      const stats = await pc.getStats();
      let pairId: string | undefined;
      stats.forEach((report) => {
        if (report.type === "transport") {
          pairId =
            (report as RTCTransportStats).selectedCandidatePairId ?? pairId;
        }
      });
      if (!pairId) return;
      const pair = stats.get(pairId) as RTCIceCandidatePairStats | undefined;
      if (!pair) return;
      const local = stats.get(pair.localCandidateId) as
        | CandidateStats
        | undefined;
      const remote = stats.get(pair.remoteCandidateId) as
        | CandidateStats
        | undefined;
      const fmt = (c?: CandidateStats) =>
        c
          ? `[${(c.candidateType ?? "?").toUpperCase()}] ${c.address ?? "mdns"}:${c.port ?? "?"} (${c.protocol ?? "?"})`
          : "n/a";
      logWebrtc("state", "SelectedCandidatePair", {
        local: fmt(local),
        remote: fmt(remote),
      });
    } catch {
      // stats chỉ để phục vụ chẩn đoán
    }
  }

  /**
   * Xả hàng đợi: Nạp tất cả các ICE Candidate đang chờ vào pc sau khi đã nạp xong SDP
   */
  private async flushPendingCandidates(): Promise<void> {
    const pc = this.peerConnection;
    if (!pc || !pc.remoteDescription) return;
    const queued = this.pendingCandidates.splice(0);
    if (queued.length)
      logWebrtc("iceRemote", "FlushCandidates", `${queued.length} buffered`);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        logWebrtc("warn", "FlushCandidateError", err);
      }
    }
  }

  private startConnectTimer(): void {
    if (this.connectTimer !== null) clearTimeout(this.connectTimer);
    this.connectTimer = window.setTimeout(() => {
      this.connectTimer = null;
      if (useCallStore.getState().callStatus === "connecting") {
        logWebrtc("error", "ConnectTimeout", "P2P not established within 30s");
        void this.terminate(
          "Không kết nối được trực tiếp sau 30 giây. Hãy kiểm tra mạng (cùng Wi-Fi / không bật cách ly thiết bị).",
        );
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

  /**
   * Dọn dẹp sạch sẽ toàn bộ tài nguyên khi kết thúc cuộc gọi
   * (Tắt micro, tắt camera, đóng DataChannel, đóng PeerConnection và reset Store)
   */
  private cleanup(): void {
    logWebrtc("state", "Cleanup", "Destroying session");
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
    this.peerConnection = null;
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
