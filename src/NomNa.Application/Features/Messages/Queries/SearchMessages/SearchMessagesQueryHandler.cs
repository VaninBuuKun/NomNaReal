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

        // Verify workspace membership
        var isMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == request.WorkspaceId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");

        // Query accessible channel IDs for this user in the workspace
        var accessibleChannelIds = await _context.Channels
            .AsNoTracking()
            .Where(c => c.WorkspaceId == request.WorkspaceId &&
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
        }

        var targetChannelIds = request.ChannelId.HasValue
            ? new List<Guid> { request.ChannelId.Value }
            : accessibleChannelIds;

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
            // If end of day not specified, include until end of specified day
            var toDate = request.ToDate.Value;
            if (toDate.TimeOfDay == TimeSpan.Zero)
            {
                toDate = toDate.Date.AddDays(1).AddTicks(-1);
            }
            query = query.Where(m => m.CreatedAt <= toDate);
        }

        var limit = Math.Clamp(request.Limit, 1, 100);

        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .Select(m => new MessageDto(
                m.Id,
                m.ChannelId,
                m.SenderId,
                m.Sender.DisplayName,
                m.Sender.UserName ?? string.Empty,
                m.Sender.AvatarUrl,
                m.Content,
                m.ThreadId,
                m.IsEdited,
                m.CreatedAt,
                m.ReplyCount,
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

        return messages;
    }
}
