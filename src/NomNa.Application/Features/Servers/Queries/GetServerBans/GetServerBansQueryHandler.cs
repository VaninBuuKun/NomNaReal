using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Queries.GetServerBans;

public class GetServerBansQueryHandler : IRequestHandler<GetServerBansQuery, Result<List<ServerBanDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public GetServerBansQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<List<ServerBanDto>>> Handle(GetServerBansQuery request, CancellationToken cancellationToken)
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
            var hasBanPermission = await _permissionService.HasServerPermissionAsync(
                userId.Value,
                request.ServerId,
                Permissions.BanMembers,
                cancellationToken);

            if (!hasBanPermission)
                return Error.Forbidden("Server.Forbidden", "You do not have permission to view bans in this server.");
        }

        var bans = await _context.ServerBans
            .AsNoTracking()
            .Where(b => b.ServerId == request.ServerId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new ServerBanDto(
                b.Id,
                b.ServerId,
                b.UserId,
                b.User.UserName ?? string.Empty,
                b.User.DisplayName,
                b.User.AvatarUrl,
                b.BannedById,
                b.BannedBy.DisplayName,
                b.Reason,
                b.CreatedAt))
            .ToListAsync(cancellationToken);

        return bans;
    }
}

