using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.ChannelOverwrites.Commands.DeleteChannelOverwrite;
using NomNa.Application.Features.ChannelOverwrites.Commands.SetChannelOverwrite;
using NomNa.Application.Features.ChannelOverwrites.Queries.GetChannelOverwrites;
using NomNa.Domain.Enums;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/channels/{channelId:guid}/overwrites")]
public class ChannelOverwritesController : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetOverwrites([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new GetChannelOverwritesQuery(channelId));
        return HandleResult(result);
    }

    [HttpPut]
    public async Task<IActionResult> SetOverwrite(
        [FromRoute] Guid channelId,
        [FromBody] SetChannelOverwriteRequest request)
    {
        var result = await Mediator.Send(new SetChannelOverwriteCommand(
            channelId,
            request.TargetId,
            request.TargetType,
            request.Allow,
            request.Deny
        ));

        return HandleResult(result);
    }

    [HttpDelete("{overwriteId:guid}")]
    public async Task<IActionResult> DeleteOverwrite(
        [FromRoute] Guid channelId,
        [FromRoute] Guid overwriteId)
    {
        var result = await Mediator.Send(new DeleteChannelOverwriteCommand(channelId, overwriteId));
        return HandleResult(result);
    }
}

public record SetChannelOverwriteRequest(
    Guid TargetId,
    OverwriteType TargetType,
    long Allow,
    long Deny
);
