import * as signalR from '@microsoft/signalr';
import type { Message, MessageEdited, ReactionUpdate, DeletedMessage, Channel, AppNotification } from '../types';

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentChannelId: string | null = null;

  public async startConnection(
    onMessageReceived: (message: Message) => void,
    onUserTyping?: (data: { channelId: string; userId: string; username: string }) => void,
    onUserStoppedTyping?: (data: { channelId: string; userId: string }) => void
  ): Promise<void> {
    if (this.connection) {
      return;
    }

    const rawApiUrl = (import.meta.env.VITE_API_URL as string)?.trim() || '';
    let hubUrl = '/hubs/chat';

    // If VITE_API_URL is an absolute URL (e.g. http://localhost:5000/api in local dev), use its origin
    if (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')) {
      const origin = rawApiUrl.replace(/\/api\/?$/, '');
      hubUrl = `${origin}/hubs/chat`;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('ReceiveMessage', (message: Message) => {
      onMessageReceived(message);
    });

    if (onUserTyping) {
      this.connection.on('UserTyping', onUserTyping);
    }

    if (onUserStoppedTyping) {
      this.connection.on('UserStoppedTyping', onUserStoppedTyping);
    }

    try {
      await this.connection.start();
      console.log('SignalR Connected successfully.');
    } catch (err) {
      console.error('SignalR Connection Error: ', err);
    }
  }

  public async joinChannel(channelId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.currentChannelId && this.currentChannelId !== channelId) {
      await this.connection.invoke('LeaveChannel', this.currentChannelId);
    }

    this.currentChannelId = channelId;
    await this.connection.invoke('JoinChannel', channelId);
  }

  public async joinThread(parentMessageId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinThread', parentMessageId);
    }
  }

  public async leaveThread(parentMessageId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveThread', parentMessageId);
    }
  }

  public async sendThreadReply(parentMessageId: string, content: string): Promise<Message | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('SendThreadReply', parentMessageId, content);
  }

  public onThreadReply(callback: (reply: Message) => void): void {
    if (this.connection) {
      this.connection.on('ReceiveThreadReply', callback);
    }
  }

  public offThreadReply(callback: (reply: Message) => void): void {
    if (this.connection) {
      this.connection.off('ReceiveThreadReply', callback);
    }
  }

  public onThreadReplyCountUpdated(callback: (data: { parentMessageId: string; channelId: string; replyId: string; replyCount?: number; createdAt: string }) => void): void {
    if (this.connection) {
      this.connection.off('ThreadReplyCountUpdated');
      this.connection.on('ThreadReplyCountUpdated', callback);
    }
  }

  public offThreadReplyCountUpdated(callback?: (data: any) => void): void {
    if (this.connection) {
      if (callback) {
        this.connection.off('ThreadReplyCountUpdated', callback);
      } else {
        this.connection.off('ThreadReplyCountUpdated');
      }
    }
  }

  public onReactionUpdated(callback: (update: ReactionUpdate) => void): void {
    if (this.connection) {
      this.connection.on('ReceiveReactionUpdated', callback);
    }
  }

  public offReactionUpdated(callback: (update: ReactionUpdate) => void): void {
    if (this.connection) {
      this.connection.off('ReceiveReactionUpdated', callback);
    }
  }

  public onMessageEdited(callback: (message: MessageEdited) => void): void {
    if (this.connection) {
      this.connection.on('MessageEdited', callback);
    }
  }

  public offMessageEdited(callback: (message: MessageEdited) => void): void {
    if (this.connection) {
      this.connection.off('MessageEdited', callback);
    }
  }

  public onMessageDeleted(callback: (deleted: DeletedMessage) => void): void {
    if (this.connection) {
      this.connection.on('MessageDeleted', callback);
    }
  }

  public offMessageDeleted(callback: (deleted: DeletedMessage) => void): void {
    if (this.connection) {
      this.connection.off('MessageDeleted', callback);
    }
  }

  public onUserStatusChanged(callback: (data: { userId: string; status: 'online' | 'offline' | 'away' | 'dnd' }) => void): void {
    if (this.connection) {
      this.connection.on('UserStatusChanged', callback);
    }
  }

  public offUserStatusChanged(callback: (data: { userId: string; status: 'online' | 'offline' | 'away' | 'dnd' }) => void): void {
    if (this.connection) {
      this.connection.off('UserStatusChanged', callback);
    }
  }

  public onAddedToChannel(callback: (channel: Channel) => void): void {
    if (this.connection) {
      this.connection.on('AddedToChannel', callback);
    }
  }

  public offAddedToChannel(callback: (channel: Channel) => void): void {
    if (this.connection) {
      this.connection.off('AddedToChannel', callback);
    }
  }

  public onChannelMemberAdded(callback: (data: { channelId: string; userId: string; displayName: string }) => void): void {
    if (this.connection) {
      this.connection.on('ChannelMemberAdded', callback);
    }
  }

  public offChannelMemberAdded(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.off('ChannelMemberAdded', callback);
    }
  }

  public onWorkspaceMemberJoined(callback: (data: { workspaceId: string; member?: any; memberCount: number }) => void): void {
    if (this.connection) {
      this.connection.on('WorkspaceMemberJoined', callback);
    }
  }

  public offWorkspaceMemberJoined(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.off('WorkspaceMemberJoined', callback);
    }
  }

  public onMessagePinned(callback: (pinnedMessage: any) => void): void {
    if (this.connection) {
      this.connection.on('MessagePinned', callback);
    }
  }

  public offMessagePinned(callback: (pinnedMessage: any) => void): void {
    if (this.connection) {
      this.connection.off('MessagePinned', callback);
    }
  }

  public onMessageUnpinned(callback: (data: { channelId: string; messageId: string }) => void): void {
    if (this.connection) {
      this.connection.on('MessageUnpinned', callback);
    }
  }

  public offMessageUnpinned(callback: (data: { channelId: string; messageId: string }) => void): void {
    if (this.connection) {
      this.connection.off('MessageUnpinned', callback);
    }
  }

  public onReceiveNotification(callback: (notification: AppNotification) => void): void {
    if (this.connection) {
      this.connection.on('ReceiveNotification', callback);
    }
  }

  public offReceiveNotification(callback: (notification: AppNotification) => void): void {
    if (this.connection) {
      this.connection.off('ReceiveNotification', callback);
    }
  }

  public async getOnlineUsers(): Promise<string[]> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return [];
    }
    try {
      return await this.connection.invoke('GetOnlineUsers');
    } catch (err) {
      console.error('Failed to get online users:', err);
      return [];
    }
  }

  public async sendMessage(
    channelId: string,
    content: string,
    threadId?: string,
    attachments?: Array<{ url: string; fileName: string; fileSize: number; contentType: string; type: string }>
  ): Promise<Message | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('SendMessage', channelId, content, threadId || null, attachments || null);
  }

  public async editMessage(messageId: string, content: string): Promise<MessageEdited | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('EditMessage', messageId, content);
  }

  public async deleteMessage(messageId: string): Promise<DeletedMessage | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('DeleteMessage', messageId);
  }

  public async toggleReaction(messageId: string, emoji: string): Promise<ReactionUpdate | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('ToggleReaction', messageId, emoji);
  }

  public async startTyping(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('StartTyping', channelId);
    }
  }

  public async stopTyping(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('StopTyping', channelId);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.currentChannelId = null;
    }
  }
}

export const signalRService = new SignalRService();
