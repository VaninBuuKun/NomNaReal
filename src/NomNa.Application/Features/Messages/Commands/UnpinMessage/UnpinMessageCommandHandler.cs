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
    private readonly IPinnedMessageCache _pinnedMessageCache;
    private readonly IPermissionService _permissionService;

    public UnpinMessageCommandHandler(
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

        // Check channel authorization: DM requires participant, Server channel requires ManageMessages permission
        if (pinInfo.ChannelType == ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == pinInfo.ChannelId && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && pinInfo.ChannelCreatedById != userId.Value)
            {
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to unpin messages in this direct message.");
            }
        }
        else
        {
            var hasManageMessages = await _permissionService.HasChannelPermissionAsync(
                userId.Value,
                pinInfo.ChannelId,
                Permissions.ManageMessages,
                cancellationToken);

            if (!hasManageMessages)
            {
                return Error.Forbidden("Permission.Forbidden", "You do not have permission to unpin messages in this channel.");
            }
        }

        await _context.ChannelPinnedMessages
            .Where(p => p.Id == pinInfo.Id)
            .ExecuteDeleteAsync(cancellationToken);

        _pinnedMessageCache.Invalidate(pinInfo.ChannelId);

        return new UnpinnedMessageResultDto(pinInfo.ChannelId, pinInfo.MessageId);
    }
}
