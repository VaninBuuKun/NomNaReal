using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? ActorId { get; set; }
    public User? Actor { get; set; }

    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    public Guid? ServerId { get; set; }
    public Server? Server { get; set; }

    public Guid? ChannelId { get; set; }
    public Channel? Channel { get; set; }

    public Guid? MessageId { get; set; }
    public Message? Message { get; set; }

    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }
}
