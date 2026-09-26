namespace PulseChat.Application.Features.Messages.DTOs;

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
    DateTime CreatedAt
);
