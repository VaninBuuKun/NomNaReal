using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Friends.Commands.AcceptFriendRequest;
using NomNa.Application.Features.Friends.Commands.BlockUser;
using NomNa.Application.Features.Friends.Commands.DeclineFriendRequest;
using NomNa.Application.Features.Friends.Commands.RemoveFriend;
using NomNa.Application.Features.Friends.Commands.SendFriendRequest;
using NomNa.Application.Features.Friends.Commands.UnblockUser;
using NomNa.Application.Features.Friends.Queries.GetFriendsSummary;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Controllers;

[Authorize]
public class FriendsController : ApiControllerBase
{
    private readonly IHubContext<ChatHub> _hubContext;

    public FriendsController(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetFriendsSummary()
    {
        var result = await Mediator.Send(new GetFriendsSummaryQuery());
        return HandleResult(result);
    }

    [HttpPost("request")]
    public async Task<IActionResult> SendFriendRequest([FromBody] SendFriendRequestRequest request)
    {
        var result = await Mediator.Send(new SendFriendRequestCommand(request.UsernameOrEmail));
        if (result.IsSuccess && result.Value != null)
        {
            await _hubContext.Clients.User(result.Value.UserId.ToString())
                .SendAsync(SignalRConstants.Events.FriendRequestReceived, result.Value);
        }
        return HandleResult(result);
    }

    [HttpPost("{friendshipId}/accept")]
    public async Task<IActionResult> AcceptFriendRequest([FromRoute] Guid friendshipId)
    {
        var result = await Mediator.Send(new AcceptFriendRequestCommand(friendshipId));
        if (result.IsSuccess && result.Value != null)
        {
            await _hubContext.Clients.User(result.Value.UserId.ToString())
                .SendAsync(SignalRConstants.Events.FriendRequestAccepted, result.Value);
        }
        return HandleResult(result);
    }

    [HttpPost("{friendshipId}/decline")]
    public async Task<IActionResult> DeclineFriendRequest([FromRoute] Guid friendshipId)
    {
        var result = await Mediator.Send(new DeclineFriendRequestCommand(friendshipId));
        return HandleResult(result);
    }

    [HttpDelete("{friendshipId}")]
    public async Task<IActionResult> RemoveFriend([FromRoute] Guid friendshipId)
    {
        var result = await Mediator.Send(new RemoveFriendCommand(friendshipId));
        return HandleResult(result);
    }

    [HttpPost("{targetUserId}/block")]
    public async Task<IActionResult> BlockUser([FromRoute] Guid targetUserId)
    {
        var result = await Mediator.Send(new BlockUserCommand(targetUserId));
        return HandleResult(result);
    }

    [HttpPost("{targetUserId}/unblock")]
    public async Task<IActionResult> UnblockUser([FromRoute] Guid targetUserId)
    {
        var result = await Mediator.Send(new UnblockUserCommand(targetUserId));
        return HandleResult(result);
    }
}

public record SendFriendRequestRequest(string UsernameOrEmail);
