using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Auth.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    UserStatus Status
);

public record AuthResultDto(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record AuthActionResponseDto(
    bool Success,
    string Message
);
