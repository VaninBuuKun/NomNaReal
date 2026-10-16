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
                c.CategoryId,
                c.Position,
                c.Topic
            })
            .ToListAsync(cancellationToken);

        var channelIds = channels.Select(c => c.Id).ToList();
        var permsByChannel = await _permissionService.GetChannelsPermissionsAsync(
            userId.Value,
            request.ServerId,
            channelIds,
            cancellationToken
        );

        var result = new List<ChannelDto>();

        foreach (var c in channels)
        {
            var perms = permsByChannel.GetValueOrDefault(c.Id, Permissions.None);
            // Chỉ trả về các kênh mà user có quyền ViewChannel
            if (NomNa.Domain.Services.PermissionCalculator.HasPermission(perms, Permissions.ViewChannel))
            {
                result.Add(new ChannelDto(
                    c.Id,
                    c.ServerId,
                    c.Name,
                    c.Type,
                    c.IsPrivate,
                    c.LastMessageAt,
                    false,
                    (long)perms,
                    c.CategoryId,
                    c.Position,
                    c.Topic
                ));
            }
        }

        return result;
    }
}
