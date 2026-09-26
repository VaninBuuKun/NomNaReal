import * as signalR from '@microsoft/signalr';
import type { Message } from '../types';

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

    const token = localStorage.getItem('nomna_token');
    if (!token) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/chat', {
        accessTokenFactory: () => localStorage.getItem('nomna_token') || '',
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

  public async sendMessage(channelId: string, content: string, threadId?: string): Promise<Message | null> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return null;
    }
    return await this.connection.invoke('SendMessage', channelId, content, threadId || null);
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
