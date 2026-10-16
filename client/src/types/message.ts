export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export interface MessageReply {
  id: string;
  senderId: string;
  senderDisplayName: string;
  senderAvatarUrl?: string | null;
  content: string;
  isDeleted: boolean;
}

export interface ReactionToggled {
  messageId: string;
  channelId: string;
  userId: string;
  emoji: string;
  isAdded: boolean;
}

export interface ReactionUpdate {
  messageId: string;
  channelId: string;
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
}

export interface MessageEdited {
  id: string;
  channelId: string;
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
  replyTo?: MessageReply | null;
  isEdited: boolean;
  createdAt: string;
  reactions?: ReactionGroup[];
  attachments?: MessageAttachment[];
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string | null;
  hasOlder?: boolean;
  hasNewer?: boolean;
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


