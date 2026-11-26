using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Queries.GetChannels;

public class GetChannelsQueryHandler : IRequestHandler<GetChannelsQuery, Result<List<ChannelDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public GetChannelsQueryHandler(
        IApplicationDbContext context, 
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<List<ChannelDto>>> Handle(GetChannelsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // Check if user is a member of this server
        var isMember = await _context.ServerMembers
            .AnyAsync(wm => wm.ServerId == request.ServerId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        var channels = await _context.Channels
            .AsNoTracking()
            .Where(c => c.ServerId == request.ServerId && c.Type != ChannelType.DirectMessage)
            .OrderBy(c => c.Position)
            .ThenBy(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.ServerId,
                c.Name,
                c.Type,
                c.IsPrivate,
                c.LastMessageAt,
                c.LastMessageSenderId,
                c.CategoryId,
                c.Position,
                c.Topic,
                c.SlowmodeSeconds
            })
            .ToListAsync(cancellationToken);

        var channelIds = channels.Select(c => c.Id).ToList();
        var permsByChannel = await _permissionService.GetChannelsPermissionsAsync(
            userId.Value,
            request.ServerId,
            channelIds,
            cancellationToken
        );

        // Fetch user read markers in a single batch query to accurately calculate unread channel states
        var readMarkers = await _context.ChannelMembers
            .AsNoTracking()
            .Where(cm => cm.UserId == userId.Value && channelIds.Contains(cm.ChannelId))
            .Select(cm => new { cm.ChannelId, cm.LastReadAt })
            .ToDictionaryAsync(cm => cm.ChannelId, cm => cm.LastReadAt, cancellationToken);

        var result = new List<ChannelDto>();

        foreach (var c in channels)
        {
            var perms = permsByChannel.GetValueOrDefault(c.Id, Permissions.None);
            // Only return channels where user holds ViewChannel permission
            if (NomNa.Domain.Services.PermissionCalculator.HasPermission(perms, Permissions.ViewChannel))
            {
                var lastReadAt = readMarkers.GetValueOrDefault(c.Id);
                var hasUnread = c.LastMessageAt.HasValue
                    && c.LastMessageSenderId != userId.Value
                    && (!lastReadAt.HasValue || c.LastMessageAt.Value > lastReadAt.Value);

                result.Add(new ChannelDto(
                    c.Id,
                    c.ServerId,
                    c.Name,
                    c.Type,
                    c.IsPrivate,
                    c.LastMessageAt,
                    hasUnread,
                    (long)perms,
                    c.CategoryId,
                    c.Position,
                    c.Topic,
                    c.SlowmodeSeconds
                ));
            }
        }

        return result;
    }
}
