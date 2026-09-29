using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.MarkChannelAsRead;

public class MarkChannelAsReadCommandHandler : IRequestHandler<MarkChannelAsReadCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public MarkChannelAsReadCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(MarkChannelAsReadCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", "Channel not found.");

        // Check channel permission
        if (channel.IsPrivate || channel.Type == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel.");

            var member = await _context.ChannelMembers
                .FirstOrDefaultAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId.Value, cancellationToken);

            if (member != null)
            {
                member.LastReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            var isWorkspaceMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isWorkspaceMember)
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");

            // Public channels: avoid creating fake ChannelMember rows.
            // Client-side real-time SignalR handles UI unread indicators efficiently.
        }

        return Result<Unit>.Success(Unit.Value);
    }
}
