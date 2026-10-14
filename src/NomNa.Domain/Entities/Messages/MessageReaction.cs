using NomNa.Domain.Common;

namespace NomNa.Domain.Entities;

public class MessageReaction : BaseEntity
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Emoji { get; set; } = string.Empty;
}
