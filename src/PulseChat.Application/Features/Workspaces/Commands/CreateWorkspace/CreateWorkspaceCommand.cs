using FluentValidation;
using MediatR;
using PulseChat.Application.Common.Exceptions;
using PulseChat.Application.Common.Interfaces;
using PulseChat.Application.Features.Workspaces.DTOs;
using PulseChat.Domain.Entities;
using PulseChat.Domain.Enums;

namespace PulseChat.Application.Features.Workspaces.Commands.CreateWorkspace;

public record CreateWorkspaceCommand(
    string Name,
    string? Description
) : IRequest<WorkspaceDto>;

public class CreateWorkspaceCommandValidator : AbstractValidator<CreateWorkspaceCommand>
{
    public CreateWorkspaceCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, WorkspaceDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateWorkspaceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<WorkspaceDto> Handle(CreateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException();

        var workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            OwnerId = userId.Value
        };

        // Add creator as Workspace Owner
        workspace.Members.Add(new WorkspaceMember
        {
            UserId = userId.Value,
            Role = WorkspaceRole.Owner
        });

        // Add default #general channel
        var generalChannel = new Channel
        {
            Name = "general",
            Topic = "General discussions",
            Type = ChannelType.Text,
            CreatedById = userId.Value
        };
        generalChannel.Members.Add(new ChannelMember
        {
            UserId = userId.Value
        });

        workspace.Channels.Add(generalChannel);

        _context.Workspaces.Add(workspace);
        await _context.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Description,
            workspace.IconUrl,
            workspace.InviteCode,
            workspace.OwnerId
        );
    }
}
