using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Queries.GetChannelById;

public class GetChannelByIdQueryHandler : IRequestHandler<GetChannelByIdQuery, Result<ChannelDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public GetChannelByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<ChannelDto>> Handle(GetChannelByIdQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .Include(c => c.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", "Kênh không tồn tại.");

        if (channel.Type == ChannelType.DirectMessage)
        {
            var isMember = channel.Members.Any(m => m.UserId == userId.Value) || channel.CreatedById == userId.Value;
            if (!isMember)
                return Error.Forbidden("Channel.Forbidden", "Bạn không có quyền truy cập cuộc trò chuyện này.");

            var otherUser = channel.Members.FirstOrDefault(m => m.UserId != userId.Value)?.User
                            ?? channel.Members.FirstOrDefault()?.User;

            var displayName = otherUser?.DisplayName ?? channel.Name ?? "Direct Message";

            return new ChannelDto(
                channel.Id,
                channel.ServerId,
                displayName,
                channel.Type,
                channel.IsPrivate,
                channel.LastMessageAt,
                false,
                (long)(Permissions.ViewChannel | Permissions.SendMessages | Permissions.AttachFiles | Permissions.AddReactions | Permissions.ReadMessageHistory),
                channel.CategoryId,
                channel.Position,
                channel.Topic
            );
        }

        // Server Channel
        if (channel.ServerId.HasValue)
        {
            var isServerMember = await _context.ServerMembers
                .AnyAsync(sm => sm.ServerId == channel.ServerId.Value && sm.UserId == userId.Value, cancellationToken);

            if (!isServerMember)
                return Error.Forbidden("Server.Forbidden", "Bạn không phải thành viên của máy chủ này.");

            var userPerms = await _permissionService.GetChannelPermissionsAsync(userId.Value, channel.Id, cancellationToken);
            if (!userPerms.HasFlag(Permissions.ViewChannel))
                return Error.Forbidden("Channel.Forbidden", "Bạn không có quyền xem kênh này.");

            return new ChannelDto(
                channel.Id,
                channel.ServerId,
                channel.Name,
                channel.Type,
                channel.IsPrivate,
                channel.LastMessageAt,
                false,
                (long)userPerms,
                channel.CategoryId,
                channel.Position,
                channel.Topic
            );
        }

        return Error.Forbidden("Channel.Forbidden", "Kênh không hợp lệ.");
    }
}
