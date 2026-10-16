using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.SearchMessages;

public class SearchMessagesQueryHandler : IRequestHandler<SearchMessagesQuery, Result<List<MessageDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SearchMessagesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<MessageDto>>> Handle(SearchMessagesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        List<Guid> targetChannelIds;

        if (request.ServerId.HasValue)
        {
            // Verify server membership
            var isMember = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == request.ServerId.Value && wm.UserId == userId.Value, cancellationToken);

            if (!isMember)
                return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

            // Query accessible channel IDs for this user in the server
            var accessibleChannelIds = await _context.Channels
                .AsNoTracking()
                .Where(c => c.ServerId == request.ServerId.Value &&
                            ((!c.IsPrivate && c.Type != ChannelType.DirectMessage) ||
                             c.Members.Any(cm => cm.UserId == userId.Value)))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);

            if (request.ChannelId.HasValue)
            {
                if (!accessibleChannelIds.Contains(request.ChannelId.Value))
                {
                    return Error.Forbidden("Channel.Forbidden", "You do not have access to search in this channel.");
                }
                targetChannelIds = new List<Guid> { request.ChannelId.Value };
            }
            else
            {
                targetChannelIds = accessibleChannelIds;
            }
        }
        else if (request.ChannelId.HasValue)
        {
            // Direct Message or specific channel search without serverId
            var channel = await _context.Channels
                .AsNoTracking()
                .Where(c => c.Id == request.ChannelId.Value)
                .Select(c => new
                {
                    c.Id,
                    c.Type,
                    c.IsPrivate,
                    c.CreatedById,
                    c.ServerId,
                    IsMember = c.Members.Any(cm => cm.UserId == userId.Value) || c.CreatedById == userId.Value
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (channel == null)
                return Error.NotFound("Channel.NotFound", "Kênh không tồn tại.");

            if (channel.Type == ChannelType.DirectMessage || channel.IsPrivate)
            {
                if (!channel.IsMember)
                    return Error.Forbidden("Channel.Forbidden", "Bạn không có quyền tìm kiếm trong cuộc trò chuyện này.");
            }
            else if (channel.ServerId.HasValue)
            {
                var isServerMember = await _context.ServerMembers
                    .AnyAsync(sm => sm.ServerId == channel.ServerId.Value && sm.UserId == userId.Value, cancellationToken);
                if (!isServerMember)
                    return Error.Forbidden("Server.Forbidden", "Bạn không phải thành viên máy chủ.");
            }

            targetChannelIds = new List<Guid> { channel.Id };
        }
        else
        {
            return Error.Validation("Search.MissingScope", "Phải cung cấp ServerId hoặc ChannelId.");
        }

        var query = _context.Messages
            .AsNoTracking()
            .Where(m => targetChannelIds.Contains(m.ChannelId) && m.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();
            query = query.Where(m => EF.Functions.Like(m.Content.ToLower(), $"%{keyword}%"));
        }

        if (request.SenderId.HasValue)
        {
            query = query.Where(m => m.SenderId == request.SenderId.Value);
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt <= request.ToDate.Value);
        }

        var results = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(request.Limit)
            .Select(m => new MessageDto(
                m.Id,
                m.ChannelId,
                m.SenderId,
                m.Sender.DisplayName ?? "Unknown",
                m.Sender.UserName ?? "unknown",
                m.Sender.AvatarUrl,
                m.Content,
                m.ReplyToMessage != null ? new MessageReplyDto(
                    m.ReplyToMessage.Id,
                    m.ReplyToMessage.SenderId,
                    m.ReplyToMessage.Sender.DisplayName ?? "Unknown",
                    m.ReplyToMessage.Sender.AvatarUrl,
                    m.ReplyToMessage.DeletedAt != null ? "Tin nhắn đã bị xóa" : m.ReplyToMessage.Content,
                    m.ReplyToMessage.DeletedAt != null
                ) : null,
                m.IsEdited,
                m.CreatedAt,
                null,
                m.Attachments.Select(a => new MessageAttachmentDto(
                    a.Url,
                    a.FileName,
                    a.FileSize,
                    a.ContentType,
                    a.Type
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return results;
    }
}
