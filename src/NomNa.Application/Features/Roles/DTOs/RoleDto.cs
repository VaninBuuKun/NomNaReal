using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Roles.DTOs;

public record RoleDto(
    Guid Id,
    Guid ServerId,
    string Name,
    long Permissions,
    int Position,
    string? ColorHex,
    bool IsHoisted,
    bool IsMentionable,
    bool IsDefault,
    int MemberCount = 0
);
