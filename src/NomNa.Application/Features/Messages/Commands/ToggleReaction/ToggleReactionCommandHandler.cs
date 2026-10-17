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
    private readonly IPermissionService _permissionService;

    public ToggleReactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
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

        // Verify permission: DM requires participant, Server channel requires AddReactions permission
        if (message.Channel.Type == Domain.Enums.ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == message.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && message.Channel.CreatedById != userId.Value)
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to react in this direct message.");
        }
        else
        {
            var hasAddReactions = await _permissionService.HasChannelPermissionAsync(
                userId.Value,
                message.ChannelId,
                Domain.Enums.Permissions.AddReactions,
                cancellationToken);

            if (!hasAddReactions)
                return Error.Forbidden("Permission.Forbidden", "You do not have permission to add reactions in this channel.");
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
            userId.Value,
            emoji,
            isAdded
        );
    }
}
