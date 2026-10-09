using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Commands.CreateServer;

public record CreateServerCommand(
    string Name,
    string? Description,
    string IconUrl
) : IRequest<Result<ServerDto>>;
