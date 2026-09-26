using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Messages.Commands.SendMessage;

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, MessageDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SendMessageCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<MessageDto> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException();

        var channel = await _context.Channels
            .Include(c => c.Workspace)
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            throw new NotFoundException("Channel", request.ChannelId);

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);

        if (user == null)
            throw new UnauthorizedException();

        var message = new Message
        {
            ChannelId = request.ChannelId,
            SenderId = userId.Value,
            Content = request.Content.Trim(),
            ThreadId = request.ThreadId
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        return new MessageDto(
            message.Id,
            message.ChannelId,
            message.SenderId,
            user.DisplayName,
            user.Username,
            user.AvatarUrl,
            message.Content,
            message.ThreadId,
            message.IsEdited,
            message.CreatedAt
        );
    }
}
