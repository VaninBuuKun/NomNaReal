export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export interface ReactionToggled {
  messageId: string;
  channelId: string;
  threadId?: string | null;
  userId: string;
  emoji: string;
  isAdded: boolean;
}

export interface ReactionUpdate {
  messageId: string;
  channelId: string;
  threadId?: string | null;
  reactions?: ReactionGroup[];
  userId?: string;
  emoji?: string;
  isAdded?: boolean;
}

export interface MessageAttachment {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  type: 'image' | 'video' | 'file';
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
  attachments?: MessageAttachment[];
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

export interface PinnedMessage {
  id: string;
  channelId: string;
  messageId: string;
  pinnedById: string;
  pinnedByName: string;
  pinnedAt: string;
  orderIndex: number;
  message: Message;
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  imageUrl?: string;
  faviconUrl?: string;
}


