using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.Roles.Commands.AssignRole;
using NomNa.Application.Features.Roles.Commands.CreateRole;
using NomNa.Application.Features.Roles.Commands.DeleteRole;
using NomNa.Application.Features.Roles.Commands.UnassignRole;
using NomNa.Application.Features.Roles.Commands.UpdateRole;
using NomNa.Application.Features.Roles.Queries.GetServerRoles;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/servers/{serverId:guid}/roles")]
public class RolesController : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRoles([FromRoute] Guid serverId)
    {
        var result = await Mediator.Send(new GetServerRolesQuery(serverId));
        return HandleResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole(
        [FromRoute] Guid serverId,
        [FromBody] CreateRoleRequest request)
    {
        var result = await Mediator.Send(new CreateRoleCommand(
            serverId,
            request.Name,
            request.Permissions,
            request.ColorHex,
            request.IsHoisted,
            request.IsMentionable
        ));

        return HandleResult(result);
    }

    [HttpPut("{roleId:guid}")]
    public async Task<IActionResult> UpdateRole(
        [FromRoute] Guid serverId,
        [FromRoute] Guid roleId,
        [FromBody] UpdateRoleRequest request)
    {
        var result = await Mediator.Send(new UpdateRoleCommand(
            serverId,
            roleId,
            request.Name,
            request.Permissions,
            request.ColorHex,
            request.IsHoisted,
            request.IsMentionable,
            request.Position
        ));

        return HandleResult(result);
    }

    [HttpDelete("{roleId:guid}")]
    public async Task<IActionResult> DeleteRole(
        [FromRoute] Guid serverId,
        [FromRoute] Guid roleId)
    {
        var result = await Mediator.Send(new DeleteRoleCommand(serverId, roleId));
        return HandleResult(result);
    }

    [HttpPost("/api/servers/{serverId:guid}/members/{memberId:guid}/roles/{roleId:guid}")]
    public async Task<IActionResult> AssignRole(
        [FromRoute] Guid serverId,
        [FromRoute] Guid memberId,
        [FromRoute] Guid roleId)
    {
        var result = await Mediator.Send(new AssignRoleCommand(serverId, memberId, roleId));
        return HandleResult(result);
    }

    [HttpDelete("/api/servers/{serverId:guid}/members/{memberId:guid}/roles/{roleId:guid}")]
    public async Task<IActionResult> UnassignRole(
        [FromRoute] Guid serverId,
        [FromRoute] Guid memberId,
        [FromRoute] Guid roleId)
    {
        var result = await Mediator.Send(new UnassignRoleCommand(serverId, memberId, roleId));
        return HandleResult(result);
    }
}

public record CreateRoleRequest(
    string Name,
    long Permissions,
    string? ColorHex = null,
    bool IsHoisted = false,
    bool IsMentionable = false
);

public record UpdateRoleRequest(
    string? Name = null,
    long? Permissions = null,
    string? ColorHex = null,
    bool? IsHoisted = null,
    bool? IsMentionable = null,
    int? Position = null
);
