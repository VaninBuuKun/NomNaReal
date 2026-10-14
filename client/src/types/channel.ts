export const ChannelType = {
  Text: 0,
  Voice: 1,
  DirectMessage: 2,
  Category: 3,
} as const;

export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export interface Channel {
  id: string;
  serverId?: string;
  workspaceId?: string;
  name?: string | null;
  type: ChannelType | number; // 0 = Text, 1 = Voice, 2 = DirectMessage, 3 = Category
  isPrivate: boolean;
  lastMessageAt?: string | null;
  hasUnread?: boolean;
  permissions?: number | string;
  categoryId?: string | null;
  position?: number;
  topic?: string | null;
}

