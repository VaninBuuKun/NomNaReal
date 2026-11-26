using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Queries.GetServerBans;

public record GetServerBansQuery(Guid ServerId) : IRequest<Result<List<ServerBanDto>>>;

