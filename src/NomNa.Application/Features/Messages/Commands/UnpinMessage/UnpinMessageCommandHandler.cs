using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Commands.UnpinMessage;

public class UnpinMessageCommandHandler : IRequestHandler<UnpinMessageCommand, Result<UnpinnedMessageResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UnpinMessageCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<UnpinnedMessageResultDto>> Handle(UnpinMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var pinInfo = await _context.ChannelPinnedMessages
            .Where(p => p.MessageId == request.MessageId)
            .Select(p => new
            {
                p.Id,
                p.ChannelId,
                p.MessageId,
                ChannelIsPrivate = p.Channel.IsPrivate,
                ChannelType = p.Channel.Type,
                ChannelCreatedById = p.Channel.CreatedById,
                ServerId = p.Channel.ServerId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (pinInfo == null)
        {
            return Error.NotFound("PinnedMessage.NotFound", "This message is not pinned.");
        }

        // Check channel authorization
        if (pinInfo.ChannelIsPrivate || pinInfo.ChannelType == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == pinInfo.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && pinInfo.ChannelCreatedById != userId.Value)
            {
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to unpin messages in this private channel.");
            }
        }
        else
        {
            var isMember = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == pinInfo.ServerId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
            {
                return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");
            }
        }

        await _context.ChannelPinnedMessages
            .Where(p => p.Id == pinInfo.Id)
            .ExecuteDeleteAsync(cancellationToken);

        return new UnpinnedMessageResultDto(pinInfo.ChannelId, pinInfo.MessageId);
    }
}
