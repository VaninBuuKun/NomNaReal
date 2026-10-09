using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Channels.Commands.CreateChannel;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Application.Features.Channels.Queries.GetChannels;
using NomNa.Application.Features.Servers.Commands.CreateServer;
using NomNa.Application.Features.Servers.DTOs;
using NomNa.Application.Features.Servers.Queries.GetServers;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Controllers;

[Authorize]
public class ServersController : ApiControllerBase
{
    private readonly IHubContext<ChatHub> _hubContext;

    public ServersController(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetServers()
    {
        var result = await Mediator.Send(new GetServersQuery());
        return HandleResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateServer([FromBody] CreateServerCommand command)
    {
        var result = await Mediator.Send(command);
        if (result.IsSuccess)
        {
            return CreatedAtAction(nameof(GetServers), new { id = result.Value!.Id }, result.Value);
        }
        return HandleResult(result);
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinServer([FromBody] NomNa.Application.Features.Servers.Commands.JoinServer.JoinServerCommand command)
    {
        var result = await Mediator.Send(command);
        if (result.IsSuccess && result.Value != null)
        {
            var res = result.Value;

            if (res.NewMember != null)
            {
                await _hubContext.Clients.All.SendAsync(SignalRConstants.Events.ServerMemberJoined, new
                {
                    serverId = res.Server.Id,
                    member = res.NewMember,
                    memberCount = res.Server.MemberCount
                });
            }

            if (res.WelcomeMessage != null)
            {
                await _hubContext.Clients.Group(res.WelcomeMessage.ChannelId.ToString())
                    .SendAsync(SignalRConstants.Events.ReceiveMessage, res.WelcomeMessage);
            }

            return Ok(res.Server);
        }
        return HandleResult(result);
    }

    [AllowAnonymous]
    [HttpGet("invite/{inviteCode}")]
    public async Task<IActionResult> GetServerByInviteCode([FromRoute] string inviteCode)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Servers.Queries.GetServerByInviteCode.GetServerByInviteCodeQuery(inviteCode));
        return HandleResult(result);
    }

    [HttpGet("{serverId}/channels")]
    public async Task<IActionResult> GetChannels([FromRoute] Guid serverId)
    {
        var result = await Mediator.Send(new GetChannelsQuery(serverId));
        return HandleResult(result);
    }

    [HttpPost("{serverId}/channels")]
    public async Task<IActionResult> CreateChannel([FromRoute] Guid serverId, [FromBody] CreateChannelRequest request)
    {
        var command = new CreateChannelCommand(serverId, request.Name, request.Type, request.IsPrivate);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpGet("{serverId}/members")]
    public async Task<IActionResult> GetMembers([FromRoute] Guid serverId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Servers.Queries.GetServerMembers.GetServerMembersQuery(serverId));
        return HandleResult(result);
    }

    [HttpGet("{serverId}/dm")]
    public async Task<IActionResult> GetDirectMessages([FromRoute] Guid serverId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Queries.GetDirectMessages.GetDirectMessagesQuery(serverId));
        return HandleResult(result);
    }

    [HttpPost("{serverId}/dm")]
    public async Task<IActionResult> CreateOrGetDm([FromRoute] Guid serverId, [FromBody] CreateDmRequest request)
    {
        var command = new Application.Features.Channels.Commands.CreateOrGetDmChannel.CreateOrGetDmChannelCommand(serverId, request.TargetUserId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("{serverId}/invite-emails")]
    public async Task<IActionResult> SendEmailInvites([FromRoute] Guid serverId, [FromBody] SendServerInvitesRequest request)
    {
        var command = new NomNa.Application.Features.Servers.Commands.SendServerInvites.SendServerInvitesCommand(serverId, request.Emails);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPut("{serverId}")]
    public async Task<IActionResult> UpdateServer([FromRoute] Guid serverId, [FromBody] UpdateServerRequest request)
    {
        var command = new NomNa.Application.Features.Servers.Commands.UpdateServer.UpdateServerCommand(
            serverId, request.Name, request.Description, request.IconUrl);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpDelete("{serverId}")]
    public async Task<IActionResult> DeleteServer([FromRoute] Guid serverId)
    {
        var command = new NomNa.Application.Features.Servers.Commands.DeleteServer.DeleteServerCommand(serverId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("{serverId}/leave")]
    public async Task<IActionResult> LeaveServer([FromRoute] Guid serverId)
    {
        var command = new NomNa.Application.Features.Servers.Commands.LeaveServer.LeaveServerCommand(serverId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpDelete("{serverId}/members/{memberUserId}")]
    public async Task<IActionResult> KickMember([FromRoute] Guid serverId, [FromRoute] Guid memberUserId)
    {
        var command = new NomNa.Application.Features.Servers.Commands.KickServerMember.KickServerMemberCommand(serverId, memberUserId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }
}

public record CreateChannelRequest(string Name, Domain.Enums.ChannelType Type = Domain.Enums.ChannelType.Text, bool IsPrivate = false);
public record CreateDmRequest(Guid TargetUserId);
public record SendServerInvitesRequest(List<string> Emails);
public record UpdateServerRequest(string Name, string? Description = null, string? IconUrl = null);
