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

    public ReplyToMessageCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<MessageDto>> Handle(ReplyToMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // 1. Fetch parent message with its channel and workspace
        var parentMessage = await _context.Messages
            .Include(m => m.Channel)
            .FirstOrDefaultAsync(m => m.Id == request.ParentMessageId && m.DeletedAt == null, cancellationToken);

        if (parentMessage == null)
            return Error.NotFound("Message.NotFound", $"Parent message {request.ParentMessageId} not found.");

        // If parentMessage is itself a reply to another thread, resolve root parent message so threads don't nest infinitely
        var rootThreadId = parentMessage.ThreadId ?? parentMessage.Id;

        // 2. Verify user is member of workspace
        var isMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == parentMessage.Channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);

        if (user == null)
            return Error.Unauthorized("Auth.Unauthorized", "User not found.");

        // 3. Create the thread reply message
        var reply = new Message
        {
            ChannelId = parentMessage.ChannelId,
            SenderId = userId.Value,
            Content = request.Content.Trim(),
            ThreadId = rootThreadId
        };

        _context.Messages.Add(reply);
        await _context.SaveChangesAsync(cancellationToken);

        var replyCount = await _context.Messages
            .CountAsync(m => m.ThreadId == rootThreadId && m.DeletedAt == null, cancellationToken);

        return new MessageDto(
            reply.Id,
            reply.ChannelId,
            reply.SenderId,
            user.DisplayName,
            user.UserName,
            user.AvatarUrl,
            reply.Content,
            reply.ThreadId,
            reply.IsEdited,
            reply.CreatedAt,
            replyCount,
            reply.CreatedAt
        );
    }
}
