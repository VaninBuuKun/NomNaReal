using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Servers.DTOs;
using NomNa.Application.Features.Servers.Queries.GetServerMembers;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.JoinServer;

public class JoinServerCommandHandler : IRequestHandler<JoinServerCommand, Result<JoinServerResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public JoinServerCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<JoinServerResultDto>> Handle(JoinServerCommand request, CancellationToken cancellationToken)
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

        var server = await _context.Servers
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.InviteCode.ToUpper() == cleanCode.ToUpper(), cancellationToken);

        if (server == null)
        {
            return Error.NotFound("Server.NotFound", "Mã mời không chính xác hoặc Server không tồn tại.");
        }

        var isAlreadyMember = server.Members.Any(m => m.UserId == userId.Value);
        if (isAlreadyMember)
        {
            // Already a member - return server directly without new notifications
            var existingWsDto = new ServerDto(
                server.Id,
                server.Name,
                server.Description,
                server.IconUrl,
                server.InviteCode,
                server.OwnerId,
                server.Members.Count
            );
            return new JoinServerResultDto(existingWsDto, null, null);
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);

        // 1. Thêm record ServerMember
        var newMember = new ServerMember
        {
            ServerId = server.Id,
            UserId = userId.Value,
            Role = ServerRole.Member
        };
        _context.ServerMembers.Add(newMember);

        // 2. Tìm kênh chat chung (#general hoặc kênh text đầu tiên) để gửi tin nhắn chào mừng
        var defaultChannel = await _context.Channels
            .Where(c => c.ServerId == server.Id && c.Type == ChannelType.Text && !c.IsPrivate)
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

        var wsDto = new ServerDto(
            server.Id,
            server.Name,
            server.Description,
            server.IconUrl,
            server.InviteCode,
            server.OwnerId,
            server.Members.Count + 1
        );

        var memberDto = new ServerMemberDto(
            newMember.Id,
            userId.Value,
            user?.DisplayName ?? "Thành viên mới",
            user?.UserName ?? string.Empty,
            user?.AvatarUrl,
            user?.Email,
            ServerRole.Member.ToString(),
            "online"
        );

        return new JoinServerResultDto(wsDto, memberDto, welcomeMessageDto);
    }
}
