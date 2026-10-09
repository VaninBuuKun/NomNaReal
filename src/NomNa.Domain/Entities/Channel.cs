using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class Channel : BaseEntity
{
    public Guid ServerId { get; set; }
    public Server Server { get; set; } = null!;

    public string? Name { get; set; }
    public ChannelType Type { get; set; } = ChannelType.Text;
    public bool IsPrivate { get; set; } = false;
    public Guid CreatedById { get; set; }

    // Denormalized fields for quick display
    public DateTime? LastMessageAt { get; set; }
    public string? LastMessageContent { get; set; }
    public Guid? LastMessageSenderId { get; set; }

    public ICollection<ChannelMember> Members { get; set; } = new List<ChannelMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
