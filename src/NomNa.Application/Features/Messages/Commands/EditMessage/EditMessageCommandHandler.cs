using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.EditMessage;

public class EditMessageCommandHandler : IRequestHandler<EditMessageCommand, Result<MessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public EditMessageCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<MessageDto>> Handle(EditMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var message = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Replies)
            .Include(m => m.Reactions)
            .FirstOrDefaultAsync(m => m.Id == request.MessageId && m.DeletedAt == null, cancellationToken);

        if (message == null)
        {
            return Error.NotFound("Message.NotFound", "Message not found or already deleted.");
        }

        if (message.SenderId != userId.Value)
        {
            return Error.Forbidden("Message.Forbidden", "You can only edit your own messages.");
        }

        message.Content = request.Content.Trim();
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var reactions = message.Reactions
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionGroupDto(
                g.Key,
                g.Count(),
                g.Select(r => r.UserId).ToList(),
                g.Any(r => r.UserId == userId.Value)
            ))
            .ToList();

        var replyCount = message.Replies.Count(r => r.DeletedAt == null);
        var lastReplyAt = message.Replies.Where(r => r.DeletedAt == null).Max(r => (DateTime?)r.CreatedAt);

        return new MessageDto(
            message.Id,
            message.ChannelId,
            message.SenderId,
            message.Sender.DisplayName,
            message.Sender.Username,
            message.Sender.AvatarUrl,
            message.Content,
            message.ThreadId,
            message.IsEdited,
            message.CreatedAt,
            replyCount,
            lastReplyAt,
            reactions
        );
    }
}
