using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.CreateOrGetDmChannel;

public class CreateOrGetDmChannelCommandHandler : IRequestHandler<CreateOrGetDmChannelCommand, Result<ChannelDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateOrGetDmChannelCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ChannelDto>> Handle(CreateOrGetDmChannelCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        if (currentUserId.Value == request.TargetUserId)
        {
            return Error.Validation("Channel.InvalidDm", "Cannot create a direct message channel with yourself.");
        }

        // Verify target user exists
        var targetUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.TargetUserId, cancellationToken);

        if (targetUser == null)
        {
            return Error.NotFound("User.NotFound", "Target user not found.");
        }

        // Find existing DM channel between these 2 users in this workspace
        var existingDmChannel = await _context.Channels
            .Include(c => c.Members)
            .Where(c => c.WorkspaceId == request.WorkspaceId && c.Type == ChannelType.DirectMessage)
            .FirstOrDefaultAsync(c => c.Members.Any(m => m.UserId == currentUserId.Value) &&
                                      c.Members.Any(m => m.UserId == request.TargetUserId), cancellationToken);

        if (existingDmChannel != null)
        {
            return new ChannelDto(
                existingDmChannel.Id,
                existingDmChannel.WorkspaceId,
                targetUser.DisplayName,
                $"Direct message with {targetUser.DisplayName}",
                existingDmChannel.Type,
                existingDmChannel.IsPrivate
            );
        }

        // Create new DM channel
        var channelName = $"dm-{Guid.CreateVersion7():N}";
        var newChannel = new Channel
        {
            WorkspaceId = request.WorkspaceId,
            Name = channelName,
            Topic = $"Direct message with {targetUser.DisplayName}",
            Type = ChannelType.DirectMessage,
            IsPrivate = true,
            CreatedById = currentUserId.Value
        };

        newChannel.Members.Add(new ChannelMember { UserId = currentUserId.Value });
        newChannel.Members.Add(new ChannelMember { UserId = request.TargetUserId });

        _context.Channels.Add(newChannel);
        await _context.SaveChangesAsync(cancellationToken);

        return new ChannelDto(
            newChannel.Id,
            newChannel.WorkspaceId,
            targetUser.DisplayName,
            newChannel.Topic,
            newChannel.Type,
            newChannel.IsPrivate
        );
    }
}
