using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Queries.GetServerAuditLogs;

public class GetServerAuditLogsQueryHandler : IRequestHandler<GetServerAuditLogsQuery, Result<List<ServerAuditLogDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public GetServerAuditLogsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<List<ServerAuditLogDto>>> Handle(GetServerAuditLogsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var server = await _context.Servers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        if (server.OwnerId != userId.Value)
        {
            var hasManageServer = await _permissionService.HasServerPermissionAsync(
                userId.Value,
                request.ServerId,
                Permissions.ManageServer,
                cancellationToken);

            if (!hasManageServer)
                return Error.Forbidden("Server.Forbidden", "You do not have permission to view audit logs in this server.");
        }

        var limit = Math.Clamp(request.Limit, 1, 100);

        var query = _context.ServerAuditLogs
            .AsNoTracking()
            .Where(a => a.ServerId == request.ServerId);

        if (request.BeforeId.HasValue)
        {
            var beforeLog = await _context.ServerAuditLogs
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == request.BeforeId.Value, cancellationToken);

            if (beforeLog != null)
            {
                query = query.Where(a => a.CreatedAt < beforeLog.CreatedAt);
            }
        }

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new ServerAuditLogDto(
                a.Id,
                a.ServerId,
                a.ActorId,
                a.Actor.DisplayName,
                a.Actor.AvatarUrl,
                a.ActionType,
                a.TargetId,
                a.TargetName,
                a.Reason,
                a.ChangesJson,
                a.CreatedAt))
            .ToListAsync(cancellationToken);

        return logs;
    }
}

