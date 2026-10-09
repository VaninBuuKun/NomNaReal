using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Commands.JoinServer;

public record JoinServerCommand(string InviteCode) : IRequest<Result<JoinServerResultDto>>;
