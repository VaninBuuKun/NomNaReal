using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Commands.UpdateServer;

public record UpdateServerCommand(
    Guid ServerId,
    string Name,
    string? Description = null,
    string? IconUrl = null
) : IRequest<Result<ServerDto>>;
