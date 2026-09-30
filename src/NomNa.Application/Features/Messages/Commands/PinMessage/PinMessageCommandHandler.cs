using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Commands.PinMessage;

public class PinMessageCommandHandler : IRequestHandler<PinMessageCommand, Result<PinnedMessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserProfileCache _userProfileCache;

    public PinMessageCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserProfileCache userProfileCache)
    {
        _context = context;
        _currentUserService = currentUserService;
        _userProfileCache = userProfileCache;
    }

    public async Task<Result<PinnedMessageDto>> Handle(PinMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var message = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Channel)
            .Include(m => m.Reactions)
            .FirstOrDefaultAsync(m => m.Id == request.MessageId && m.DeletedAt == null, cancellationToken);

        if (message == null)
        {
            return Error.NotFound("Message.NotFound", "Message not found or has been deleted.");
        }

        // Authorization check according to channel privacy
        if (message.Channel.IsPrivate || message.Channel.Type == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == message.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && message.Channel.CreatedById != userId.Value)
            {
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel.");
            }
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == message.Channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
            {
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
            }
        }

        // Check if already pinned
        var existingPin = await _context.ChannelPinnedMessages
            .Include(p => p.PinnedBy)
            .FirstOrDefaultAsync(p => p.ChannelId == message.ChannelId && p.MessageId == message.Id, cancellationToken);

        var currentPinnerProfile = await _userProfileCache.GetAsync(userId.Value, cancellationToken);
        var pinnerName = currentPinnerProfile?.DisplayName ?? "Thành viên";

        if (existingPin != null)
        {
            // Already pinned, map and return existing
            var existingMessageDto = MapToMessageDto(message, userId.Value);
            return new PinnedMessageDto(
                existingPin.Id,
                existingPin.ChannelId,
                existingPin.MessageId,
                existingPin.PinnedById,
                existingPin.PinnedBy?.DisplayName ?? pinnerName,
                existingPin.PinnedAt,
                existingPin.OrderIndex,
                existingMessageDto
            );
        }

        var maxOrder = await _context.ChannelPinnedMessages
            .Where(p => p.ChannelId == message.ChannelId)
            .MaxAsync(p => (int?)p.OrderIndex, cancellationToken) ?? 0;

        var pinnedMessage = new ChannelPinnedMessage
        {
            ChannelId = message.ChannelId,
            MessageId = message.Id,
            PinnedById = userId.Value,
            PinnedAt = DateTime.UtcNow,
            OrderIndex = maxOrder + 1
        };

        _context.ChannelPinnedMessages.Add(pinnedMessage);
        await _context.SaveChangesAsync(cancellationToken);

        var messageDto = MapToMessageDto(message, userId.Value);

        return new PinnedMessageDto(
            pinnedMessage.Id,
            pinnedMessage.ChannelId,
            pinnedMessage.MessageId,
            pinnedMessage.PinnedById,
            pinnerName,
            pinnedMessage.PinnedAt,
            pinnedMessage.OrderIndex,
            messageDto
        );
    }

    private static MessageDto MapToMessageDto(Message m, Guid currentUserId)
    {
        var reactions = m.Reactions?
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionGroupDto(
                g.Key,
                g.Count(),
                g.Select(r => r.UserId).ToList(),
                g.Any(r => r.UserId == currentUserId)
            ))
            .ToList();

        var attachments = m.Attachments?
            .Select(a => new MessageAttachmentDto(
                a.Url,
                a.FileName,
                a.FileSize,
                a.ContentType,
                a.Type
            ))
            .ToList();

        return new MessageDto(
            m.Id,
            m.ChannelId,
            m.SenderId,
            m.Sender?.DisplayName ?? "Unknown",
            m.Sender?.UserName ?? "unknown",
            m.Sender?.AvatarUrl,
            m.Content,
            m.ThreadId,
            m.IsEdited,
            m.CreatedAt,
            m.ReplyCount,
            reactions,
            attachments
        );
    }
}
