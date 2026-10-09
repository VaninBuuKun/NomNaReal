using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.LeaveServer;

public class LeaveServerCommandHandler : IRequestHandler<LeaveServerCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public LeaveServerCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(LeaveServerCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var server = await _context.Servers
            .FirstOrDefaultAsync(w => w.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        if (server.OwnerId == userId.Value)
            return Error.Conflict("Server.OwnerCannotLeave", "Chủ sở hữu không thể rời khỏi server. Bạn phải chuyển quyền sở hữu hoặc xóa server.");

        var member = await _context.ServerMembers
            .FirstOrDefaultAsync(m => m.ServerId == request.ServerId && m.UserId == userId.Value, cancellationToken);

        if (member == null)
            return Error.NotFound("Server.NotMember", "You are not a member of this server.");

        // Remove server membership
        _context.ServerMembers.Remove(member);

        // Also remove from any channel memberships in this server
        var channelMemberships = await _context.ChannelMembers
            .Where(cm => cm.UserId == userId.Value && cm.Channel.ServerId == request.ServerId)
            .ToListAsync(cancellationToken);

        _context.ChannelMembers.RemoveRange(channelMemberships);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
