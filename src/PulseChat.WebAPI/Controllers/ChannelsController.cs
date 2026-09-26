using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PulseChat.Application.Features.Messages.Commands.SendMessage;
using PulseChat.Application.Features.Messages.DTOs;
using PulseChat.Application.Features.Messages.Queries.GetMessages;

namespace PulseChat.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class ChannelsController : ApiControllerBase
{
    [HttpGet("{channelId}/messages")]
    public async Task<ActionResult<List<MessageDto>>> GetMessages(
        [FromRoute] Guid channelId,
        [FromQuery] DateTime? before,
        [FromQuery] int limit = 50)
    {
        var result = await Mediator.Send(new GetMessagesQuery(channelId, before, limit));
        return Ok(result);
    }

    [HttpPost("{channelId}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(
        [FromRoute] Guid channelId,
        [FromBody] SendMessageRequest request)
    {
        var result = await Mediator.Send(new SendMessageCommand(channelId, request.Content, request.ThreadId));
        return Ok(result);
    }
}

public record SendMessageRequest(string Content, Guid? ThreadId = null);
