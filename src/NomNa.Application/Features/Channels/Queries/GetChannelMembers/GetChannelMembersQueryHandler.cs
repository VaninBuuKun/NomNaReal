using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Queries.GetChannelMembers;

public class GetChannelMembersQueryHandler : IRequestHandler<GetChannelMembersQuery, Result<List<ChannelMemberDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetChannelMembersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<ChannelMemberDto>>> Handle(GetChannelMembersQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", "Kênh không tồn tại.");

        // Check server membership
        var isServerMember = await _context.ServerMembers
            .AnyAsync(wm => wm.ServerId == channel.ServerId && wm.UserId == currentUserId.Value, cancellationToken);

        if (!isServerMember)
            return Error.Forbidden("Server.Forbidden", "Bạn không thuộc server này.");

        if (channel.IsPrivate)
        {
            var isCreator = channel.CreatedById == currentUserId.Value;
            var isChannelMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == currentUserId.Value, cancellationToken);

            var isServerAdmin = await _context.ServerMembers
                .AnyAsync(wm => wm.ServerId == channel.ServerId && wm.UserId == currentUserId.Value &&
                               (wm.Role == ServerRole.Owner || wm.Role == ServerRole.Admin), cancellationToken);

            if (!isChannelMember && !isServerAdmin && !isCreator)
                return Error.Forbidden("Channel.Forbidden", "Bạn không có quyền xem thành viên của kênh riêng tư này.");

            var members = await _context.ChannelMembers
                .AsNoTracking()
                .Where(cm => cm.ChannelId == channel.Id)
                .Include(cm => cm.User)
                .Select(cm => new ChannelMemberDto(
                    cm.UserId,
                    cm.User.DisplayName,
                    cm.User.UserName ?? string.Empty,
                    cm.User.AvatarUrl
                ))
                .ToListAsync(cancellationToken);

            // Self-healing: if creator is missing from ChannelMembers, include creator
            if (!members.Any(m => m.UserId == channel.CreatedById))
            {
                var creator = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Id == channel.CreatedById)
                    .Select(u => new ChannelMemberDto(
                        u.Id,
                        u.DisplayName,
                        u.UserName ?? string.Empty,
                        u.AvatarUrl
                    ))
                    .FirstOrDefaultAsync(cancellationToken);

                if (creator != null)
                {
                    members.Insert(0, creator);
                }
            }

            return members;
        }

        // For public channels, return all server members
        var allMembers = await _context.ServerMembers
            .AsNoTracking()
            .Where(wm => wm.ServerId == channel.ServerId)
            .Include(wm => wm.User)
            .Select(wm => new ChannelMemberDto(
                wm.UserId,
                wm.User.DisplayName,
                wm.User.UserName ?? string.Empty,
                wm.User.AvatarUrl
            ))
            .ToListAsync(cancellationToken);

        return allMembers;
    }
}
