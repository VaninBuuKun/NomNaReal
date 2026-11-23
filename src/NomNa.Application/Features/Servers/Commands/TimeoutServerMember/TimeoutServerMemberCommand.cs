using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.TimeoutServerMember;

public record TimeoutServerMemberCommand(
    Guid ServerId,
    Guid MemberUserId,
    int DurationMinutes,
    string? Reason = null) : IRequest<Result<Unit>>;

