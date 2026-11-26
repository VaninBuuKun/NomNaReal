using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Commands.MarkChannelAsRead;

public class MarkChannelAsReadCommandHandler
    : IRequestHandler<MarkChannelAsReadCommand, Result<MarkChannelAsReadDto?>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public MarkChannelAsReadCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<MarkChannelAsReadDto?>> Handle(
        MarkChannelAsReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", "Channel not found.");

        // Read receipts are only tracked for Direct Message channels
        if (channel.Type != ChannelType.DirectMessage)
            return Result<MarkChannelAsReadDto?>.Success(null);

        var member = await _context.ChannelMembers
            .FirstOrDefaultAsync(
                cm => cm.ChannelId == request.ChannelId && cm.UserId == userId.Value,
                cancellationToken);

        if (member == null)
            return Error.Forbidden("Channel.Forbidden", "You are not a member of this channel.");

        // UUIDv7 is monotonically increasing; never regress read state
        if (member.LastReadMessageId.HasValue && member.LastReadMessageId.Value >= request.MessageId)
        {
            return Result<MarkChannelAsReadDto?>.Success(new MarkChannelAsReadDto(
                request.ChannelId,
                userId.Value,
                member.LastReadMessageId.Value,
                member.LastReadAt ?? DateTime.UtcNow));
        }

        var now = DateTime.UtcNow;
        member.LastReadMessageId = request.MessageId;
        member.LastReadAt = now;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<MarkChannelAsReadDto?>.Success(new MarkChannelAsReadDto(
            request.ChannelId,
            userId.Value,
            request.MessageId,
            now));
    }
}
