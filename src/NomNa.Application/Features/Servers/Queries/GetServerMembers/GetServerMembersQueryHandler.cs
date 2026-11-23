using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Helpers;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Queries.GetServerMembers;

public class GetServerMembersQueryHandler : IRequestHandler<GetServerMembersQuery, Result<List<ServerMemberDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserPresenceTracker _presenceTracker;

    public GetServerMembersQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserPresenceTracker presenceTracker)
    {
        _context = context;
        _currentUserService = currentUserService;
        _presenceTracker = presenceTracker;
    }

    public async Task<Result<List<ServerMemberDto>>> Handle(GetServerMembersQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var isMember = await _context.ServerMembers
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == currentUserId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        // PERF-04: Use direct projection to select only required member and user columns,
        // avoiding SELECT * on users (loading PasswordHash, SecurityStamp, etc.) and Cartesian explosion.
        var members = await _context.ServerMembers
            .AsNoTracking()
            .Where(m => m.ServerId == request.ServerId)
            .OrderBy(m => m.User.DisplayName)
            .Select(m => new
            {
                m.Id,
                m.UserId,
                m.CommunicationDisabledUntil,
                DisplayName = m.User.DisplayName,
                UserName = m.User.UserName ?? string.Empty,
                AvatarUrl = m.User.AvatarUrl,
                Email = m.User.Email,
                Role = m.Role.ToString(),
                StatusPreference = m.User.StatusPreference,
                Roles = m.MemberRoles.Select(mr => new NomNa.Application.Features.Roles.DTOs.RoleDto(
                    mr.Role.Id,
                    mr.Role.ServerId,
                    mr.Role.Name,
                    (long)mr.Role.Permissions,
                    mr.Role.Position,
                    mr.Role.ColorHex,
                    mr.Role.IsHoisted,
                    mr.Role.IsMentionable,
                    mr.Role.IsDefault,
                    0
                )).ToList()
            })
            .ToListAsync(cancellationToken);

        var memberUserIds = members.Select(m => m.UserId).ToList();
        var onlinePresenceMap = await _presenceTracker.AreUsersOnlineAsync(memberUserIds);

        return members.Select(m => new ServerMemberDto(
            m.Id,
            m.UserId,
            m.DisplayName,
            m.UserName,
            m.AvatarUrl,
            m.Email,
            m.Role,
            UserPresenceResolver.Resolve(onlinePresenceMap.GetValueOrDefault(m.UserId), m.StatusPreference),
            m.Roles,
            m.CommunicationDisabledUntil
        )).ToList();
    }
}
