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
            .Where(c => c.Id == request.ChannelId)
            .Select(c => new
            {
                c.Id,
                c.IsPrivate,
                c.Type,
                c.CreatedById,
                c.WorkspaceId
            })
            .FirstOrDefaultAsync(cancellationToken);

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
            .Where(p => p.ChannelId == request.ChannelId && p.Message.DeletedAt == null)
            .OrderBy(p => p.OrderIndex)
            .ThenByDescending(p => p.PinnedAt)
            .Select(p => new PinnedMessageDto(
                p.Id,
                p.ChannelId,
                p.MessageId,
                p.PinnedById,
                p.PinnedBy.DisplayName ?? "Thành viên",
                p.PinnedAt,
                p.OrderIndex,
                new MessageDto(
                    p.Message.Id,
                    p.Message.ChannelId,
                    p.Message.SenderId,
                    p.Message.Sender.DisplayName ?? "Unknown",
                    p.Message.Sender.UserName ?? "unknown",
                    p.Message.Sender.AvatarUrl,
                    p.Message.Content,
                    p.Message.ThreadId,
                    p.Message.IsEdited,
                    p.Message.CreatedAt,
                    p.Message.ReplyCount,
                    null,
                    p.Message.Attachments.Select(a => new MessageAttachmentDto(
                        a.Url,
                        a.FileName,
                        a.FileSize,
                        a.ContentType,
                        a.Type
                    )).ToList()
                )
            ))
            .ToListAsync(cancellationToken);

        return pinnedList;
    }
}
