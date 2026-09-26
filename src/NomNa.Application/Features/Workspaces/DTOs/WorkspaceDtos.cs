namespace NomNa.Application.Features.Workspaces.DTOs;

public record WorkspaceDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    string InviteCode,
    Guid OwnerId
);
