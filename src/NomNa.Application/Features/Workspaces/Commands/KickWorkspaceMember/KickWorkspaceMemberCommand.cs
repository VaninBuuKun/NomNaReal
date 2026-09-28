using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Commands.KickWorkspaceMember;

public record KickWorkspaceMemberCommand(Guid WorkspaceId, Guid MemberUserId) : IRequest<Result<Unit>>;
