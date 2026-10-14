using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class Role : BaseEntity
{
    public Guid ServerId { get; set; }
    public Server Server { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public Permissions Permissions { get; set; } = Permissions.Default;
    public int Position { get; set; } = 0;
    public string? ColorHex { get; set; }
    public bool IsHoisted { get; set; } = false;
    public bool IsMentionable { get; set; } = false;
    public bool IsDefault { get; set; } = false; // true cho role @everyone

    public ICollection<MemberRole> MemberRoles { get; set; } = new List<MemberRole>();
}
