using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Messages.Commands.ToggleReaction;

public class ToggleReactionCommandHandler : IRequestHandler<ToggleReactionCommand, Result<ReactionToggledDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ToggleReactionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ReactionToggledDto>> Handle(ToggleReactionCommand request, CancellationToken cancellationToken)
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
            var isMember = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == message.Channel.ServerId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");
        }

        var emoji = request.Emoji.Trim();

        var existingReaction = await _context.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == request.MessageId && r.UserId == userId.Value && r.Emoji == emoji, cancellationToken);

        bool isAdded;
        if (existingReaction != null)
        {
            _context.MessageReactions.Remove(existingReaction);
            isAdded = false;
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
            isAdded = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new ReactionToggledDto(
            message.Id,
            message.ChannelId,
            message.ThreadId,
            userId.Value,
            emoji,
            isAdded
        );
    }
}
