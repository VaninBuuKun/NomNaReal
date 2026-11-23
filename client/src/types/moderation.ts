export interface ServerBan {
  id: string;
  serverId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannedById: string;
  bannedByDisplayName: string;
  reason?: string;
  createdAt: string;
}

export type AuditLogActionType =
  | 'MemberKicked'
  | 'MemberBanned'
  | 'MemberUnbanned'
  | 'MemberTimedOut'
  | 'RoleCreated'
  | 'RoleUpdated'
  | 'RoleDeleted'
  | 'ChannelCreated'
  | 'ChannelUpdated'
  | 'ChannelDeleted'
  | 'InviteRegenerated'
  | 'MessagePinned'
  | 'MessageDeletedByMod';

export interface ServerAuditLog {
  id: string;
  serverId: string;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl?: string;
  actionType: AuditLogActionType;
  targetId?: string;
  targetName?: string;
  reason?: string;
  changesJson?: string;
  createdAt: string;
}
