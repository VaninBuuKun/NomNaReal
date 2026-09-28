using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Queries.GetWorkspaceMembers;

public record GetWorkspaceMembersQuery(Guid WorkspaceId) : IRequest<Result<List<WorkspaceMemberDto>>>;

public record WorkspaceMemberDto(
    Guid Id,
    Guid UserId,
    string DisplayName,
    string Username,
    string? AvatarUrl,
    string? Email,
    string Role,
    string Status
);
