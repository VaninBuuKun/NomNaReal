using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

public class MemberRole : BaseEntity
{
    public Guid ServerMemberId { get; set; }
    public ServerMember ServerMember { get; set; } = null!;

    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
