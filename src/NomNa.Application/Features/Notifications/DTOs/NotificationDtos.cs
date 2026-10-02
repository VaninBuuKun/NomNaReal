using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Notifications.DTOs;

public record NotificationDto(
    Guid Id,
    Guid UserId,
    Guid? ActorId,
    string? ActorDisplayName,
    string? ActorUsername,
    string? ActorAvatarUrl,
    Guid? WorkspaceId,
    string? WorkspaceName,
    Guid? ChannelId,
    string? ChannelName,
    Guid? MessageId,
    NotificationType Type,
    string Title,
    string Content,
    bool IsRead,
    DateTime CreatedAt
);

public record UnreadNotificationCountDto(
    int TotalUnread,
    int MentionUnread
);
