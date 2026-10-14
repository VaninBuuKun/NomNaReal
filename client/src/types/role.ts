export interface Role {
  id: string;
  serverId: string;
  name: string;
  permissions: number | string; // BigInt serialized as number or string from backend
  position: number;
  colorHex?: string | null;
  isHoisted: boolean;
  isMentionable: boolean;
  isDefault: boolean;
  memberCount?: number;
}

export interface CreateRoleRequest {
  name: string;
  permissions?: number | string;
  colorHex?: string | null;
  isHoisted?: boolean;
  isMentionable?: boolean;
}

export interface UpdateRoleRequest {
  name?: string | null;
  permissions?: number | string | null;
  colorHex?: string | null;
  isHoisted?: boolean | null;
  isMentionable?: boolean | null;
  position?: number | null;
}

export const OverwriteType = {
  Role: 0,
  Member: 1,
} as const;

export type OverwriteType = (typeof OverwriteType)[keyof typeof OverwriteType];

export interface ChannelOverwrite {
  id: string;
  channelId: string;
  targetId: string;
  targetType: OverwriteType;
  targetName: string;
  targetColorHex?: string | null;
  allow: number | string;
  deny: number | string;
}

export interface SetChannelOverwriteRequest {
  targetId: string;
  targetType: OverwriteType;
  allow: number | string;
  deny: number | string;
}
