using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.DTOs;

public record FriendDto(
    Guid FriendshipId,
    Guid UserId,
    string DisplayName,
    string Username,
    string? AvatarUrl,
    string Status,
    FriendshipStatus FriendshipStatus,
    DateTime CreatedAt
);
