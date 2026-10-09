using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.DTOs;

public record FriendDto(
    Guid FriendshipId,
    Guid UserId,
    string DisplayName,
    string Username,
    string? AvatarUrl,
    UserStatus Status,
    FriendshipStatus FriendshipStatus,
    DateTime CreatedAt
);
