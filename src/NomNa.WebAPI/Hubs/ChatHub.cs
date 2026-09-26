using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
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
