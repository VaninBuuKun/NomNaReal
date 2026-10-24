import type { DirectMessageUser } from "./NewDirectMessageModal";

export interface DirectMessageItem {
  id: string;
  user: DirectMessageUser;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  serverId?: string;
  workspaceId?: string;
  isPending?: boolean;
}
