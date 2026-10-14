import { useMemo } from 'react';
import { Permissions, hasPermission, hasAnyPermission } from '../types/permissions';

export function usePermissions(channelPermissions?: number | string | bigint | null) {
  return useMemo(() => {
    const perms = channelPermissions != null ? BigInt(channelPermissions) : Permissions.Default;

    const check = (req: bigint) => hasPermission(perms, req);
    const checkAny = (req: bigint) => hasAnyPermission(perms, req);

    return {
      permissions: perms,
      hasPermission: check,
      hasAnyPermission: checkAny,

      // Convenience gates
      isAdmin: check(Permissions.Administrator),
      canViewChannel: check(Permissions.ViewChannel),
      canSendMessages: check(Permissions.SendMessages),
      canAttachFiles: check(Permissions.AttachFiles),
      canEmbedLinks: check(Permissions.EmbedLinks),
      canAddReactions: check(Permissions.AddReactions),
      canMentionEveryone: check(Permissions.MentionEveryone),
      canManageMessages: check(Permissions.ManageMessages),
      canManageChannels: check(Permissions.ManageChannels),
      canManageRoles: check(Permissions.ManageRoles),
      canManageServer: check(Permissions.ManageServer),
      canKickMembers: check(Permissions.KickMembers),
      canBanMembers: check(Permissions.BanMembers),
      canConnectVoice: check(Permissions.Connect),
      canSpeakVoice: check(Permissions.Speak),
    };
  }, [channelPermissions]);
}
