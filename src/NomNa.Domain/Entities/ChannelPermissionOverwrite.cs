using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class ChannelPermissionOverwrite : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    /// <summary>
    /// ID của đối tượng bị overwrite (RoleId hoặc UserId).
    /// </summary>
    public Guid TargetId { get; set; }

    /// <summary>
    /// Chỉ định TargetId là Role hay Member cá nhân.
    /// </summary>
    public OverwriteType TargetType { get; set; }

    /// <summary>
    /// Bitmask các quyền được cấp thêm (Allow).
    /// </summary>
    public Permissions Allow { get; set; } = Permissions.None;

    /// <summary>
    /// Bitmask các quyền bị tước đoạt (Deny).
    /// </summary>
    public Permissions Deny { get; set; } = Permissions.None;
}
