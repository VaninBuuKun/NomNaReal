namespace NomNa.Domain.Enums;

/// <summary>
/// Chế độ hiển thị trạng thái do người dùng thiết lập (Status Preference theo chuẩn Discord).
/// Trạng thái kết nối vật lý (Online/Offline) do Redis quản lý độc lập.
/// </summary>
public enum UserStatusPreference
{
    /// <summary>
    /// Chế độ bình thường: Khi có kết nối Redis thì hiển thị Online (chấm xanh).
    /// </summary>
    Online = 0,

    /// <summary>
    /// Chế độ Vắng mặt / Chờ (Away / Idle): Khi có kết nối Redis thì hiển thị Chờ (chấm vàng).
    /// </summary>
    Idle = 1,

    /// <summary>
    /// Chế độ Đừng làm phiền (Do Not Disturb): Khi có kết nối Redis thì hiển thị Bận (chấm đỏ, tắt chuông thông báo).
    /// </summary>
    DoNotDisturb = 2,

    /// <summary>
    /// Chế độ Ẩn danh / Tàng hình (Invisible): Vẫn kết nối chat bình thường nhưng cố tình hiển thị như Offline (chấm xám) với người khác.
    /// </summary>
    Invisible = 3
}
