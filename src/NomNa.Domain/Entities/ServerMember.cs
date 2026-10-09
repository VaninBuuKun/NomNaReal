using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class ServerMember : BaseEntity
{
    public Guid ServerId { get; set; }
    public Server Server { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public ServerRole Role { get; set; } = ServerRole.Member;
    public string? Nickname { get; set; }
}
