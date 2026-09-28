using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Queries.GetWorkspaceByInviteCode;

public record GetWorkspaceByInviteCodeQuery(string InviteCode) : IRequest<Result<WorkspaceDto>>;
