using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.DeleteChannel;

public class DeleteChannelCommandHandler : IRequestHandler<DeleteChannelCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public DeleteChannelCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<Unit>> Handle(DeleteChannelCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null || channel.Type == ChannelType.DirectMessage)
            return Error.NotFound("Channel.NotFound", "Channel not found.");

        if (string.Equals(channel.Name, "general", StringComparison.OrdinalIgnoreCase))
            return Error.Conflict("Channel.CannotDeleteGeneral", "Kênh mặc định #general không thể bị xóa.");

        var member = await _context.ServerMembers
            .FirstOrDefaultAsync(wm => wm.ServerId == channel.ServerId && wm.UserId == userId.Value, cancellationToken);

        if (member == null)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        var isOwnerOrAdmin = member.Role == ServerRole.Owner || member.Role == ServerRole.Admin;
        var isCreator = channel.CreatedById == userId.Value;

        if (!isOwnerOrAdmin && !isCreator)
            return Error.Forbidden("Channel.Forbidden", "Only server owners, admins, or the channel creator can delete channels.");

        _context.Channels.Remove(channel);
        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateChannel(request.ChannelId);

        return Result<Unit>.Success(Unit.Value);
    }
}
