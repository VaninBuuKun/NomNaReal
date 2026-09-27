using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

public class Message : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
    public Guid? ThreadId { get; set; } // Nullable, points to parent message if this is a thread reply
    public Message? ParentMessage { get; set; }

    public bool IsEdited { get; set; } = false;
    public DateTime? EditedAt { get; set; }
    public DateTime? DeletedAt { get; set; } // Soft delete

    public ICollection<Message> Replies { get; set; } = new List<Message>();
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
}
