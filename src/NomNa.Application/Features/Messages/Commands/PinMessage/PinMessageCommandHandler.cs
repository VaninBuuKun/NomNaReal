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

        var messageInfo = await _context.Messages
            .Where(m => m.Id == request.MessageId && m.DeletedAt == null)
            .Select(m => new
            {
                m.Id,
                m.ChannelId,
                m.Content,
                m.ThreadId,
                m.IsEdited,
                m.CreatedAt,
                m.ReplyCount,
                SenderId = m.SenderId,
                SenderDisplayName = m.Sender.DisplayName,
                SenderUserName = m.Sender.UserName,
                SenderAvatarUrl = m.Sender.AvatarUrl,
                ChannelIsPrivate = m.Channel.IsPrivate,
                ChannelType = m.Channel.Type,
                ChannelCreatedById = m.Channel.CreatedById,
                ServerId = m.Channel.ServerId,
                Attachments = m.Attachments.Select(a => new MessageAttachmentDto(
                    a.Url,
                    a.FileName,
                    a.FileSize,
                    a.ContentType,
                    a.Type
                )).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (messageInfo == null)
        {
            return Error.NotFound("Message.NotFound", "Message not found or has been deleted.");
        }

        // Authorization check according to channel privacy
        if (messageInfo.ChannelIsPrivate || messageInfo.ChannelType == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == messageInfo.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && messageInfo.ChannelCreatedById != userId.Value)
            {
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel.");
            }
        }
        else
        {
            var isMember = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == messageInfo.ServerId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
            {
                return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");
            }
        }

        var messageDto = new MessageDto(
            messageInfo.Id,
            messageInfo.ChannelId,
            messageInfo.SenderId,
            messageInfo.SenderDisplayName ?? "Unknown",
            messageInfo.SenderUserName ?? "unknown",
            messageInfo.SenderAvatarUrl,
            messageInfo.Content,
            messageInfo.ThreadId,
            messageInfo.IsEdited,
            messageInfo.CreatedAt,
            messageInfo.ReplyCount,
            null,
            messageInfo.Attachments
        );

        // Check if already pinned
        var existingPin = await _context.ChannelPinnedMessages
            .Where(p => p.ChannelId == messageInfo.ChannelId && p.MessageId == messageInfo.Id)
            .Select(p => new
            {
                p.Id,
                p.ChannelId,
                p.MessageId,
                p.PinnedById,
                PinnedByName = p.PinnedBy.DisplayName,
                p.PinnedAt,
                p.OrderIndex
            })
            .FirstOrDefaultAsync(cancellationToken);

        var currentPinnerProfile = await _userProfileCache.GetAsync(userId.Value, cancellationToken);
        var pinnerName = currentPinnerProfile?.DisplayName ?? "Thành viên";

        if (existingPin != null)
        {
            return new PinnedMessageDto(
                existingPin.Id,
                existingPin.ChannelId,
                existingPin.MessageId,
                existingPin.PinnedById,
                existingPin.PinnedByName ?? pinnerName,
                existingPin.PinnedAt,
                existingPin.OrderIndex,
                messageDto
            );
        }

        var maxOrder = await _context.ChannelPinnedMessages
            .Where(p => p.ChannelId == messageInfo.ChannelId)
            .MaxAsync(p => (int?)p.OrderIndex, cancellationToken) ?? 0;

        var pinnedMessage = new ChannelPinnedMessage
        {
            ChannelId = messageInfo.ChannelId,
            MessageId = messageInfo.Id,
            PinnedById = userId.Value,
            PinnedAt = DateTime.UtcNow,
            OrderIndex = maxOrder + 1
        };

        _context.ChannelPinnedMessages.Add(pinnedMessage);
        await _context.SaveChangesAsync(cancellationToken);

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
}
