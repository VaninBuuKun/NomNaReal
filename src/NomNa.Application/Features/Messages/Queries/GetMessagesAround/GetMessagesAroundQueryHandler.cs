using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.GetMessagesAround;

public class GetMessagesAroundQueryHandler : IRequestHandler<GetMessagesAroundQuery, Result<MessagesResponseDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMessagesAroundQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<MessagesResponseDto>> Handle(GetMessagesAroundQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // 1. Channel membership verification
        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", $"Channel {request.ChannelId} not found.");

        if (channel.IsPrivate || channel.Type == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && channel.CreatedById != userId.Value)
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel.");
        }
        else
        {
            var isMember = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == channel.ServerId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");
        }

        // 2. Fetch target message
        var targetMessage = await _context.Messages
            .AsNoTracking()
            .Where(m => m.Id == request.TargetMessageId && m.ChannelId == request.ChannelId && m.DeletedAt == null)
            .Select(m => new
            {
                m.Id,
                m.ChannelId,
                m.SenderId,
                SenderDisplayName = m.Sender.DisplayName,
                SenderUsername = m.Sender.UserName ?? string.Empty,
                SenderAvatarUrl = m.Sender.AvatarUrl,
                m.Content,
                ReplyTo = m.ReplyToMessage != null ? new MessageReplyDto(
                    m.ReplyToMessage.Id,
                    m.ReplyToMessage.SenderId,
                    m.ReplyToMessage.Sender.DisplayName ?? "Unknown",
                    m.ReplyToMessage.Sender.AvatarUrl,
                    m.ReplyToMessage.DeletedAt != null ? "Tin nhắn đã bị xóa" : m.ReplyToMessage.Content,
                    m.ReplyToMessage.DeletedAt != null
                ) : null,
                m.IsEdited,
                m.CreatedAt,
                m.Attachments
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (targetMessage == null)
            return Error.NotFound("Message.NotFound", $"Message {request.TargetMessageId} not found in channel {request.ChannelId}.");

        var limit = Math.Clamp(request.Limit, 1, 100);
        var halfLimit = limit / 2;

        // 3. Query older messages (before target)
        var olderMessages = await _context.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == request.ChannelId && m.DeletedAt == null && m.CreatedAt < targetMessage.CreatedAt)
            .OrderByDescending(m => m.CreatedAt)
            .Take(halfLimit + 1)
            .Select(m => new
            {
                m.Id,
                m.ChannelId,
                m.SenderId,
                SenderDisplayName = m.Sender.DisplayName,
                SenderUsername = m.Sender.UserName ?? string.Empty,
                SenderAvatarUrl = m.Sender.AvatarUrl,
                m.Content,
                ReplyTo = m.ReplyToMessage != null ? new MessageReplyDto(
                    m.ReplyToMessage.Id,
                    m.ReplyToMessage.SenderId,
                    m.ReplyToMessage.Sender.DisplayName ?? "Unknown",
                    m.ReplyToMessage.Sender.AvatarUrl,
                    m.ReplyToMessage.DeletedAt != null ? "Tin nhắn đã bị xóa" : m.ReplyToMessage.Content,
                    m.ReplyToMessage.DeletedAt != null
                ) : null,
                m.IsEdited,
                m.CreatedAt,
                m.Attachments
            })
            .ToListAsync(cancellationToken);

        var hasMore = olderMessages.Count > halfLimit;
        if (hasMore)
        {
            olderMessages.RemoveAt(olderMessages.Count - 1);
        }
        olderMessages.Reverse(); // Order chronologically

        // 4. Query newer messages (after target)
        var newerMessages = await _context.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == request.ChannelId && m.DeletedAt == null && m.CreatedAt > targetMessage.CreatedAt)
            .OrderBy(m => m.CreatedAt)
            .Take(halfLimit + 1)
            .Select(m => new
            {
                m.Id,
                m.ChannelId,
                m.SenderId,
                SenderDisplayName = m.Sender.DisplayName,
                SenderUsername = m.Sender.UserName ?? string.Empty,
                SenderAvatarUrl = m.Sender.AvatarUrl,
                m.Content,
                ReplyTo = m.ReplyToMessage != null ? new MessageReplyDto(
                    m.ReplyToMessage.Id,
                    m.ReplyToMessage.SenderId,
                    m.ReplyToMessage.Sender.DisplayName ?? "Unknown",
                    m.ReplyToMessage.Sender.AvatarUrl,
                    m.ReplyToMessage.DeletedAt != null ? "Tin nhắn đã bị xóa" : m.ReplyToMessage.Content,
                    m.ReplyToMessage.DeletedAt != null
                ) : null,
                m.IsEdited,
                m.CreatedAt,
                m.Attachments
            })
            .ToListAsync(cancellationToken);

        var hasNewer = newerMessages.Count > halfLimit;
        if (hasNewer)
        {
            newerMessages.RemoveAt(newerMessages.Count - 1);
        }

        // 5. Combine: older + target + newer
        var allRawMessages = olderMessages
            .Concat(new[] { targetMessage })
            .Concat(newerMessages)
            .ToList();

        // 6. Batch fetch reactions for all retrieved messages
        var messageIds = allRawMessages.Select(m => m.Id).ToList();
        var reactionsByMessage = new Dictionary<Guid, List<ReactionGroupDto>>();

        if (messageIds.Count > 0)
        {
            var rawReactions = await _context.MessageReactions
                .AsNoTracking()
                .Where(r => messageIds.Contains(r.MessageId))
                .ToListAsync(cancellationToken);

            reactionsByMessage = rawReactions
                .GroupBy(r => r.MessageId)
                .ToDictionary(
                    g => g.Key,
                    g => g.GroupBy(r => r.Emoji)
                          .Select(eg => new ReactionGroupDto(
                              eg.Key,
                              eg.Count(),
                              eg.Select(r => r.UserId).ToList(),
                              eg.Any(r => r.UserId == userId.Value)
                          ))
                          .ToList()
                );
        }

        var messages = allRawMessages.Select(m => new MessageDto(
            m.Id,
            m.ChannelId,
            m.SenderId,
            m.SenderDisplayName,
            m.SenderUsername,
            m.SenderAvatarUrl,
            m.Content,
            m.ReplyTo,
            m.IsEdited,
            m.CreatedAt,
            reactionsByMessage.GetValueOrDefault(m.Id) ?? new List<ReactionGroupDto>(),
            m.Attachments != null
                ? m.Attachments.Select(a => new MessageAttachmentDto(
                    a.Url,
                    a.FileName,
                    a.FileSize,
                    a.ContentType,
                    a.Type
                )).ToList()
                : new List<MessageAttachmentDto>()
        )).ToList();

        var nextCursor = hasMore && messages.Count > 0 ? messages[0].CreatedAt : (DateTime?)null;

        return new MessagesResponseDto(messages, hasMore, nextCursor, HasOlder: hasMore, HasNewer: hasNewer);
    }
}
