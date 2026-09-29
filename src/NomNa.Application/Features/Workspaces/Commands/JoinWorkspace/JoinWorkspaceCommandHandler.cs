using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Workspaces.DTOs;
using NomNa.Application.Features.Workspaces.Queries.GetWorkspaceMembers;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Workspaces.Commands.JoinWorkspace;

public class JoinWorkspaceCommandHandler : IRequestHandler<JoinWorkspaceCommand, Result<JoinWorkspaceResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public JoinWorkspaceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<JoinWorkspaceResultDto>> Handle(JoinWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var cleanCode = request.InviteCode.Trim();

        // If user pasted a full URL like "http://.../join/NEXUS123", extract the last segment
        if (cleanCode.Contains('/'))
        {
            cleanCode = cleanCode.Split('/', StringSplitOptions.RemoveEmptyEntries).Last();
        }

        var workspace = await _context.Workspaces
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.InviteCode.ToUpper() == cleanCode.ToUpper(), cancellationToken);

        if (workspace == null)
        {
            return Error.NotFound("Workspace.NotFound", "Mã mời không chính xác hoặc không gian làm việc không tồn tại.");
        }

        var isAlreadyMember = workspace.Members.Any(m => m.UserId == userId.Value);
        if (isAlreadyMember)
        {
            // Already a member - return workspace directly without new notifications
            var existingWsDto = new WorkspaceDto(
                workspace.Id,
                workspace.Name,
                workspace.Description,
                workspace.IconUrl,
                workspace.InviteCode,
                workspace.OwnerId,
                workspace.Members.Count
            );
            return new JoinWorkspaceResultDto(existingWsDto, null, null);
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);

        // 1. Thêm record WorkspaceMember
        var newMember = new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = userId.Value,
            Role = WorkspaceRole.Member
        };
        _context.WorkspaceMembers.Add(newMember);

        // 2. Tìm kênh chat chung (#general hoặc kênh text đầu tiên) để gửi tin nhắn chào mừng
        var defaultChannel = await _context.Channels
            .Where(c => c.WorkspaceId == workspace.Id && c.Type == ChannelType.Text && !c.IsPrivate)
            .OrderBy(c => c.Name == "general" ? 0 : 1)
            .ThenBy(c => c.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        MessageDto? welcomeMessageDto = null;
        if (defaultChannel != null)
        {
            var welcomeMessage = new Message
            {
                ChannelId = defaultChannel.Id,
                SenderId = userId.Value,
                Content = "đã tham gia đoạn chat 👋👋",
                CreatedAt = DateTime.UtcNow
            };
            _context.Messages.Add(welcomeMessage);

            defaultChannel.LastMessageAt = welcomeMessage.CreatedAt;
            defaultChannel.LastMessageContent = welcomeMessage.Content;
            defaultChannel.LastMessageSenderId = userId.Value;

            welcomeMessageDto = new MessageDto(
                welcomeMessage.Id,
                welcomeMessage.ChannelId,
                userId.Value,
                user?.DisplayName ?? "Thành viên mới",
                user?.UserName ?? string.Empty,
                user?.AvatarUrl,
                welcomeMessage.Content,
                null,
                false,
                welcomeMessage.CreatedAt,
                0,
                null,
                null
            );
        }

        await _context.SaveChangesAsync(cancellationToken);

        var wsDto = new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Description,
            workspace.IconUrl,
            workspace.InviteCode,
            workspace.OwnerId,
            workspace.Members.Count + 1
        );

        var memberDto = new WorkspaceMemberDto(
            newMember.Id,
            userId.Value,
            user?.DisplayName ?? "Thành viên mới",
            user?.UserName ?? string.Empty,
            user?.AvatarUrl,
            user?.Email,
            WorkspaceRole.Member.ToString(),
            "online"
        );

        return new JoinWorkspaceResultDto(wsDto, memberDto, welcomeMessageDto);
    }
}
