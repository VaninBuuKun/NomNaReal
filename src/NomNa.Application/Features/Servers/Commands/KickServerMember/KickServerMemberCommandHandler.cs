using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.KickServerMember;

public class KickServerMemberCommandHandler : IRequestHandler<KickServerMemberCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public KickServerMemberCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(KickServerMemberCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        if (userId.Value == request.MemberUserId)
            return Error.Conflict("Server.CannotKickSelf", "You cannot kick yourself from the server. Use leave instead.");

        var server = await _context.Servers
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        var currentMember = server.Members.FirstOrDefault(m => m.UserId == userId.Value);
        if (currentMember == null || (currentMember.Role != ServerRole.Owner && currentMember.Role != ServerRole.Admin))
            return Error.Forbidden("Server.Forbidden", "Only server owners or admins can remove members.");

        var targetMember = server.Members.FirstOrDefault(m => m.UserId == request.MemberUserId);
        if (targetMember == null)
            return Error.NotFound("Server.MemberNotFound", "Member not found in this server.");

        if (targetMember.Role == ServerRole.Owner)
            return Error.Forbidden("Server.CannotKickOwner", "The server owner cannot be removed.");

        if (currentMember.Role == ServerRole.Admin && targetMember.Role == ServerRole.Admin)
            return Error.Forbidden("Server.CannotKickAdmin", "Admins cannot remove other admins.");

        _context.ServerMembers.Remove(targetMember);

        var channelMemberships = await _context.ChannelMembers
            .Where(cm => cm.UserId == request.MemberUserId && cm.Channel.ServerId == request.ServerId)
            .ToListAsync(cancellationToken);

        _context.ChannelMembers.RemoveRange(channelMemberships);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
