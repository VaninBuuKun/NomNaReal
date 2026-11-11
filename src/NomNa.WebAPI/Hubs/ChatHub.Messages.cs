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
/// Partial class handling WebSocket RPC endpoints for messages and reactions.
/// </summary>
public partial class ChatHub
{
    /// <summary>
    /// WebSocket RPC endpoint invoked by clients to send messages.
    /// Dispatches SendMessageCommand via MediatR and broadcasts the resulting message.
    /// </summary>
    public async Task<MessageDto> SendMessage(
        Guid channelId,
        string? content,
        Guid? replyToMessageId = null,
        List<AttachmentInputDto>? attachments = null,
        Guid? clientMessageId = null)
    {
        try
        {
            var command = new SendMessageCommand(channelId, content, replyToMessageId, attachments, clientMessageId);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                throw new HubException(result.Error.Message);
            }

            var message = result.Value!;

            // 1. Multicast to all clients currently connected to the channel group
            var groupName = channelId.ToString();
            await Clients.Group(groupName).SendAsync(SignalRConstants.Events.ReceiveMessage, message);

            // 2. For Direct Messages: Dispatch directly to recipient user connections (0 extra DB queries)
            if (message.DirectMessageRecipientIds != null && message.DirectMessageRecipientIds.Count > 0)
            {
                var recipientStrings = message.DirectMessageRecipientIds.Select(id => id.ToString()).ToList();
                await Clients.Users(recipientStrings).SendAsync(SignalRConstants.Events.ReceiveMessage, message);
            }

            return message;
        }
        catch (ValidationException ex)
        {
            var msg = ex.Errors.Values.SelectMany(x => x).FirstOrDefault() ?? ex.Message;
            throw new HubException(msg);
        }
    }

    /// <summary>
    /// Edits an existing message and broadcasts MessageEdited to the channel group.
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
    /// Deletes a message and broadcasts MessageDeleted to the channel group.
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
    /// Toggles emoji reaction on a message and broadcasts ReceiveReactionUpdated to the channel group.
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
