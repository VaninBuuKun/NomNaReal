namespace NomNa.Application.Features.Messages.DTOs;

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    Guid SenderId,
    string SenderDisplayName,
    string SenderUsername,
    string? SenderAvatarUrl,
    string Content,
    Guid? ThreadId,
    bool IsEdited,
    DateTime CreatedAt,
    int ReplyCount = 0,
    DateTime? LastReplyAt = null,
    List<ReactionGroupDto>? Reactions = null
);

public record ReactionGroupDto(
    string Emoji,
    int Count,
    List<Guid> UserIds,
    bool HasReacted
);

public record ReactionUpdateDto(
    Guid MessageId,
    Guid ChannelId,
    Guid? ThreadId,
    List<ReactionGroupDto> Reactions
);

public record ThreadDetailsDto(
    MessageDto ParentMessage,
    List<MessageDto> Replies
);

public record ThreadReplyCountUpdateDto(
    Guid ParentMessageId,
    Guid ChannelId,
    int ReplyCount,
    DateTime LastReplyAt
);

public record DeletedMessageDto(
    Guid MessageId,
    Guid ChannelId,
    Guid? ThreadId
);
