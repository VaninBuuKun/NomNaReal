using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Messages.Commands.ReplyToMessage;
using NomNa.Application.Features.Messages.Commands.SendMessage;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Shared.Constants;

namespace NomNa.WebAPI.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly ISender _mediator;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ISender mediator, ILogger<ChatHub> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task JoinChannel(Guid channelId)
    {
        var groupName = channelId.ToString();
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} joined SignalR group {ChannelId}", Context.UserIdentifier, channelId);
    }

    public async Task LeaveChannel(Guid channelId)
    {
        var groupName = channelId.ToString();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} left SignalR group {ChannelId}", Context.UserIdentifier, channelId);
    }

    public async Task JoinThread(Guid parentMessageId)
    {
        var groupName = $"thread_{parentMessageId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} joined SignalR thread {ParentMessageId}", Context.UserIdentifier, parentMessageId);
    }

    public async Task LeaveThread(Guid parentMessageId)
    {
        var groupName = $"thread_{parentMessageId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} left SignalR thread {ParentMessageId}", Context.UserIdentifier, parentMessageId);
    }

    public async Task<MessageDto> SendMessage(Guid channelId, string content, Guid? threadId = null)
    {
        var command = new SendMessageCommand(channelId, content, threadId);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var message = result.Value!;

        // Broadcast to all clients in the channel
        var groupName = channelId.ToString();
        await Clients.Group(groupName).SendAsync(SignalRConstants.Events.ReceiveMessage, message);

        return message;
    }

    public async Task<MessageDto> SendThreadReply(Guid parentMessageId, string content)
    {
        var command = new ReplyToMessageCommand(parentMessageId, content);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var reply = result.Value!;

        // 1. Broadcast reply to all listeners in this thread
        var threadGroup = $"thread_{parentMessageId}";
        await Clients.Group(threadGroup).SendAsync(SignalRConstants.Events.ReceiveThreadReply, reply);

        // 2. Broadcast thread update to the channel so the thread badge count updates live
        var channelGroup = reply.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.ThreadReplyCountUpdated, new
        {
            parentMessageId,
            channelId = reply.ChannelId,
            replyId = reply.Id,
            replyCount = reply.ReplyCount,
            createdAt = reply.CreatedAt
        });

        return reply;
    }

    public async Task<MessageDto> EditMessage(Guid messageId, string content)
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

        if (message.ThreadId.HasValue)
        {
            await Clients.Group($"thread_{message.ThreadId.Value}").SendAsync(SignalRConstants.Events.MessageEdited, message);
        }
        await Clients.Group($"thread_{message.Id}").SendAsync(SignalRConstants.Events.MessageEdited, message);

        return message;
    }

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

        if (deleted.ThreadId.HasValue)
        {
            await Clients.Group($"thread_{deleted.ThreadId.Value}").SendAsync(SignalRConstants.Events.MessageDeleted, deleted);
        }
        await Clients.Group($"thread_{deleted.MessageId}").SendAsync(SignalRConstants.Events.MessageDeleted, deleted);

        return deleted;
    }

    public async Task<ReactionUpdateDto> ToggleReaction(Guid messageId, string emoji)
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

        if (update.ThreadId.HasValue)
        {
            await Clients.Group($"thread_{update.ThreadId.Value}").SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);
        }
        await Clients.Group($"thread_{update.MessageId}").SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);

        return update;
    }

    public async Task StartTyping(Guid channelId)
    {
        var groupName = channelId.ToString();
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Someone";
        var userId = Context.UserIdentifier;

        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserTyping, new
        {
            channelId,
            userId,
            username
        });
    }

    public async Task StopTyping(Guid channelId)
    {
        var groupName = channelId.ToString();
        var userId = Context.UserIdentifier;

        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserStoppedTyping, new
        {
            channelId,
            userId
        });
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        _logger.LogInformation("Client connected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userId);
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        _logger.LogInformation("Client disconnected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userId);
        
        await base.OnDisconnectedAsync(exception);
    }
}
