namespace NomNa.Application.Features.Messages.DTOs;

public record MessageAttachmentDto(
    string Url,
    string FileName,
    long FileSize,
    string ContentType,
    string Type
);

public record AttachmentInputDto(
    string Url,
    string FileName,
    long FileSize,
    string ContentType,
    string Type
);

public record MessageReplyDto(
    Guid Id,
    Guid SenderId,
    string SenderDisplayName,
    string? SenderAvatarUrl,
    string Content,
    bool IsDeleted
);

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    Guid SenderId,
    string SenderDisplayName,
    string SenderUsername,
    string? SenderAvatarUrl,
    string Content,
    MessageReplyDto? ReplyTo,
    bool IsEdited,
    DateTime CreatedAt,
    List<ReactionGroupDto>? Reactions = null,
    List<MessageAttachmentDto>? Attachments = null
);

public record ReactionToggledDto(
    Guid MessageId,
    Guid ChannelId,
    Guid UserId,
    string Emoji,
    bool IsAdded
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
    List<ReactionGroupDto> Reactions
);

public record MessageEditedDto(
    Guid Id,
    Guid ChannelId,
    string Content,
    bool IsEdited,
    DateTime EditedAt
);

public record DeletedMessageDto(
    Guid MessageId,
    Guid ChannelId
);

public record MessagesResponseDto(
    List<MessageDto> Messages,
    bool HasMore,
    DateTime? NextCursor,
    bool HasOlder = false,
    bool HasNewer = false
);

public record PinnedMessageDto(
    Guid Id,
    Guid ChannelId,
    Guid MessageId,
    Guid PinnedById,
    string PinnedByName,
    DateTime PinnedAt,
    int OrderIndex,
    MessageDto Message
);

