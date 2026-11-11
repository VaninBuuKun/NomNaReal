using NomNa.Domain.Enums;

namespace NomNa.Application.Common.Helpers;

/// <summary>
/// Discord-grade presence display resolver.
/// Combines physical connection state (from Redis lease) with user status preference.
/// </summary>
public static class UserPresenceResolver
{
    public static string Resolve(bool isOnlineInRedis, UserStatusPreference preference)
    {
        // 1. No active connection lease in Redis -> Always offline
        if (!isOnlineInRedis)
            return "offline";

        // 2. Active lease exists in Redis -> Map according to preference
        return preference switch
        {
            UserStatusPreference.DoNotDisturb => "dnd",
            UserStatusPreference.Idle         => "away",
            UserStatusPreference.Invisible    => "offline", // Invisible: connected but intentionally appearing offline
            _                                 => "online"
        };
    }
}
