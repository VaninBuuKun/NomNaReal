using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

public class ChannelPinnedMessage : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid PinnedById { get; set; }
    public User PinnedBy { get; set; } = null!;

    public DateTime PinnedAt { get; set; } = DateTime.UtcNow;
    public int OrderIndex { get; set; } = 0;
}
