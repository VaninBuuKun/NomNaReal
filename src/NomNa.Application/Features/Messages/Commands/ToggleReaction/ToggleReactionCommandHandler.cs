using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Messages.Commands.ToggleReaction;

public class ToggleReactionCommandHandler : IRequestHandler<ToggleReactionCommand, Result<ReactionUpdateDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ToggleReactionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ReactionUpdateDto>> Handle(ToggleReactionCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var message = await _context.Messages
            .Include(m => m.Channel)
            .FirstOrDefaultAsync(m => m.Id == request.MessageId && m.DeletedAt == null, cancellationToken);

        if (message == null)
        {
            return Error.NotFound("Message.NotFound", "Message not found or has been deleted.");
        }

        // Verify membership according to channel privacy
        if (message.Channel.IsPrivate || message.Channel.Type == Domain.Enums.ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == message.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to react in this private channel.");
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == message.Channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
        }

        var emoji = request.Emoji.Trim();

        var existingReaction = await _context.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == request.MessageId && r.UserId == userId.Value && r.Emoji == emoji, cancellationToken);

        if (existingReaction != null)
        {
            _context.MessageReactions.Remove(existingReaction);
        }
        else
        {
            var newReaction = new MessageReaction
            {
                MessageId = request.MessageId,
                UserId = userId.Value,
                Emoji = emoji
            };
            _context.MessageReactions.Add(newReaction);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Fetch updated reaction groups for this message
        var reactions = await _context.MessageReactions
            .Where(r => r.MessageId == request.MessageId)
            .ToListAsync(cancellationToken);

        var reactionGroups = reactions
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionGroupDto(
                g.Key,
                g.Count(),
                g.Select(r => r.UserId).ToList(),
                g.Any(r => r.UserId == userId.Value)
            ))
            .ToList();

        return new ReactionUpdateDto(
            message.Id,
            message.ChannelId,
            message.ThreadId,
            reactionGroups
        );
    }
}
