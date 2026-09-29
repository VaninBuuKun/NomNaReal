using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetThreadReplies;

public class GetThreadRepliesQueryHandler : IRequestHandler<GetThreadRepliesQuery, Result<ThreadDetailsDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetThreadRepliesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ThreadDetailsDto>> Handle(GetThreadRepliesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // 1. Fetch parent root message
        var parent = await _context.Messages
            .AsNoTracking()
            .Include(m => m.Channel)
            .Include(m => m.Sender)
            .FirstOrDefaultAsync(m => m.Id == request.ParentMessageId && m.DeletedAt == null, cancellationToken);

        if (parent == null)
            return Error.NotFound("Message.NotFound", $"Parent message {request.ParentMessageId} not found.");

        // 2. Check channel/workspace membership according to channel privacy
        if (parent.Channel.IsPrivate || parent.Channel.Type == Domain.Enums.ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == parent.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Channel.Forbidden", "You do not have access to this private channel thread.");
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == parent.Channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
        }

        // 3. Query all replies for this thread
        var replies = await _context.Messages
            .AsNoTracking()
            .Where(m => m.ThreadId == parent.Id && m.DeletedAt == null)
            .OrderBy(m => m.CreatedAt)
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
                0,
                m.Reactions
                    .GroupBy(r => r.Emoji)
                    .Select(g => new ReactionGroupDto(
                        g.Key,
                        g.Count(),
                        g.Select(r => r.UserId).ToList(),
                        g.Any(r => r.UserId == userId.Value)
                    ))
                    .ToList(),
                m.Attachments.Select(a => new MessageAttachmentDto(
                    a.Url,
                    a.FileName,
                    a.FileSize,
                    a.ContentType,
                    a.Type
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        var parentReactions = await _context.MessageReactions
            .Where(r => r.MessageId == parent.Id)
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionGroupDto(
                g.Key,
                g.Count(),
                g.Select(r => r.UserId).ToList(),
                g.Any(r => r.UserId == userId.Value)
            ))
            .ToListAsync(cancellationToken);

        var parentDto = new MessageDto(
            parent.Id,
            parent.ChannelId,
            parent.SenderId,
            parent.Sender.DisplayName,
            parent.Sender.UserName ?? string.Empty,
            parent.Sender.AvatarUrl,
            parent.Content,
            parent.ThreadId,
            parent.IsEdited,
            parent.CreatedAt,
            parent.ReplyCount,
            parentReactions,
            parent.Attachments.Select(a => new MessageAttachmentDto(
                a.Url,
                a.FileName,
                a.FileSize,
                a.ContentType,
                a.Type
            )).ToList()
        );

        return new ThreadDetailsDto(parentDto, replies);
    }
}
