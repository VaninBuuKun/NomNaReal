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
    private readonly IPinnedMessageCache _pinnedMessageCache;
    private readonly IPermissionService _permissionService;

    public DeleteMessageCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPinnedMessageCache pinnedMessageCache,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _pinnedMessageCache = pinnedMessageCache;
        _permissionService = permissionService;
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

        // Allow deletion if user is the sender OR has ManageMessages permission (which includes Owner and Admin)
        var isAuthor = message.SenderId == userId.Value;
        if (!isAuthor)
        {
            var canManage = await _permissionService.HasChannelPermissionAsync(
                userId.Value,
                message.ChannelId,
                Permissions.ManageMessages,
                cancellationToken);

            if (!canManage)
            {
                return Error.Forbidden("Message.Forbidden", "You do not have permission to delete this message.");
            }
        }

        message.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _pinnedMessageCache.Invalidate(message.ChannelId);

        return new DeletedMessageDto(
            message.Id,
            message.ChannelId
        );
    }
}
