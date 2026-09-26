using PulseChat.Domain.Common;
using PulseChat.Domain.Enums;

namespace PulseChat.Domain.Entities;

public class Channel : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public ChannelType Type { get; set; } = ChannelType.Text;
    public bool IsPrivate { get; set; } = false;
    public Guid CreatedById { get; set; }

    public ICollection<ChannelMember> Members { get; set; } = new List<ChannelMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
