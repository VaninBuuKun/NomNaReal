namespace NomNa.Domain.Enums;

/// <summary>
/// Audit log action types representing administrative and moderation events in a server.
/// </summary>
public enum AuditLogActionType
{
    MemberKicked = 1,
    MemberBanned = 2,
    MemberUnbanned = 3,
    MemberTimedOut = 4,
    RoleCreated = 5,
    RoleUpdated = 6,
    RoleDeleted = 7,
    ChannelCreated = 8,
    ChannelUpdated = 9,
    ChannelDeleted = 10,
    InviteRegenerated = 11,
    MessagePinned = 12,
    MessageDeletedByMod = 13,
}

