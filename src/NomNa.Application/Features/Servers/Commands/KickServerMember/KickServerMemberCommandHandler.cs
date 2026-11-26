using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.KickServerMember;

public class KickServerMemberCommandHandler : IRequestHandler<KickServerMemberCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;
    private readonly IRealtimeAccessRevoker _realtimeAccessRevoker;

    public KickServerMemberCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService,
        IRealtimeAccessRevoker realtimeAccessRevoker)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
        _realtimeAccessRevoker = realtimeAccessRevoker;
    }

    public async Task<Result<Unit>> Handle(KickServerMemberCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        if (userId.Value == request.MemberUserId)
            return Error.Conflict("Server.CannotKickSelf", "You cannot kick yourself from the server. Use leave instead.");

        var server = await _context.Servers
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        var isCallerOwner = server.OwnerId == userId.Value;

        // SEC-06: Verify caller permissions using bitmask Permissions.KickMembers instead of obsolete enum check
        if (!isCallerOwner)
        {
            var hasKickPermission = await _permissionService.HasServerPermissionAsync(
                userId.Value,
                request.ServerId,
                Permissions.KickMembers,
                cancellationToken);

            if (!hasKickPermission)
            {
                return Error.Forbidden("Server.Forbidden", "You do not have permission to kick members from this server.");
            }
        }

        var targetMember = server.Members.FirstOrDefault(m => m.UserId == request.MemberUserId);
        if (targetMember == null)
            return Error.NotFound("Server.MemberNotFound", "Member not found in this server.");

        if (server.OwnerId == request.MemberUserId)
            return Error.Forbidden("Server.CannotKickOwner", "The server owner cannot be removed.");

        // SEC-06: Discord Role Hierarchy check - A non-owner cannot kick someone with equal or higher role position
        if (!isCallerOwner)
        {
            var callerMaxPosition = await _context.MemberRoles
                .AsNoTracking()
                .Where(mr => mr.ServerMember.ServerId == request.ServerId && mr.ServerMember.UserId == userId.Value)
                .Select(mr => (int?)mr.Role.Position)
                .MaxAsync(cancellationToken) ?? 0;

            var targetMaxPosition = await _context.MemberRoles
                .AsNoTracking()
                .Where(mr => mr.ServerMember.ServerId == request.ServerId && mr.ServerMember.UserId == request.MemberUserId)
                .Select(mr => (int?)mr.Role.Position)
                .MaxAsync(cancellationToken) ?? 0;

            if (targetMaxPosition >= callerMaxPosition)
            {
                return Error.Forbidden("Server.RoleHierarchyViolation", "You cannot remove a member with an equal or higher role position.");
            }
        }

        _context.ServerMembers.Remove(targetMember);

        var channelMemberships = await _context.ChannelMembers
            .Where(cm => cm.UserId == request.MemberUserId && cm.Channel.ServerId == request.ServerId)
            .ToListAsync(cancellationToken);

        _context.ChannelMembers.RemoveRange(channelMemberships);

        var channelIds = await _context.Channels
            .AsNoTracking()
            .Where(c => c.ServerId == request.ServerId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateUser(request.ServerId, request.MemberUserId);

        await _realtimeAccessRevoker.RevokeServerAccessAsync(
            request.MemberUserId,
            request.ServerId,
            channelIds,
            cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
