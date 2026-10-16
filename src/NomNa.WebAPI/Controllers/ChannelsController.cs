using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Channels.Commands.AddChannelMember;
using NomNa.Application.Features.Channels.Queries.GetChannelMembers;
using NomNa.Application.Features.Messages.Commands.SendMessage;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Messages.Queries.GetMessages;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class ChannelsController : ApiControllerBase
{
    private readonly IHubContext<ChatHub> _hubContext;

    public ChannelsController(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpGet("{channelId:guid}")]
    public async Task<IActionResult> GetChannelById([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Queries.GetChannelById.GetChannelByIdQuery(channelId));
        return HandleResult(result);
    }

    [HttpGet("{channelId}/members")]
    public async Task<IActionResult> GetMembers([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new GetChannelMembersQuery(channelId));
        return HandleResult(result);
    }

    [HttpPost("{channelId}/members")]
    public async Task<IActionResult> AddMember(
        [FromRoute] Guid channelId,
        [FromBody] AddChannelMemberRequest request)
    {
        var result = await Mediator.Send(new AddChannelMemberCommand(channelId, request.UserId));
        if (result.IsSuccess && result.Value != null)
        {
            var res = result.Value;
            // 1. Realtime notify the added user so the private channel appears on their sidebar immediately
            await _hubContext.Clients.User(request.UserId.ToString())
                .SendAsync(SignalRConstants.Events.AddedToChannel, res.Channel);

            // 2. Realtime broadcast the message into the channel so all members see "@UserA đã thêm @UserB vào kênh"
            await _hubContext.Clients.Group(channelId.ToString())
                .SendAsync(SignalRConstants.Events.ReceiveMessage, res.SystemMessage);

            // 3. Realtime notify all current members inside the private channel
            await _hubContext.Clients.Group(channelId.ToString())
                .SendAsync(SignalRConstants.Events.ChannelMemberAdded, new
                {
                    channelId,
                    userId = request.UserId,
                    displayName = res.DisplayName
                });
        }
        return HandleResult(result);
    }
    [HttpGet("{channelId}/messages")]
    public async Task<IActionResult> GetMessages(
        [FromRoute] Guid channelId,
        [FromQuery] DateTime? before,
        [FromQuery] int limit = 50)
    {
        var result = await Mediator.Send(new GetMessagesQuery(channelId, before, limit));
        return HandleResult(result);
    }

    [HttpPost("{channelId}/messages")]
    public async Task<IActionResult> SendMessage(
        [FromRoute] Guid channelId,
        [FromBody] SendMessageRequest request)
    {
        var result = await Mediator.Send(new SendMessageCommand(channelId, request.Content, request.ThreadId, request.Attachments));
        return HandleResult(result);
    }

    [HttpPost("{channelId}/read")]
    public async Task<IActionResult> MarkAsRead([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Commands.MarkChannelAsRead.MarkChannelAsReadCommand(channelId));
        return HandleResult(result);
    }

    [HttpPut("{channelId}")]
    public async Task<IActionResult> UpdateChannel([FromRoute] Guid channelId, [FromBody] UpdateChannelRequest request)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Commands.UpdateChannel.UpdateChannelCommand(
            channelId,
            request.Name,
            request.Topic,
            request.CategoryId,
            request.Position,
            request.IsPrivate));
        return HandleResult(result);
    }

    [HttpDelete("{channelId}")]
    public async Task<IActionResult> DeleteChannel([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Commands.DeleteChannel.DeleteChannelCommand(channelId));
        return HandleResult(result);
    }

    [HttpGet("{channelId}/pinned")]
    public async Task<IActionResult> GetPinnedMessages([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Messages.Queries.GetPinnedMessages.GetPinnedMessagesQuery(channelId));
        return HandleResult(result);
    }

    [HttpGet("dm")]
    public async Task<IActionResult> GetUserDirectMessages()
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Queries.GetDirectMessages.GetDirectMessagesQuery(null));
        return HandleResult(result);
    }

    [HttpPost("dm")]
    public async Task<IActionResult> CreateOrGetDm([FromBody] CreateDmChannelRequest request)
    {
        var command = new NomNa.Application.Features.Channels.Commands.CreateOrGetDmChannel.CreateOrGetDmChannelCommand(
            request.ServerId,
            request.TargetUserId
        );
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }
}

public record CreateDmChannelRequest(Guid TargetUserId, Guid? ServerId = null);
public record SendMessageRequest(string? Content, Guid? ThreadId = null, List<NomNa.Application.Features.Messages.DTOs.AttachmentInputDto>? Attachments = null);
public record UpdateChannelRequest(string? Name = null, string? Topic = null, Guid? CategoryId = null, int? Position = null, bool? IsPrivate = null);
public record AddChannelMemberRequest(Guid UserId);
