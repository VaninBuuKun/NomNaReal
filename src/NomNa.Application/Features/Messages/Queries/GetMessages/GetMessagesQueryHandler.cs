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

        // 1. Channel membership verification
        // Rule: Private channels verify ChannelMember; public channels verify WorkspaceMember.
        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", $"Channel {request.ChannelId} not found.");

        if (channel.IsPrivate || channel.Type == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel.");
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
        }

        // 2. Cursor pagination query
        var query = _context.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == request.ChannelId && m.DeletedAt == null && m.ThreadId == null);

        if (request.Before.HasValue)
        {
            query = query.Where(m => m.CreatedAt < request.Before.Value);
        }

        var limit = Math.Clamp(request.Limit, 1, 100);

        var rawMessages = await query
            .OrderByDescending(m => m.CreatedAt)
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
                m.ThreadId,
                m.IsEdited,
                m.CreatedAt,
                m.ReplyCount,
                m.Attachments
            })
            .ToListAsync(cancellationToken);

        var hasMore = rawMessages.Count > limit;
        if (hasMore)
        {
            rawMessages.RemoveAt(rawMessages.Count - 1);
        }

        var nextCursor = hasMore && rawMessages.Count > 0 ? rawMessages[^1].CreatedAt : (DateTime?)null;

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
            m.ThreadId,
            m.IsEdited,
            m.CreatedAt,
            m.ReplyCount,
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

        // Reverse so client receives chronological order (oldest to newest)
        messages.Reverse();

        return new MessagesResponseDto(messages, hasMore, nextCursor);
    }
}
