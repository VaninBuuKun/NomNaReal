using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.EditMessage;

public class EditMessageCommandHandler : IRequestHandler<EditMessageCommand, Result<MessageEditedDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public EditMessageCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<MessageEditedDto>> Handle(EditMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var message = await _context.Messages
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

        return new MessageEditedDto(
            message.Id,
            message.ChannelId,
            message.ThreadId,
            message.Content,
            message.IsEdited,
            message.EditedAt.Value
        );
    }
}
