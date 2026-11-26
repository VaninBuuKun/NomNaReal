using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.UnbanServerMember;

public class UnbanServerMemberCommandHandler : IRequestHandler<UnbanServerMemberCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public UnbanServerMemberCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<Unit>> Handle(UnbanServerMemberCommand request, CancellationToken cancellationToken)
    {
        var actorId = _currentUserService.UserId;
        if (!actorId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var server = await _context.Servers
            .FirstOrDefaultAsync(s => s.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        var isCallerOwner = server.OwnerId == actorId.Value;

        if (!isCallerOwner)
        {
            var hasBanPermission = await _permissionService.HasServerPermissionAsync(
                actorId.Value,
                request.ServerId,
                Permissions.BanMembers,
                cancellationToken);

            if (!hasBanPermission)
                return Error.Forbidden("Server.Forbidden", "You do not have permission to unban members from this server.");
        }

        var ban = await _context.ServerBans
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.ServerId == request.ServerId && b.UserId == request.UserId, cancellationToken);

        if (ban == null)
            return Error.NotFound("Server.BanNotFound", "This user is not banned from this server.");

        var targetName = ban.User?.DisplayName ?? "Unknown User";

        _context.ServerBans.Remove(ban);

        _context.ServerAuditLogs.Add(new ServerAuditLog
        {
            ServerId = request.ServerId,
            ActorId = actorId.Value,
            ActionType = AuditLogActionType.MemberUnbanned,
            TargetId = request.UserId,
            TargetName = targetName,
            Reason = request.Reason
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

