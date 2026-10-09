using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Queries.GetServerMembers;

public record GetServerMembersQuery(Guid ServerId) : IRequest<Result<List<ServerMemberDto>>>;

public record ServerMemberDto(
    Guid Id,
    Guid UserId,
    string DisplayName,
    string Username,
    string? AvatarUrl,
    string? Email,
    string Role,
    string Status
);
