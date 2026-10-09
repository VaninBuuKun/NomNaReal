using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Queries.GetServers;

public record GetServersQuery : IRequest<Result<List<ServerDto>>>;
