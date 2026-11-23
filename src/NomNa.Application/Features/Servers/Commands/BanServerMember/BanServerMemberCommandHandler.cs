using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.BanServerMember;

public class BanServerMemberCommandHandler : IRequestHandler<BanServerMemberCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;
    private readonly IRealtimeAccessRevoker _realtimeAccessRevoker;

    public BanServerMemberCommandHandler(
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

    public async Task<Result<Unit>> Handle(BanServerMemberCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        if (userId.Value == request.MemberUserId)
            return Error.Conflict("Server.CannotBanSelf", "You cannot ban yourself from the server.");

        var server = await _context.Servers
            .Include(s => s.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(s => s.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        var isCallerOwner = server.OwnerId == userId.Value;

        if (!isCallerOwner)
        {
            var hasBanPermission = await _permissionService.HasServerPermissionAsync(
                userId.Value,
                request.ServerId,
                Permissions.BanMembers,
                cancellationToken);

            if (!hasBanPermission)
                return Error.Forbidden("Server.Forbidden", "You do not have permission to ban members from this server.");
        }

        if (server.OwnerId == request.MemberUserId)
            return Error.Forbidden("Server.CannotBanOwner", "The server owner cannot be banned.");

        var targetMember = server.Members.FirstOrDefault(m => m.UserId == request.MemberUserId);

        // Discord Role Hierarchy check
        if (!isCallerOwner && targetMember != null)
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

            if (callerMaxPosition <= targetMaxPosition)
                return Error.Forbidden("Server.RoleHierarchy", "You cannot ban a member with an equal or higher role position.");
        }

        var isAlreadyBanned = await _context.ServerBans
            .AnyAsync(b => b.ServerId == request.ServerId && b.UserId == request.MemberUserId, cancellationToken);

        if (isAlreadyBanned)
            return Error.Conflict("Server.AlreadyBanned", "This user is already banned from this server.");

        var targetName = targetMember?.User.DisplayName ?? targetMember?.Nickname ?? "Unknown User";

        // Remove from ServerMembers if present
        if (targetMember != null)
        {
            _context.ServerMembers.Remove(targetMember);

            // Clean up channel memberships in this server
            var channelMembers = await _context.ChannelMembers
                .Where(cm => cm.UserId == request.MemberUserId && cm.Channel.ServerId == request.ServerId)
                .ToListAsync(cancellationToken);

            _context.ChannelMembers.RemoveRange(channelMembers);
        }

        // Add to ServerBans
        var ban = new ServerBan
        {
            ServerId = request.ServerId,
            UserId = request.MemberUserId,
            BannedById = userId.Value,
            Reason = request.Reason
        };
        _context.ServerBans.Add(ban);

        // Append to ServerAuditLogs
        _context.ServerAuditLogs.Add(new ServerAuditLog
        {
            ServerId = request.ServerId,
            ActorId = userId.Value,
            ActionType = AuditLogActionType.MemberBanned,
            TargetId = request.MemberUserId,
            TargetName = targetName,
            Reason = request.Reason
        });

        var channelIds = await _context.Channels
            .AsNoTracking()
            .Where(c => c.ServerId == request.ServerId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateUser(request.ServerId, request.MemberUserId);

        // Revoke real-time access across all connections immediately
        await _realtimeAccessRevoker.RevokeServerAccessAsync(
            request.MemberUserId,
            request.ServerId,
            channelIds,
            cancellationToken);

        return Unit.Value;
    }
}
