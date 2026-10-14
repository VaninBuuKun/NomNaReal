using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class Channel : BaseEntity
{
    public Guid? ServerId { get; set; }
    public Server? Server { get; set; }

    public string? Name { get; set; }
    public string? Topic { get; set; }
    public ChannelType Type { get; set; } = ChannelType.Text;
    public bool IsPrivate { get; set; } = false;
    public int Position { get; set; } = 0;
    public Guid CreatedById { get; set; }

    public Guid? CategoryId { get; set; }
    public Channel? Category { get; set; }
    public ICollection<Channel> ChildChannels { get; set; } = new List<Channel>();

    // Denormalized fields for quick display
    public DateTime? LastMessageAt { get; set; }
    public string? LastMessageContent { get; set; }
    public Guid? LastMessageSenderId { get; set; }

    public ICollection<ChannelMember> Members { get; set; } = new List<ChannelMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<ChannelPermissionOverwrite> Overwrites { get; set; } = new List<ChannelPermissionOverwrite>();
}
