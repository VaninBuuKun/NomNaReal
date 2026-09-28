using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Messages.Commands.ReplyToMessage;

public class ReplyToMessageCommandHandler : IRequestHandler<ReplyToMessageCommand, Result<MessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserProfileCache _userProfileCache;

    public ReplyToMessageCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserProfileCache userProfileCache)
    {
        _context = context;
        _currentUserService = currentUserService;
        _userProfileCache = userProfileCache;
    }

    public async Task<Result<MessageDto>> Handle(ReplyToMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // 1. Fetch parent message with its channel
        var parentMessage = await _context.Messages
            .Include(m => m.Channel)
            .FirstOrDefaultAsync(m => m.Id == request.ParentMessageId && m.DeletedAt == null, cancellationToken);

        if (parentMessage == null)
            return Error.NotFound("Message.NotFound", $"Parent message {request.ParentMessageId} not found.");

        // Strict flat-thread rule: Replies can only be added to a root message (no nested threads)
        if (parentMessage.ThreadId.HasValue)
        {
            return Error.Validation("Message.CannotReplyToReply", "Chỉ có thể phản hồi tin nhắn gốc của kênh.");
        }

        // 2. Verify membership according to channel privacy
        if (parentMessage.Channel.IsPrivate || parentMessage.Channel.Type == Domain.Enums.ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == parentMessage.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to reply in this private channel.");
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == parentMessage.Channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
        }

        // Fast In-Memory Cache Lookup (0 DB queries)
        var user = await _userProfileCache.GetAsync(userId.Value, cancellationToken);

        if (user == null)
            return Error.Unauthorized("Auth.Unauthorized", "User not found.");

        // 3. Increment parent ReplyCount and create the thread reply message
        parentMessage.ReplyCount++;

        var reply = new Message
        {
            ChannelId = parentMessage.ChannelId,
            SenderId = userId.Value,
            Content = request.Content.Trim(),
            ThreadId = parentMessage.Id
        };

        _context.Messages.Add(reply);
        await _context.SaveChangesAsync(cancellationToken);

        return new MessageDto(
            reply.Id,
            reply.ChannelId,
            reply.SenderId,
            user.DisplayName,
            user.UserName ?? string.Empty,
            user.AvatarUrl,
            reply.Content,
            reply.ThreadId,
            reply.IsEdited,
            reply.CreatedAt,
            parentMessage.ReplyCount
        );
    }
}
