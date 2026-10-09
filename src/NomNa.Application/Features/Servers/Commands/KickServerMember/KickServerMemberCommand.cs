using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.KickServerMember;

public record KickServerMemberCommand(Guid ServerId, Guid MemberUserId) : IRequest<Result<Unit>>;
