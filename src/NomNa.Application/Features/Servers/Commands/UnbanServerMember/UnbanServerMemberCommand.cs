using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.UnbanServerMember;

public record UnbanServerMemberCommand(
    Guid ServerId,
    Guid UserId,
    string? Reason = null) : IRequest<Result<Unit>>;

