using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.AddChannelMember;

public class AddChannelMemberCommandHandler : IRequestHandler<AddChannelMemberCommand, Result<AddChannelMemberResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public AddChannelMemberCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<AddChannelMemberResultDto>> Handle(AddChannelMemberCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // 1. Chỉ lấy thông tin Channel gọn nhẹ (Không Include Members để tránh tốn RAM)
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", "Kênh không tồn tại.");

        if (!channel.IsPrivate)
            return Error.Validation("Channel.NotPrivate", "Chỉ kênh riêng tư mới cần thêm thành viên chỉ định.");

        // 2. Check quyền của người gọi (Caller): Phải là Channel Member HOẶC Workspace Admin/Owner
        var workspaceMember = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == currentUserId.Value, cancellationToken);

        if (workspaceMember == null)
            return Error.Forbidden("Workspace.Forbidden", "Bạn không thuộc không gian làm việc này.");

        var isWorkspaceAdminOrOwner = workspaceMember.Role == WorkspaceRole.Owner || workspaceMember.Role == WorkspaceRole.Admin;

        var isChannelMember = await _context.ChannelMembers
            .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == currentUserId.Value, cancellationToken);

        var isCreator = channel.CreatedById == currentUserId.Value;

        if (!isChannelMember && !isWorkspaceAdminOrOwner && !isCreator)
            return Error.Forbidden("Channel.Forbidden", "Bạn không có quyền thêm thành viên vào kênh riêng tư này.");

        // 3. Verify người được thêm (Target User) có thuộc Workspace hay không
        var targetWorkspaceMember = await _context.WorkspaceMembers
            .Include(wm => wm.User)
            .FirstOrDefaultAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == request.UserId, cancellationToken);

        if (targetWorkspaceMember == null)
            return Error.NotFound("Workspace.UserNotFound", "Người dùng không thuộc không gian làm việc này.");

        // 4. Check xem Target User đã có sẵn trong Channel chưa (Query AnyAsync trực tiếp xuống DB)
        var isTargetAlreadyMember = await _context.ChannelMembers
            .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == request.UserId, cancellationToken);

        if (isTargetAlreadyMember)
            return Error.Conflict("Channel.AlreadyMember", "Thành viên này đã có trong kênh.");

        // 5. Thêm thành viên mới vào Channel
        var newChannelMember = new ChannelMember
        {
            ChannelId = channel.Id,
            UserId = request.UserId
        };
        _context.ChannelMembers.Add(newChannelMember);

        // 6. Tạo tin nhắn thông báo vào khung chat dưới danh nghĩa người thêm
        var currentUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == currentUserId.Value, cancellationToken);

        var joinMessage = new Message
        {
            ChannelId = channel.Id,
            SenderId = currentUserId.Value,
            Content = $"đã thêm @{targetWorkspaceMember.User.DisplayName} vào kênh riêng tư.",
            CreatedAt = DateTime.UtcNow
        };
        _context.Messages.Add(joinMessage);

        channel.LastMessageAt = joinMessage.CreatedAt;
        channel.LastMessageContent = joinMessage.Content;
        channel.LastMessageSenderId = currentUserId.Value;

        await _context.SaveChangesAsync(cancellationToken);

        var messageDto = new NomNa.Application.Features.Messages.DTOs.MessageDto(
            joinMessage.Id,
            joinMessage.ChannelId,
            currentUserId.Value,
            currentUser?.DisplayName ?? "Thành viên",
            currentUser?.UserName ?? string.Empty,
            currentUser?.AvatarUrl,
            joinMessage.Content,
            null,
            false,
            joinMessage.CreatedAt,
            0,
            null,
            null
        );

        var channelDto = new ChannelDto(
            channel.Id,
            channel.WorkspaceId,
            channel.Name,
            channel.Type,
            channel.IsPrivate,
            channel.LastMessageAt,
            false
        );

        return new AddChannelMemberResultDto(
            channel.Id,
            request.UserId,
            targetWorkspaceMember.User.DisplayName,
            channelDto,
            messageDto
        );
    }
}