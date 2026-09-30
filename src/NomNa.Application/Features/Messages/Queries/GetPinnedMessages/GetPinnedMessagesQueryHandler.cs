using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.GetPinnedMessages;

public class GetPinnedMessagesQueryHandler : IRequestHandler<GetPinnedMessagesQuery, Result<List<PinnedMessageDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetPinnedMessagesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<PinnedMessageDto>>> Handle(GetPinnedMessagesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
        {
            return Error.NotFound("Channel.NotFound", "Channel not found.");
        }

        // Authorization check according to channel privacy
        if (channel.IsPrivate || channel.Type == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && channel.CreatedById != userId.Value)
            {
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel.");
            }
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
            {
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
            }
        }

        var pinnedList = await _context.ChannelPinnedMessages
            .AsNoTracking()
            .Include(p => p.PinnedBy)
            .Include(p => p.Message)
                .ThenInclude(m => m.Sender)
            .Include(p => p.Message)
                .ThenInclude(m => m.Reactions)
            .Where(p => p.ChannelId == request.ChannelId && p.Message.DeletedAt == null)
            .OrderBy(p => p.OrderIndex)
            .ThenByDescending(p => p.PinnedAt)
            .ToListAsync(cancellationToken);

        var currentUserId = userId.Value;
        var dtoList = pinnedList.Select(p => new PinnedMessageDto(
            p.Id,
            p.ChannelId,
            p.MessageId,
            p.PinnedById,
            p.PinnedBy?.DisplayName ?? "Thành viên",
            p.PinnedAt,
            p.OrderIndex,
            MapToMessageDto(p.Message, currentUserId)
        )).ToList();

        return dtoList;
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
