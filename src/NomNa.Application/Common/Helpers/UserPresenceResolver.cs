using NomNa.Domain.Enums;

namespace NomNa.Application.Common.Helpers;

/// <summary>
/// Bộ phân giải trạng thái hiển thị chuẩn Discord.
/// Kết hợp giữa kết nối vật lý (Redis) và sở thích của người dùng (StatusPreference).
/// </summary>
public static class UserPresenceResolver
{
    public static string Resolve(bool isOnlineInRedis, UserStatusPreference preference)
    {
        // 1. Không có kết nối trong Redis -> Luôn luôn là offline
        if (!isOnlineInRedis)
            return "offline";

        // 2. Có kết nối trong Redis -> Hiển thị theo preference
        return preference switch
        {
            UserStatusPreference.DoNotDisturb => "dnd",
            UserStatusPreference.Idle         => "away",
            UserStatusPreference.Invisible    => "offline", // Tàng hình: có mạng nhưng cố tình hiện offline
            _                                 => "online"
        };
    }
}
