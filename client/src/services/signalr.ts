import * as signalR from '@microsoft/signalr';
import type { Message, ReactionUpdate, DeletedMessage } from '../types';

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

    const baseHubUrl = (import.meta.env.VITE_API_URL as string)?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseHubUrl}/hubs/chat`, {
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

  public onMessageEdited(callback: (message: Message) => void): void {
    if (this.connection) {
      this.connection.on('MessageEdited', callback);
    }
  }

  public offMessageEdited(callback: (message: Message) => void): void {
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

  public async sendMessage(channelId: string, content: string, threadId?: string): Promise<Message | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('SendMessage', channelId, content, threadId || null);
  }

  public async editMessage(messageId: string, content: string): Promise<Message | null> {
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
