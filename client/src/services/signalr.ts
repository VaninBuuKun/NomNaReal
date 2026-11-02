import * as signalR from "@microsoft/signalr";
import type {
  Message,
  MessageEdited,
  ReactionUpdate,
  DeletedMessage,
  Channel,
  AppNotification,
  CallOfferPayload,
  CallAnswerPayload,
  IceCandidatePayload,
  CallRejectedPayload,
  CallEndedPayload,
} from "../types";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentChannelId: string | null = null;
  private reconnectedCallbacks: Array<(connectionId?: string) => void> = [];
  private statusListeners: Array<(status: ConnectionStatus) => void> = [];
  private status: ConnectionStatus = "connected";

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.statusListeners) listener(next);
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public subscribeStatus(
    listener: (status: ConnectionStatus) => void,
  ): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public async startConnection(
    onMessageReceived: (message: Message) => void,
    onUserTyping?: (data: {
      channelId: string;
      userId: string;
      username: string;
    }) => void,
    onUserStoppedTyping?: (data: { channelId: string; userId: string }) => void,
  ): Promise<void> {
    if (this.connection) {
      return;
    }

    const rawApiUrl = (import.meta.env.VITE_API_URL as string)?.trim() || "";
    let hubUrl = "/hubs/chat";

    // Nếu VITE_API_URL là một URL tuyệt đối (ví dụ http://localhost:5000/api), lấy origin để trỏ vào /hubs/chat
    if (rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")) {
      const origin = rawApiUrl.replace(/\/api\/?$/, "");
      hubUrl = `${origin}/hubs/chat`;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true, // Đính kèm HttpOnly cookie chứa token xác thực
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.onreconnecting(() => this.setStatus("reconnecting"));
    this.connection.onclose(() => this.setStatus("disconnected"));

    this.connection.onreconnected(async (connectionId) => {
      this.setStatus("connected");
      console.log("SignalR Reconnected. ConnectionId:", connectionId);
      // Tự động tham gia lại Channel đang mở sau khi kết nối lại thành công
      if (this.currentChannelId) {
        try {
          await this.connection?.invoke("JoinChannel", this.currentChannelId);
          console.log(
            `Rejoined channel ${this.currentChannelId} after reconnect.`,
          );
        } catch (err) {
          console.error("Failed to rejoin channel after reconnect:", err);
        }
      }
      // Thông báo cho các listener đồng bộ lại dữ liệu bị lỡ trong lúc mất mạng (gap-fill)
      for (const cb of this.reconnectedCallbacks) {
        try {
          cb(connectionId);
        } catch (err) {
          console.error("Error in onReconnected callback:", err);
        }
      }
    });

    this.connection.on("ReceiveMessage", (message: Message) => {
      onMessageReceived(message);
    });

    if (onUserTyping) {
      this.connection.on("UserTyping", onUserTyping);
    }

    if (onUserStoppedTyping) {
      this.connection.on("UserStoppedTyping", onUserStoppedTyping);
    }

    try {
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        console.log("SignalR Connected successfully.");
        this.setStatus("connected");
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("stopped")) {
        return;
      }
      console.error("SignalR Connection Error: ", err);
    }
  }

  public onReconnected(callback: (connectionId?: string) => void): void {
    this.reconnectedCallbacks.push(callback);
  }

  public offReconnected(callback: (connectionId?: string) => void): void {
    this.reconnectedCallbacks = this.reconnectedCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  public async joinChannel(channelId: string): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return;
    }

    if (this.currentChannelId && this.currentChannelId !== channelId) {
      await this.connection.invoke("LeaveChannel", this.currentChannelId);
    }

    this.currentChannelId = channelId;
    await this.connection.invoke("JoinChannel", channelId);
  }
  //on, off chủ yếu là để bật/tắt sự kiện đó k, callback là một hàm, mục tiếu linh động lắng nghe, k lắng nghe để tiết kiệm tài nguyên.
  public onReactionUpdated(callback: (update: ReactionUpdate) => void): void {
    if (this.connection) {
      this.connection.on("ReceiveReactionUpdated", callback);
    }
  }

  public offReactionUpdated(callback: (update: ReactionUpdate) => void): void {
    if (this.connection) {
      this.connection.off("ReceiveReactionUpdated", callback);
    }
  }

  public onMessageEdited(callback: (message: MessageEdited) => void): void {
    if (this.connection) {
      this.connection.on("MessageEdited", callback);
    }
  }

  public offMessageEdited(callback: (message: MessageEdited) => void): void {
    if (this.connection) {
      this.connection.off("MessageEdited", callback);
    }
  }

  public onMessageDeleted(callback: (deleted: DeletedMessage) => void): void {
    if (this.connection) {
      this.connection.on("MessageDeleted", callback);
    }
  }

  public offMessageDeleted(callback: (deleted: DeletedMessage) => void): void {
    if (this.connection) {
      this.connection.off("MessageDeleted", callback);
    }
  }

  public onUserStatusChanged(
    callback: (data: {
      userId: string;
      status: "online" | "offline" | "away" | "dnd";
    }) => void,
  ): void {
    if (this.connection) {
      this.connection.on("UserStatusChanged", callback);
    }
  }

  public offUserStatusChanged(
    callback: (data: {
      userId: string;
      status: "online" | "offline" | "away" | "dnd";
    }) => void,
  ): void {
    if (this.connection) {
      this.connection.off("UserStatusChanged", callback);
    }
  }

  public onAddedToChannel(callback: (channel: Channel) => void): void {
    if (this.connection) {
      this.connection.on("AddedToChannel", callback);
    }
  }

  public offAddedToChannel(callback: (channel: Channel) => void): void {
    if (this.connection) {
      this.connection.off("AddedToChannel", callback);
    }
  }

  public onChannelMemberAdded(
    callback: (data: {
      channelId: string;
      userId: string;
      displayName: string;
    }) => void,
  ): void {
    if (this.connection) {
      this.connection.on("ChannelMemberAdded", callback);
    }
  }

  public offChannelMemberAdded(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.off("ChannelMemberAdded", callback);
    }
  }

  public onWorkspaceMemberJoined(
    callback: (data: {
      workspaceId: string;
      member?: any;
      memberCount: number;
    }) => void,
  ): void {
    this.onServerMemberJoined((data: any) => {
      callback({
        workspaceId: data.serverId || data.workspaceId,
        member: data.member,
        memberCount: data.memberCount,
      });
    });
  }

  public offWorkspaceMemberJoined(callback: (data: any) => void): void {
    this.offServerMemberJoined(callback);
  }

  public onServerMemberJoined(
    callback: (data: {
      serverId: string;
      member?: any;
      memberCount: number;
    }) => void,
  ): void {
    if (this.connection) {
      this.connection.on("ServerMemberJoined", callback);
    }
  }

  public offServerMemberJoined(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.off("ServerMemberJoined", callback);
    }
  }

  public onMessagePinned(callback: (pinnedMessage: any) => void): void {
    if (this.connection) {
      this.connection.on("MessagePinned", callback);
    }
  }

  public offMessagePinned(callback: (pinnedMessage: any) => void): void {
    if (this.connection) {
      this.connection.off("MessagePinned", callback);
    }
  }

  public onMessageUnpinned(
    callback: (data: { channelId: string; messageId: string }) => void,
  ): void {
    if (this.connection) {
      this.connection.on("MessageUnpinned", callback);
    }
  }

  public offMessageUnpinned(
    callback: (data: { channelId: string; messageId: string }) => void,
  ): void {
    if (this.connection) {
      this.connection.off("MessageUnpinned", callback);
    }
  }

  public onReceiveNotification(
    callback: (notification: AppNotification) => void,
  ): void {
    if (this.connection) {
      this.connection.on("ReceiveNotification", callback);
    }
  }

  public offReceiveNotification(
    callback: (notification: AppNotification) => void,
  ): void {
    if (this.connection) {
      this.connection.off("ReceiveNotification", callback);
    }
  }

  public onRemovedFromServer(
    callback: (data: { serverId: string }) => void,
  ): void {
    if (this.connection) {
      this.connection.on("RemovedFromServer", callback);
    }
  }

  public offRemovedFromServer(
    callback: (data: { serverId: string }) => void,
  ): void {
    if (this.connection) {
      this.connection.off("RemovedFromServer", callback);
    }
  }

  public onFriendRequestReceived(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.on("FriendRequestReceived", callback);
    }
  }

  public offFriendRequestReceived(callback?: (data: any) => void): void {
    if (this.connection) {
      if (callback) {
        this.connection.off("FriendRequestReceived", callback);
      } else {
        this.connection.off("FriendRequestReceived");
      }
    }
  }

  public onFriendRequestAccepted(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.on("FriendRequestAccepted", callback);
    }
  }

  public offFriendRequestAccepted(callback?: (data: any) => void): void {
    if (this.connection) {
      if (callback) {
        this.connection.off("FriendRequestAccepted", callback);
      } else {
        this.connection.off("FriendRequestAccepted");
      }
    }
  }

  public onFriendshipRemoved(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.on("FriendshipRemoved", callback);
    }
  }

  public offFriendshipRemoved(callback?: (data: any) => void): void {
    if (this.connection) {
      if (callback) {
        this.connection.off("FriendshipRemoved", callback);
      } else {
        this.connection.off("FriendshipRemoved");
      }
    }
  }

  public async getOnlineUsers(): Promise<string[]> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return [];
    }
    try {
      return await this.connection.invoke("GetOnlineUsers");
    } catch (err) {
      console.error("Failed to get online users:", err);
      return [];
    }
  }

  public async sendMessage(
    channelId: string,
    content: string,
    replyToMessageId?: string | null,
    attachments?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      type: string;
    }>,
  ): Promise<Message | null> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return null;
    }
    return await this.connection.invoke(
      "SendMessage",
      channelId,
      content,
      replyToMessageId || null,
      attachments || null,
    );
  }

  public async editMessage(
    messageId: string,
    content: string,
  ): Promise<MessageEdited | null> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return null;
    }
    return await this.connection.invoke("EditMessage", messageId, content);
  }

  public async deleteMessage(
    messageId: string,
  ): Promise<DeletedMessage | null> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return null;
    }
    return await this.connection.invoke("DeleteMessage", messageId);
  }

  public async toggleReaction(
    messageId: string,
    emoji: string,
  ): Promise<ReactionUpdate | null> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return null;
    }
    return await this.connection.invoke("ToggleReaction", messageId, emoji);
  }

  public async startTyping(channelId: string): Promise<void> {
    if (!channelId || channelId.startsWith("pending-dm-")) return;
    if (
      this.connection &&
      this.connection.state === signalR.HubConnectionState.Connected
    ) {
      try {
        await this.connection.invoke("StartTyping", channelId);
      } catch (err) {
        console.warn("StartTyping warning:", err);
      }
    }
  }

  public async stopTyping(channelId: string): Promise<void> {
    if (!channelId || channelId.startsWith("pending-dm-")) return;
    if (
      this.connection &&
      this.connection.state === signalR.HubConnectionState.Connected
    ) {
      try {
        await this.connection.invoke("StopTyping", channelId);
      } catch (err) {
        console.warn("StopTyping warning:", err);
      }
    }
  }

  // ==========================================
  // Các phương thức Signaling cho Cuộc gọi WebRTC 1v1
  // ==========================================

  public async startCall(
    targetUserId: string,
    offerSdp: string,
    isVideoCall: boolean,
  ): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      throw new Error("SignalR is not connected");
    }
    await this.connection.invoke(
      "StartCall",
      targetUserId,
      offerSdp,
      isVideoCall,
    );
  }

  public async acceptCall(callerId: string, answerSdp: string): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      throw new Error("SignalR is not connected");
    }
    await this.connection.invoke("AcceptCall", callerId, answerSdp);
  }

  public async rejectCall(callerId: string, reason?: string): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return;
    }
    await this.connection.invoke("RejectCall", callerId, reason || null);
  }

  public async endCall(peerUserId: string): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return;
    }
    await this.connection.invoke("EndCall", peerUserId);
  }

  public async sendIceCandidate(
    targetUserId: string,
    candidate: string,
  ): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      return;
    }
    await this.connection.invoke("SendIceCandidate", targetUserId, candidate);
  }

  public onCallIncoming(callback: (payload: CallOfferPayload) => void): void {
    if (this.connection) {
      this.connection.on("CallIncoming", callback);
    }
  }

  public offCallIncoming(callback?: (payload: CallOfferPayload) => void): void {
    if (this.connection) {
      if (callback) this.connection.off("CallIncoming", callback);
      else this.connection.off("CallIncoming");
    }
  }

  public onCallAccepted(callback: (payload: CallAnswerPayload) => void): void {
    if (this.connection) {
      this.connection.on("CallAccepted", callback);
    }
  }

  public offCallAccepted(
    callback?: (payload: CallAnswerPayload) => void,
  ): void {
    if (this.connection) {
      if (callback) this.connection.off("CallAccepted", callback);
      else this.connection.off("CallAccepted");
    }
  }

  public onCallRejected(
    callback: (payload: CallRejectedPayload) => void,
  ): void {
    if (this.connection) {
      this.connection.on("CallRejected", callback);
    }
  }

  public offCallRejected(
    callback?: (payload: CallRejectedPayload) => void,
  ): void {
    if (this.connection) {
      if (callback) this.connection.off("CallRejected", callback);
      else this.connection.off("CallRejected");
    }
  }

  public onCallEnded(callback: (payload: CallEndedPayload) => void): void {
    if (this.connection) {
      this.connection.on("CallEnded", callback);
    }
  }

  public offCallEnded(callback?: (payload: CallEndedPayload) => void): void {
    if (this.connection) {
      if (callback) this.connection.off("CallEnded", callback);
      else this.connection.off("CallEnded");
    }
  }

  public onReceiveIceCandidate(
    callback: (payload: IceCandidatePayload) => void,
  ): void {
    if (this.connection) {
      this.connection.on("ReceiveIceCandidate", callback);
    }
  }

  public offReceiveIceCandidate(
    callback?: (payload: IceCandidatePayload) => void,
  ): void {
    if (this.connection) {
      if (callback) this.connection.off("ReceiveIceCandidate", callback);
      else this.connection.off("ReceiveIceCandidate");
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      const conn = this.connection;
      this.connection = null;
      this.currentChannelId = null;
      try {
        if (conn.state !== signalR.HubConnectionState.Disconnected) {
          await conn.stop();
        }
      } catch {
        // Ignore expected abort during unmounting
      }
    }
  }
}

export const signalRService = new SignalRService();
