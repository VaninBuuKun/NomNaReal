using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Messages.Commands.SendMessage;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Partial class phụ trách các RPC endpoints liên quan đến tin nhắn và tương tác (Message & Reactions).
/// </summary>
public partial class ChatHub
{
    /// <summary>
    /// Endpoint Client gọi qua WebSocket RPC để gửi tin nhắn chính.
    /// Xử lý theo mô hình Command Pattern qua MediatR, sau đó Broadcast tới Group Channel.
    /// </summary>
    public async Task<MessageDto> SendMessage(Guid channelId, string? content, Guid? replyToMessageId = null, List<AttachmentInputDto>? attachments = null)
    {
        try
        {
            // Execute Business Logic qua Application Layer (CQRS Command)
            var command = new SendMessageCommand(channelId, content, replyToMessageId, attachments);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                // Bắn HubException về cho Client catch trong SignalR Client SDK
                throw new HubException(result.Error.Message);
            }

            var message = result.Value!;

            // Broadcast (Multicast) tin nhắn vừa tạo cho TẤT CẢ các Client đang ở trong Channel Group
            var groupName = channelId.ToString();
            await Clients.Group(groupName).SendAsync(SignalRConstants.Events.ReceiveMessage, message);

            // Cho kênh Direct Message: Đồng thời bắn thẳng tới UserId của người nhận (dù họ chưa mở tab chat đó)
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var channel = await db.Channels
                    .AsNoTracking()
                    .Select(c => new { c.Id, c.Type })
                    .FirstOrDefaultAsync(c => c.Id == channelId);

                if (channel != null && channel.Type == ChannelType.DirectMessage)
                {
                    var recipientUserIds = await db.ChannelMembers
                        .AsNoTracking()
                        .Where(cm => cm.ChannelId == channelId && cm.UserId != message.SenderId)
                        .Select(cm => cm.UserId.ToString())
                        .ToListAsync();

                    if (recipientUserIds.Count > 0)
                    {
                        await Clients.Users(recipientUserIds).SendAsync(SignalRConstants.Events.ReceiveMessage, message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch direct message to user clients for channel {ChannelId}", channelId);
            }

            // Trả về cho caller (client vừa gọi SendMessage) kết quả để UI client nhận Promise/Task result
            return message;
        }
        catch (ValidationException ex)
        {
            var msg = ex.Errors.Values.SelectMany(x => x).FirstOrDefault() ?? ex.Message;
            throw new HubException(msg);
        }
    }

    /// <summary>
    /// Chỉnh sửa nội dung tin nhắn và bắn Event MessageEdited tới Channel Group.
    /// </summary>
    public async Task<MessageEditedDto> EditMessage(Guid messageId, string content)
    {
        var command = new Application.Features.Messages.Commands.EditMessage.EditMessageCommand(messageId, content);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var message = result.Value!;
        var channelGroup = message.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.MessageEdited, message);

        return message;
    }

    /// <summary>
    /// Xóa tin nhắn và thông báo Realtime để Client loại bỏ Message khỏi DOM/State UI.
    /// </summary>
    public async Task<DeletedMessageDto> DeleteMessage(Guid messageId)
    {
        var command = new Application.Features.Messages.Commands.DeleteMessage.DeleteMessageCommand(messageId);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var deleted = result.Value!;
        var channelGroup = deleted.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.MessageDeleted, deleted);

        return deleted;
    }

    /// <summary>
    /// Thêm/Gỡ Reaction (Cảm xúc emoji) trên tin nhắn Realtime.
    /// </summary>
    public async Task<ReactionToggledDto> ToggleReaction(Guid messageId, string emoji)
    {
        var command = new Application.Features.Messages.Commands.ToggleReaction.ToggleReactionCommand(messageId, emoji);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var update = result.Value!;
        var channelGroup = update.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);

        return update;
    }
}
