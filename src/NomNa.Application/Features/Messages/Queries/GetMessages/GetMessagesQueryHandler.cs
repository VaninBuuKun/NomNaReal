using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.GetMessages;

public class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, Result<MessagesResponseDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMessagesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<MessagesResponseDto>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // 1. PERF-05: Channel permissions (ViewChannel, ReadMessageHistory, Server membership, Private Channel isolation)
        // are already validated in AuthorizationBehavior via IRequireChannelPermission and L1-cached.
        // We only check channel existence with a lightweight AnyAsync:
        var channelExists = await _context.Channels
            .AsNoTracking()
            .AnyAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (!channelExists)
            return Error.NotFound("Channel.NotFound", $"Channel {request.ChannelId} not found.");

        // 2. Cursor pagination query
        var limit = Math.Clamp(request.Limit, 1, 100);
        bool hasOlder = false;
        bool hasNewer = false;
        bool shouldReverse = true;

        var query = _context.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == request.ChannelId && m.DeletedAt == null);

        if (request.After.HasValue)
        {
            // Scrolling down / forward: fetch messages AFTER cursor in chronological order
            // PERF-07: Add secondary tie-breaker Id to guarantee strictly monotonic pagination
            query = query
                .Where(m => m.CreatedAt > request.After.Value)
                .OrderBy(m => m.CreatedAt)
                .ThenBy(m => m.Id);
            shouldReverse = false;
            hasOlder = true;
        }
        else
        {
            // Scrolling up / backward or initial load: fetch messages BEFORE cursor (or latest) in reverse chronological order
            if (request.Before.HasValue)
            {
                query = query.Where(m => m.CreatedAt < request.Before.Value);
                hasNewer = true;
            }
            else
            {
                hasNewer = false;
            }

            // PERF-07: Add secondary tie-breaker Id DESC
            query = query
                .OrderByDescending(m => m.CreatedAt)
                .ThenByDescending(m => m.Id);
            shouldReverse = true;
        }

        var rawMessages = await query
            .Take(limit + 1)
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

        var hasMoreInBatch = rawMessages.Count > limit;
        if (hasMoreInBatch)
        {
            rawMessages.RemoveAt(rawMessages.Count - 1);
        }

        if (request.After.HasValue)
        {
            hasNewer = hasMoreInBatch;
        }
        else
        {
            hasOlder = hasMoreInBatch;
        }

        var nextCursor = hasMoreInBatch && rawMessages.Count > 0 ? rawMessages[^1].CreatedAt : (DateTime?)null;

        // Batch fetch reactions for the retrieved messages in a single query
        var messageIds = rawMessages.Select(m => m.Id).ToList();
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

        var messages = rawMessages.Select(m => new MessageDto(
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

        // Reverse if fetched in descending order so client always receives chronological order (oldest to newest)
        if (shouldReverse)
        {
            messages.Reverse();
        }

        return new MessagesResponseDto(messages, hasMoreInBatch, nextCursor, hasOlder, hasNewer);
    }
}
