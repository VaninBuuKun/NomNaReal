export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export interface ReactionUpdate {
  messageId: string;
  channelId: string;
  threadId?: string | null;
  reactions: ReactionGroup[];
}

export interface DeletedMessage {
  messageId: string;
  channelId: string;
  threadId?: string | null;
}

export interface MessageEdited {
  id: string;
  channelId: string;
  threadId?: string | null;
  content: string;
  isEdited: boolean;
  editedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderDisplayName: string;
  senderUsername: string;
  senderAvatarUrl?: string | null;
  content: string;
  threadId?: string | null;
  isEdited: boolean;
  createdAt: string;
  replyCount?: number;
  reactions?: ReactionGroup[];
}

export interface ThreadDetails {
  parentMessage: Message;
  replies: Message[];
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string | null;
}

