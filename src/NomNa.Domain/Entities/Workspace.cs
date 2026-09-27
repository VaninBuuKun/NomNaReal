using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

public class Workspace : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string InviteCode { get; set; } = InviteCodeGenerator.Generate(8);
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
}
