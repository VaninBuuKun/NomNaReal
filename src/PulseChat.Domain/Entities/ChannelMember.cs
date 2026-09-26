using PulseChat.Domain.Common;

namespace PulseChat.Domain.Entities;

public class ChannelMember : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime? LastReadAt { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
