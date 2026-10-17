using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannel;

public class UpdateChannelCommandHandler : IRequestHandler<UpdateChannelCommand, Result<ChannelDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public UpdateChannelCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<ChannelDto>> Handle(UpdateChannelCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null || channel.Type == ChannelType.DirectMessage)
            return Error.NotFound("Channel.NotFound", "Channel not found.");

        // Check if user is server owner/admin or channel creator
        var member = await _context.ServerMembers
            .FirstOrDefaultAsync(wm => wm.ServerId == channel.ServerId && wm.UserId == userId.Value, cancellationToken);

        if (member == null)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        var isOwnerOrAdmin = member.Role == ServerRole.Owner || member.Role == ServerRole.Admin;
        var isCreator = channel.CreatedById == userId.Value;

        if (!isOwnerOrAdmin && !isCreator)
            return Error.Forbidden("Channel.Forbidden", "Only server owners, admins, or the channel creator can update channel settings.");

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            channel.Name = channel.Type == ChannelType.Category
                ? request.Name.Trim().ToUpperInvariant()
                : channel.Type == ChannelType.Text
                    ? request.Name.Trim().ToLowerInvariant().Replace(' ', '-')
                    : request.Name.Trim();
        }

        if (request.Topic != null)
        {
            channel.Topic = string.IsNullOrWhiteSpace(request.Topic) ? null : request.Topic.Trim();
        }

        if (request.CategoryId.HasValue)
        {
            if (request.CategoryId.Value == Guid.Empty)
            {
                channel.CategoryId = null;
            }
            else
            {
                var categoryExists = await _context.Channels
                    .AnyAsync(c => c.Id == request.CategoryId.Value && c.ServerId == channel.ServerId && c.Type == ChannelType.Category, cancellationToken);
                if (!categoryExists)
                    return Error.NotFound("Category.NotFound", "Danh mục không tồn tại.");
                channel.CategoryId = request.CategoryId.Value;
            }
        }

        if (request.Position.HasValue)
        {
            channel.Position = request.Position.Value;
        }

        if (request.IsPrivate.HasValue)
        {
            channel.IsPrivate = request.IsPrivate.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateChannel(channel.Id);

        return new ChannelDto(
            channel.Id,
            channel.ServerId,
            channel.Name,
            channel.Type,
            channel.IsPrivate,
            channel.LastMessageAt,
            false,
            (long)NomNa.Domain.Enums.Permissions.Default,
            channel.CategoryId,
            channel.Position,
            channel.Topic
        );
    }
}

