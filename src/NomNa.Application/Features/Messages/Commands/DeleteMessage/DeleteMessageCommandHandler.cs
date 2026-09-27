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

        // Allow deletion if user is the sender OR is a workspace owner/admin
        var isAuthor = message.SenderId == userId.Value;
        if (!isAuthor)
        {
            var isPrivileged = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == message.Channel.WorkspaceId 
                             && wm.UserId == userId.Value 
                             && (wm.Role == WorkspaceRole.Owner || wm.Role == WorkspaceRole.Admin), cancellationToken);

            if (!isPrivileged)
            {
                return Error.Forbidden("Message.Forbidden", "You do not have permission to delete this message.");
            }
        }

        message.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return new DeletedMessageDto(
            message.Id,
            message.ChannelId,
            message.ThreadId
        );
    }
}
