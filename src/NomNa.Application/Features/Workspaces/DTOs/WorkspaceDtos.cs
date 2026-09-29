using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Workspaces.Queries.GetWorkspaceMembers;

namespace NomNa.Application.Features.Workspaces.DTOs;

public record WorkspaceDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    string InviteCode,
    Guid OwnerId,
    int MemberCount = 0
);

public record JoinWorkspaceResultDto(
    WorkspaceDto Workspace,
    WorkspaceMemberDto? NewMember = null,
    MessageDto? WelcomeMessage = null
);

