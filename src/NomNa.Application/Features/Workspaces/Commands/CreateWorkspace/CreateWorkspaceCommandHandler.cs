using MediatR;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Workspaces.Commands.CreateWorkspace;

public class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, Result<WorkspaceDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateWorkspaceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<WorkspaceDto>> Handle(CreateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IconUrl = request.IconUrl.Trim(),
            OwnerId = userId.Value
        };

        // Add creator as Workspace Owner
        workspace.Members.Add(new WorkspaceMember
        {
            UserId = userId.Value,
            Role = WorkspaceRole.Owner
        });

        // Add default #general text channel
        var generalChannel = new Channel
        {
            Name = "general",
            Type = ChannelType.Text,
            CreatedById = userId.Value
        };
        generalChannel.Members.Add(new ChannelMember
        {
            UserId = userId.Value
        });
        workspace.Channels.Add(generalChannel);

        // Add default voice channel
        var generalVoiceChannel = new Channel
        {
            Name = "general-voice",
            Type = ChannelType.Voice,
            CreatedById = userId.Value
        };
        generalVoiceChannel.Members.Add(new ChannelMember
        {
            UserId = userId.Value
        });
        workspace.Channels.Add(generalVoiceChannel);

        _context.Workspaces.Add(workspace);
        await _context.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Description,
            workspace.IconUrl,
            workspace.InviteCode,
            workspace.OwnerId,
            1
        );
    }
}
