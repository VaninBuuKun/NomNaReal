using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Commands.DeleteMessage;

public class DeleteMessageCommandHandler : IRequestHandler<DeleteMessageCommand, Result<DeletedMessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteMessageCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<DeletedMessageDto>> Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var message = await _context.Messages
            .Include(m => m.Channel)
            .FirstOrDefaultAsync(m => m.Id == request.MessageId && m.DeletedAt == null, cancellationToken);

        if (message == null)
        {
            return Error.NotFound("Message.NotFound", "Message not found or already deleted.");
        }

        // Allow deletion if user is the sender OR is a server owner/admin
        var isAuthor = message.SenderId == userId.Value;
        if (!isAuthor)
        {
            var isPrivileged = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == message.Channel.ServerId 
                             && wm.UserId == userId.Value 
                             && (wm.Role == ServerRole.Owner || wm.Role == ServerRole.Admin), cancellationToken);

            if (!isPrivileged)
            {
                return Error.Forbidden("Message.Forbidden", "You do not have permission to delete this message.");
            }
        }

        message.DeletedAt = DateTime.UtcNow;

        if (message.ThreadId.HasValue)
        {
            var parent = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == message.ThreadId.Value && m.DeletedAt == null, cancellationToken);
            if (parent != null && parent.ReplyCount > 0)
            {
                parent.ReplyCount--;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new DeletedMessageDto(
            message.Id,
            message.ChannelId,
            message.ThreadId
        );
    }
}
