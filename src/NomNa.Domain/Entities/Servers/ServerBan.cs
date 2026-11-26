using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

/// <summary>
/// Represents a user permanently or indefinitely banned from a server.
/// </summary>
public class ServerBan : BaseEntity
{
    public Guid ServerId { get; set; }
    public Server Server { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid BannedById { get; set; }
    public User BannedBy { get; set; } = null!;

    public string? Reason { get; set; }
}

