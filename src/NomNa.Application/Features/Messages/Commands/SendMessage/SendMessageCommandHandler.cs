using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Messages.Commands.SendMessage;

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, Result<MessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserProfileCache _userProfileCache;

    public SendMessageCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserProfileCache userProfileCache)
    {
        _context = context;
        _currentUserService = currentUserService;
        _userProfileCache = userProfileCache;
    }

    public async Task<Result<MessageDto>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", $"Channel {request.ChannelId} not found.");

        // Rule: Private channels verify ChannelMember; public channels verify WorkspaceMember.
        if (channel.IsPrivate || channel.Type == Domain.Enums.ChannelType.DirectMessage)
        {
            var isMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId.Value, cancellationToken);
            if (!isMember && channel.CreatedById != userId.Value)
                return Error.Forbidden("Channel.Forbidden", "You do not have permission to send messages in this private channel.");
        }
        else
        {
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == userId.Value, cancellationToken);
            if (!isMember)
                return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
        }

        // Fast In-Memory Cache Lookup (0 DB queries)
        var user = await _userProfileCache.GetAsync(userId.Value, cancellationToken);

        if (user == null)
            return Error.Unauthorized("Auth.Unauthorized", "User not found.");

        var content = (request.Content ?? string.Empty).Trim();

        var message = new Message
        {
            ChannelId = request.ChannelId,
            SenderId = userId.Value,
            Content = content,
            ThreadId = request.ThreadId,
            Attachments = request.Attachments != null && request.Attachments.Count > 0
                ? request.Attachments.Select(a => new MessageAttachmentItem
                {
                    Url = a.Url,
                    FileName = a.FileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    Type = a.Type
                }).ToList()
                : new List<MessageAttachmentItem>()
        };

        if (request.ThreadId == null)
        {
            channel.LastMessageAt = DateTime.UtcNow;
            channel.LastMessageSenderId = userId.Value;
            if (!string.IsNullOrWhiteSpace(content))
            {
                channel.LastMessageContent = content.Length > 200 ? content.Substring(0, 197) + "..." : content;
            }
            else if (message.Attachments.Count > 0)
            {
                channel.LastMessageContent = message.Attachments.Any(a => a.Type == "image" || a.ContentType.StartsWith("image/"))
                    ? "[Hình ảnh]"
                    : "[Tệp đính kèm]";
            }
        }
        else
        {
            var parentMessage = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == request.ThreadId.Value, cancellationToken);
            if (parentMessage != null)
            {
                parentMessage.ReplyCount++;
            }
        }

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        var attachmentDtos = message.Attachments.Select(a => new MessageAttachmentDto(
            a.Url,
            a.FileName,
            a.FileSize,
            a.ContentType,
            a.Type
        )).ToList();

        return new MessageDto(
            message.Id,
            message.ChannelId,
            message.SenderId,
            user.DisplayName,
            user.UserName ?? string.Empty,
            user.AvatarUrl,
            message.Content,
            message.ThreadId,
            message.IsEdited,
            message.CreatedAt,
            message.ReplyCount,
            null,
            attachmentDtos
        );
    }
}
