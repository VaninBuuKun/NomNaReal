using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Commands.JoinWorkspace;

public record JoinWorkspaceCommand(string InviteCode) : IRequest<Result<JoinWorkspaceResultDto>>;
