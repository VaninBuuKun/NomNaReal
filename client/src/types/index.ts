export type UserStatus = 0 | 1 | 2 | 3; // Online, Away, DoNotDisturb, Offline

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  inviteCode: string;
  ownerId: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  topic?: string | null;
  type: number;
  isPrivate: boolean;
}

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
  lastReplyAt?: string | null;
  reactions?: ReactionGroup[];
}

export interface ThreadDetails {
  parentMessage: Message;
  replies: Message[];
}
