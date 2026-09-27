export const ChannelType = {
  Text: 0,
  Voice: 1,
  DirectMessage: 2,
} as const;

export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export interface Channel {
  id: string;
  workspaceId: string;
  name?: string | null;
  type: ChannelType | number; // 0 = Text, 1 = Voice, 2 = DirectMessage
  isPrivate: boolean;
  lastMessageAt?: string | null;
}
