using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.BanServerMember;

public record BanServerMemberCommand(
    Guid ServerId,
    Guid MemberUserId,
    string? Reason = null) : IRequest<Result<Unit>>;

