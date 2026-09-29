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

        // Check workspace membership
        var isWorkspaceMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == currentUserId.Value, cancellationToken);

        if (!isWorkspaceMember)
            return Error.Forbidden("Workspace.Forbidden", "Bạn không thuộc không gian làm việc này.");

        if (channel.IsPrivate)
        {
            var isChannelMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == currentUserId.Value, cancellationToken);

            var isWorkspaceAdmin = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == currentUserId.Value &&
                               (wm.Role == WorkspaceRole.Owner || wm.Role == WorkspaceRole.Admin), cancellationToken);

            if (!isChannelMember && !isWorkspaceAdmin)
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

            return members;
        }

        // For public channels, return all workspace members
        var allMembers = await _context.WorkspaceMembers
            .AsNoTracking()
            .Where(wm => wm.WorkspaceId == channel.WorkspaceId)
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
