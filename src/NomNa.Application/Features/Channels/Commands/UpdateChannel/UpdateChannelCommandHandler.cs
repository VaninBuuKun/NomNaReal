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

    public UpdateChannelCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
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

        channel.Name = request.Name.Trim().ToLower();
        await _context.SaveChangesAsync(cancellationToken);

        return new ChannelDto(
            channel.Id,
            channel.ServerId,
            channel.Name,
            channel.Type,
            channel.IsPrivate,
            channel.LastMessageAt
        );
    }
}
