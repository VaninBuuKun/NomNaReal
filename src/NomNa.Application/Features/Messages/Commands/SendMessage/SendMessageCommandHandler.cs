using System.Text.RegularExpressions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Messages.Commands.SendMessage;

public partial class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, Result<MessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserProfileCache _userProfileCache;
    private readonly INotificationDispatcher _notificationDispatcher;
    private readonly IChannelSlowmodeService _slowmodeService;
    private readonly IPermissionService _permissionService;
    private readonly IChannelLastMessageCoalescer _lastMessageCoalescer;

    [GeneratedRegex(@"@([a-zA-Z0-9_\.]+)", RegexOptions.Compiled, 200)]
    private static partial Regex MentionRegex();

    public SendMessageCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserProfileCache userProfileCache,
        INotificationDispatcher notificationDispatcher,
        IChannelSlowmodeService slowmodeService,
        IPermissionService permissionService,
        IChannelLastMessageCoalescer lastMessageCoalescer)
    {
        _context = context;
        _currentUserService = currentUserService;
        _userProfileCache = userProfileCache;
        _notificationDispatcher = notificationDispatcher;
        _slowmodeService = slowmodeService;
        _permissionService = permissionService;
        _lastMessageCoalescer = lastMessageCoalescer;
    }

    public async Task<Result<MessageDto>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Error.NotFound("Channel.NotFound", $"Channel {request.ChannelId} not found.");

        if (channel.Type == Domain.Enums.ChannelType.Category)
            return Error.Validation("Channel.InvalidType", "Cannot send messages into a category channel.");

        // SEC-06: Channel Slowmode Enforcement
        if (channel.SlowmodeSeconds > 0 && channel.ServerId.HasValue)
        {
            var canBypassSlowmode = await _permissionService.HasChannelPermissionAsync(
                userId.Value,
                channel.Id,
                Domain.Enums.Permissions.ManageMessages | Domain.Enums.Permissions.ManageChannels,
                cancellationToken);

            if (!canBypassSlowmode)
            {
                var (allowed, remainingSeconds) = await _slowmodeService.TryAcquireSlowmodeLeaseAsync(
                    channel.Id,
                    userId.Value,
                    channel.SlowmodeSeconds);

                if (!allowed)
                {
                    return Error.Forbidden(
                        "Channel.SlowmodeActive",
                        $"Slowmode is enabled. Please wait {remainingSeconds}s before sending another message.");
                }
            }
        }

        // PERF-05: Channel permissions and server/private channel membership are already verified
        // in AuthorizationBehavior via IRequireChannelPermission and L1-cached. No redundant DB query needed.

        // Fast In-Memory Cache Lookup (0 DB queries)
        var user = await _userProfileCache.GetAsync(userId.Value, cancellationToken);

        if (user == null)
            return Error.Unauthorized("Auth.Unauthorized", "User not found.");

        var content = (request.Content ?? string.Empty).Trim();

        Message? replyToMessage = null;
        if (request.ReplyToMessageId.HasValue)
        {
            replyToMessage = await _context.Messages
                .AsNoTracking()
                .Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == request.ReplyToMessageId.Value && m.ChannelId == request.ChannelId, cancellationToken);
        }

        var message = new Message
        {
            ChannelId = request.ChannelId,
            SenderId = userId.Value,
            Content = content,
            ReplyToMessageId = replyToMessage?.Id,
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

        var lastMessageAt = DateTime.UtcNow;

        // Compute smart snippet for sidebar and notifications
        var smartSnippet = string.Empty;
        if (!string.IsNullOrWhiteSpace(content))
        {
            var trimmed = content.Trim();
            if (trimmed.StartsWith("![GIF", StringComparison.OrdinalIgnoreCase) ||
                (trimmed.StartsWith("http", StringComparison.OrdinalIgnoreCase) && 
                 (trimmed.Contains("tenor.com") || trimmed.Contains("giphy.com") || trimmed.EndsWith(".gif", StringComparison.OrdinalIgnoreCase))))
            {
                smartSnippet = "[GIF]";
            }
            else if (trimmed.StartsWith("http", StringComparison.OrdinalIgnoreCase) && 
                     (trimmed.EndsWith(".png", StringComparison.OrdinalIgnoreCase) || 
                      trimmed.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || 
                      trimmed.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) || 
                      trimmed.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)))
            {
                smartSnippet = "[Image]";
            }
            else
            {
                smartSnippet = trimmed.Length > 200 ? trimmed.Substring(0, 197) + "..." : trimmed;
            }
        }
        else if (message.Attachments.Count > 0)
        {
            var firstAtt = message.Attachments[0];
            var ct = (firstAtt.ContentType ?? string.Empty).ToLowerInvariant();
            var t = (firstAtt.Type ?? string.Empty).ToLowerInvariant();

            if (t == "audio" || ct.StartsWith("audio/"))
            {
                smartSnippet = "[Audio]";
            }
            else if (ct == "image/gif" || (firstAtt.FileName != null && firstAtt.FileName.EndsWith(".gif", StringComparison.OrdinalIgnoreCase)))
            {
                smartSnippet = "[GIF]";
            }
            else if (t == "image" || ct.StartsWith("image/"))
            {
                smartSnippet = message.Attachments.Count > 1 ? $"[Images ({message.Attachments.Count})]" : "[Image]";
            }
            else if (t == "video" || ct.StartsWith("video/"))
            {
                smartSnippet = "[Video]";
            }
            else
            {
                smartSnippet = !string.IsNullOrWhiteSpace(firstAtt.FileName) ? $"📎 {firstAtt.FileName}" : "[Attachment]";
            }
        }

        _context.Messages.Add(message);
        _lastMessageCoalescer.Enqueue(channel.Id, lastMessageAt, smartSnippet, userId.Value);

        // 5. Parse Mentions and Prepare Notifications (Only for Server channels, never for DMs)
        var hasContent = !string.IsNullOrWhiteSpace(content);
        var hasAttachments = message.Attachments.Count > 0;
        var createdNotifications = new List<Notification>();

        if ((hasContent || hasAttachments) && channel.Type != Domain.Enums.ChannelType.DirectMessage)
        {
            var snippet = !string.IsNullOrWhiteSpace(smartSnippet) 
                ? (smartSnippet.Length > 150 ? smartSnippet.Substring(0, 147) + "..." : smartSnippet)
                : "[Tin nhắn]";

            // Parse Mentions using compiled regex
            var mentionMatches = MentionRegex().Matches(content);
            var targetUserIds = new HashSet<Guid>();

            if (mentionMatches.Count > 0)
                {
                    var mentionedTags = mentionMatches
                        .Select(m => m.Groups[1].Value.ToLowerInvariant())
                        .Distinct()
                        .ToList();

                    // 1. Broadcast tags: @all, @channel, @here
                    if (mentionedTags.Contains("all") || mentionedTags.Contains("channel") || mentionedTags.Contains("here"))
                    {
                        List<Guid> broadcastTargetIds;

                        if (channel.IsPrivate)
                        {
                            broadcastTargetIds = await _context.ChannelMembers
                                .Where(cm => cm.ChannelId == channel.Id && cm.UserId != userId.Value)
                                .Select(cm => cm.UserId)
                                .ToListAsync(cancellationToken);
                        }
                        else if (channel.ServerId.HasValue)
                        {
                            broadcastTargetIds = await _context.ServerMembers
                                .Where(sm => sm.ServerId == channel.ServerId.Value && sm.UserId != userId.Value)
                                .Select(sm => sm.UserId)
                                .ToListAsync(cancellationToken);
                        }
                        else
                        {
                            broadcastTargetIds = new List<Guid>();
                        }

                        foreach (var mId in broadcastTargetIds)
                        {
                            targetUserIds.Add(mId);
                        }
                    }

                    // 2. Specific username tags: @username (scoped to channel/server members only)
                    var specificUsernames = mentionedTags
                        .Where(t => t != "all" && t != "channel" && t != "here")
                        .ToList();

                    if (specificUsernames.Count > 0)
                    {
                        List<Guid> matchedUsers;

                        if (channel.IsPrivate)
                        {
                            matchedUsers = await _context.ChannelMembers
                                .Where(cm => cm.ChannelId == channel.Id && cm.UserId != userId.Value && cm.User.UserName != null && specificUsernames.Contains(cm.User.UserName.ToLower()))
                                .Select(cm => cm.UserId)
                                .ToListAsync(cancellationToken);
                        }
                        else if (channel.ServerId.HasValue)
                        {
                            matchedUsers = await _context.ServerMembers
                                .Where(sm => sm.ServerId == channel.ServerId.Value && sm.UserId != userId.Value && sm.User.UserName != null && specificUsernames.Contains(sm.User.UserName.ToLower()))
                                .Select(sm => sm.UserId)
                                .ToListAsync(cancellationToken);
                        }
                        else
                        {
                            matchedUsers = new List<Guid>();
                        }

                        foreach (var uId in matchedUsers)
                        {
                            targetUserIds.Add(uId);
                        }
                    }
                }

                foreach (var targetId in targetUserIds)
                {
                    var notif = new Notification
                    {
                        UserId = targetId,
                        ActorId = userId.Value,
                        ServerId = channel.ServerId,
                        ChannelId = channel.Id,
                        MessageId = message.Id,
                        Type = Domain.Enums.NotificationType.Mention,
                        Title = $"{user.DisplayName} mentioned you in #{channel.Name}",
                        Content = snippet,
                        IsRead = false
                    };
                    createdNotifications.Add(notif);
                    _context.Notifications.Add(notif);
                }

                // Also check reply notification
                if (replyToMessage != null && replyToMessage.SenderId != userId.Value && !targetUserIds.Contains(replyToMessage.SenderId))
                {
                    var replyNotif = new Notification
                    {
                        UserId = replyToMessage.SenderId,
                        ActorId = userId.Value,
                        ServerId = channel.ServerId,
                        ChannelId = channel.Id,
                        MessageId = message.Id,
                        Type = Domain.Enums.NotificationType.ThreadReply,
                        Title = $"{user.DisplayName} replied to your message in #{channel.Name}",
                        Content = snippet,
                        IsRead = false
                    };
                    createdNotifications.Add(replyNotif);
                    _context.Notifications.Add(replyNotif);
                }
            }

        // Single atomic SaveChangesAsync call for both Message and Notifications
        await _context.SaveChangesAsync(cancellationToken);

        // Dispatch realtime SignalR notifications in background
        if (createdNotifications.Count > 0)
        {
            foreach (var notif in createdNotifications)
            {
                var notifDto = new Features.Notifications.DTOs.NotificationDto(
                    notif.Id,
                    notif.UserId,
                    notif.ActorId,
                    user.DisplayName,
                    user.UserName,
                    user.AvatarUrl,
                    notif.ServerId,
                    null,
                    notif.ChannelId,
                    channel.Name,
                    notif.MessageId,
                    notif.Type,
                    notif.Title,
                    notif.Content,
                    notif.IsRead,
                    notif.CreatedAt
                );
                _ = _notificationDispatcher.DispatchAsync(notifDto, CancellationToken.None);
            }
        }

        var attachmentDtos = message.Attachments.Select(a => new MessageAttachmentDto(
            a.Url,
            a.FileName,
            a.FileSize,
            a.ContentType,
            a.Type
        )).ToList();

        MessageReplyDto? replyToDto = null;
        if (replyToMessage != null)
        {
            replyToDto = new MessageReplyDto(
                replyToMessage.Id,
                replyToMessage.SenderId,
                replyToMessage.Sender?.DisplayName ?? "Unknown",
                replyToMessage.Sender?.AvatarUrl,
                replyToMessage.DeletedAt != null ? "Message was deleted" : replyToMessage.Content,
                replyToMessage.DeletedAt != null
            );
        }

        return new MessageDto(
            message.Id,
            message.ChannelId,
            message.SenderId,
            user.DisplayName,
            user.UserName ?? string.Empty,
            user.AvatarUrl,
            message.Content,
            replyToDto,
            message.IsEdited,
            message.CreatedAt,
            null,
            attachmentDtos
        )
        {
            ClientMessageId = request.ClientMessageId
        };
    }
}
