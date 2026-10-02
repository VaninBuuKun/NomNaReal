using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Messages.Commands.DeleteMessage;
using NomNa.Application.Features.Messages.Commands.EditMessage;
using NomNa.Application.Features.Messages.Commands.ReplyToMessage;
using NomNa.Application.Features.Messages.Commands.ToggleReaction;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Messages.Queries.GetThreadReplies;
using NomNa.Application.Features.Messages.Queries.SearchMessages;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class MessagesController : ApiControllerBase
{
    private readonly IHubContext<ChatHub> _hubContext;

    public MessagesController(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpGet("{messageId}/thread")]
    public async Task<IActionResult> GetThreadReplies([FromRoute] Guid messageId)
    {
        var result = await Mediator.Send(new GetThreadRepliesQuery(messageId));
        return HandleResult(result);
    }

    [HttpPost("{messageId}/thread")]
    public async Task<IActionResult> ReplyToThread(
        [FromRoute] Guid messageId,
        [FromBody] ReplyToThreadRequest request)
    {
        var result = await Mediator.Send(new ReplyToMessageCommand(messageId, request.Content));
        return HandleResult(result);
    }

    [HttpPut("{messageId}")]
    public async Task<IActionResult> EditMessage(
        [FromRoute] Guid messageId,
        [FromBody] EditMessageRequest request)
    {
        var result = await Mediator.Send(new EditMessageCommand(messageId, request.Content));
        if (result.IsSuccess && result.Value != null)
        {
            var msg = result.Value;
            var channelGroup = msg.ChannelId.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.MessageEdited, msg);

            if (msg.ThreadId.HasValue)
            {
                await _hubContext.Clients.Group($"thread_{msg.ThreadId.Value}").SendAsync(SignalRConstants.Events.MessageEdited, msg);
            }
            await _hubContext.Clients.Group($"thread_{msg.Id}").SendAsync(SignalRConstants.Events.MessageEdited, msg);
        }
        return HandleResult(result);
    }

    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage([FromRoute] Guid messageId)
    {
        var result = await Mediator.Send(new DeleteMessageCommand(messageId));
        if (result.IsSuccess && result.Value != null)
        {
            var deleted = result.Value;
            var channelGroup = deleted.ChannelId.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.MessageDeleted, deleted);

            if (deleted.ThreadId.HasValue)
            {
                await _hubContext.Clients.Group($"thread_{deleted.ThreadId.Value}").SendAsync(SignalRConstants.Events.MessageDeleted, deleted);
            }
            await _hubContext.Clients.Group($"thread_{deleted.MessageId}").SendAsync(SignalRConstants.Events.MessageDeleted, deleted);
        }
        return HandleResult(result);
    }

    [HttpPost("{messageId}/reactions")]
    public async Task<IActionResult> ToggleReaction(
        [FromRoute] Guid messageId,
        [FromBody] ToggleReactionRequest request)
    {
        var result = await Mediator.Send(new ToggleReactionCommand(messageId, request.Emoji));
        if (result.IsSuccess && result.Value != null)
        {
            var update = result.Value;
            var channelGroup = update.ChannelId.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);

            if (update.ThreadId.HasValue)
            {
                await _hubContext.Clients.Group($"thread_{update.ThreadId.Value}").SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);
            }
            await _hubContext.Clients.Group($"thread_{update.MessageId}").SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);
        }
        return HandleResult(result);
    }
    [HttpGet("search")]
    public async Task<IActionResult> SearchMessages([FromQuery] SearchMessagesRequest request)
    {
        var result = await Mediator.Send(new SearchMessagesQuery(
            request.WorkspaceId,
            request.Keyword,
            request.ChannelId,
            request.SenderId,
            request.FromDate,
            request.ToDate,
            request.Limit ?? 30
        ));
        return HandleResult(result);
    }

    [HttpPost("{messageId}/pin")]
    public async Task<IActionResult> PinMessage([FromRoute] Guid messageId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Messages.Commands.PinMessage.PinMessageCommand(messageId));
        if (result.IsSuccess && result.Value != null)
        {
            var pinned = result.Value;
            await _hubContext.Clients.Group(pinned.ChannelId.ToString())
                .SendAsync(SignalRConstants.Events.MessagePinned, pinned);
        }
        return HandleResult(result);
    }

    [HttpDelete("{messageId}/pin")]
    public async Task<IActionResult> UnpinMessage([FromRoute] Guid messageId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Messages.Commands.UnpinMessage.UnpinMessageCommand(messageId));
        if (result.IsSuccess && result.Value != null)
        {
            var unpinned = result.Value;
            await _hubContext.Clients.Group(unpinned.ChannelId.ToString())
                .SendAsync(SignalRConstants.Events.MessageUnpinned, new
                {
                    channelId = unpinned.ChannelId,
                    messageId = unpinned.MessageId
                });
        }
        return HandleResult(result);
    }

    [HttpGet("link-preview")]
    public async Task<IActionResult> GetLinkPreview([FromQuery] string url)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Messages.Queries.GetLinkPreview.GetLinkPreviewQuery(url));
        return HandleResult(result);
    }
}

public record ReplyToThreadRequest(string Content);
public record EditMessageRequest(string Content);
public record ToggleReactionRequest(string Emoji);
public record SearchMessagesRequest(
    Guid WorkspaceId,
    string? Keyword,
    Guid? ChannelId,
    Guid? SenderId,
    DateTime? FromDate,
    DateTime? ToDate,
    int? Limit
);

