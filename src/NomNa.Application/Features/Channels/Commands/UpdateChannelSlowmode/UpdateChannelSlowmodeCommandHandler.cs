using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannelSlowmode;

public class UpdateChannelSlowmodeCommandHandler : IRequestHandler<UpdateChannelSlowmodeCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public UpdateChannelSlowmodeCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<Unit>> Handle(UpdateChannelSlowmodeCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .Include(c => c.Server)
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", "Channel not found.");

        if (!channel.ServerId.HasValue || channel.Server == null)
            return Error.Validation("Channel.NotServerChannel", "Slowmode is only applicable to server channels.");

        if (channel.Server.OwnerId != userId.Value)
        {
            var hasManageChannel = await _permissionService.HasChannelPermissionAsync(
                userId.Value,
                request.ChannelId,
                Permissions.ManageChannels,
                cancellationToken);

            if (!hasManageChannel)
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to manage this channel.");
        }

        channel.SlowmodeSeconds = request.SlowmodeSeconds;

        _context.ServerAuditLogs.Add(new ServerAuditLog
        {
            ServerId = channel.ServerId.Value,
            ActorId = userId.Value,
            ActionType = AuditLogActionType.ChannelUpdated,
            TargetId = channel.Id,
            TargetName = channel.Name,
            ChangesJson = $"{{\"slowmodeSeconds\":{request.SlowmodeSeconds}}}"
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

