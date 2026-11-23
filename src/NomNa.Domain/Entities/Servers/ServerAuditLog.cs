using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

/// <summary>
/// Append-only immutable audit log record documenting administrative actions in a server.
/// </summary>
public class ServerAuditLog : BaseEntity
{
    public Guid ServerId { get; set; }
    public Server Server { get; set; } = null!;

    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;

    public AuditLogActionType ActionType { get; set; }

    public Guid? TargetId { get; set; }
    public string? TargetName { get; set; }
    public string? Reason { get; set; }
    public string? ChangesJson { get; set; }
}

