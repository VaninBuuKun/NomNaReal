using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

public class Message : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
    public Guid? ReplyToMessageId { get; set; }
    public Message? ReplyToMessage { get; set; }

    public bool IsEdited { get; set; } = false;
    public DateTime? EditedAt { get; set; }
    public DateTime? DeletedAt { get; set; } // Soft delete

    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
    public List<MessageAttachmentItem> Attachments { get; set; } = new();
}
