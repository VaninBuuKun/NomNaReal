namespace NomNa.Application.Common.Models;

public record UserProfileDto(
    Guid Id,
    string DisplayName,
    string UserName,
    string? AvatarUrl
);
