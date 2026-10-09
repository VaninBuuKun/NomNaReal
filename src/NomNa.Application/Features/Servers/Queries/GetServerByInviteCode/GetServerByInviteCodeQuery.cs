using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Queries.GetServerByInviteCode;

public record GetServerByInviteCodeQuery(string InviteCode) : IRequest<Result<ServerDto>>;
