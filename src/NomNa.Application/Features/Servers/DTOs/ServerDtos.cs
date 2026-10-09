using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Servers.Queries.GetServerMembers;

namespace NomNa.Application.Features.Servers.DTOs;

public record ServerDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    string InviteCode,
    Guid OwnerId,
    int MemberCount = 0
);

public record JoinServerResultDto(
    ServerDto Server,
    ServerMemberDto? NewMember = null,
    MessageDto? WelcomeMessage = null
);

