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
    List<ReactionGroupDto>? Reactions = null,
    List<MessageAttachmentDto>? Attachments = null
);

public record ReactionToggledDto(
    Guid MessageId,
    Guid ChannelId,
    Guid? ThreadId,
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
    int ReplyCount
);

public record MessageEditedDto(
    Guid Id,
    Guid ChannelId,
    Guid? ThreadId,
    string Content,
    bool IsEdited,
    DateTime EditedAt
);

public record DeletedMessageDto(
    Guid MessageId,
    Guid ChannelId,
    Guid? ThreadId
);

public record MessagesResponseDto(
    List<MessageDto> Messages,
    bool HasMore,
    DateTime? NextCursor
);

