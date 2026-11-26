using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.TimeoutServerMember;

public class TimeoutServerMemberCommandHandler : IRequestHandler<TimeoutServerMemberCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public TimeoutServerMemberCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<Unit>> Handle(TimeoutServerMemberCommand request, CancellationToken cancellationToken)
    {
        var actorId = _currentUserService.UserId;
        if (!actorId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        if (actorId.Value == request.MemberUserId)
            return Error.Conflict("Server.CannotTimeoutSelf", "You cannot timeout yourself.");

        var server = await _context.Servers
            .Include(s => s.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(s => s.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        var isCallerOwner = server.OwnerId == actorId.Value;

        // Permissions.ModerateMembers check
        if (!isCallerOwner)
        {
            var hasModeratePermission = await _permissionService.HasServerPermissionAsync(
                actorId.Value,
                request.ServerId,
                Permissions.ModerateMembers,
                cancellationToken);

            if (!hasModeratePermission)
                return Error.Forbidden("Server.Forbidden", "You do not have permission to timeout members in this server.");
        }

        if (server.OwnerId == request.MemberUserId)
            return Error.Forbidden("Server.CannotTimeoutOwner", "The server owner cannot be timed out.");

        var targetMember = server.Members.FirstOrDefault(m => m.UserId == request.MemberUserId);
        if (targetMember == null)
            return Error.NotFound("Server.MemberNotFound", "Member not found in this server.");

        // Discord Role Hierarchy check
        if (!isCallerOwner)
        {
            var callerMaxPosition = await _context.MemberRoles
                .AsNoTracking()
                .Where(mr => mr.ServerMember.ServerId == request.ServerId && mr.ServerMember.UserId == actorId.Value)
                .Select(mr => (int?)mr.Role.Position)
                .MaxAsync(cancellationToken) ?? 0;

            var targetMaxPosition = await _context.MemberRoles
                .AsNoTracking()
                .Where(mr => mr.ServerMember.ServerId == request.ServerId && mr.ServerMember.UserId == request.MemberUserId)
                .Select(mr => (int?)mr.Role.Position)
                .MaxAsync(cancellationToken) ?? 0;

            if (callerMaxPosition <= targetMaxPosition)
                return Error.Forbidden("Server.RoleHierarchy", "You cannot timeout a member with an equal or higher role position.");
        }

        DateTime? timeoutUntil = request.DurationMinutes > 0
            ? DateTime.UtcNow.AddMinutes(request.DurationMinutes)
            : null;

        targetMember.CommunicationDisabledUntil = timeoutUntil;

        var targetName = targetMember.User?.DisplayName ?? targetMember.Nickname ?? "Unknown User";

        _context.ServerAuditLogs.Add(new ServerAuditLog
        {
            ServerId = request.ServerId,
            ActorId = actorId.Value,
            ActionType = AuditLogActionType.MemberTimedOut,
            TargetId = request.MemberUserId,
            TargetName = targetName,
            Reason = request.Reason,
            ChangesJson = $"{{\"durationMinutes\":{request.DurationMinutes},\"disabledUntil\":\"{timeoutUntil:o}\"}}"
        });

        await _context.SaveChangesAsync(cancellationToken);

        // Invalidate cached user permissions across the cluster
        _permissionService.InvalidateUser(request.ServerId, request.MemberUserId);

        return Unit.Value;
    }
}
