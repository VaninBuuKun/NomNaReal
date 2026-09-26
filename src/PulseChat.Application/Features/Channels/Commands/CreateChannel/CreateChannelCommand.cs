using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.Common.Exceptions;
using PulseChat.Application.Common.Interfaces;
using PulseChat.Application.Features.Channels.DTOs;
using PulseChat.Domain.Entities;
using PulseChat.Domain.Enums;

namespace PulseChat.Application.Features.Channels.Commands.CreateChannel;

public record CreateChannelCommand(
    Guid WorkspaceId,
    string Name,
    string? Topic,
    ChannelType Type = ChannelType.Text,
    bool IsPrivate = false
) : IRequest<ChannelDto>;

public class CreateChannelCommandValidator : AbstractValidator<CreateChannelCommand>
{
    public CreateChannelCommandValidator()
    {
        RuleFor(x => x.WorkspaceId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(50).Matches(@"^[a-z0-9\-]+$")
            .WithMessage("Channel names must contain only lowercase letters, numbers, and hyphens.");
    }
}

public class CreateChannelCommandHandler : IRequestHandler<CreateChannelCommand, ChannelDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateChannelCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ChannelDto> Handle(CreateChannelCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException();

        var isMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == request.WorkspaceId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this workspace.");

        var channelName = request.Name.Trim().ToLowerInvariant();

        if (await _context.Channels.AnyAsync(c => c.WorkspaceId == request.WorkspaceId && c.Name == channelName, cancellationToken))
        {
            throw new AppException($"Channel #{channelName} already exists in this workspace.");
        }

        var channel = new Channel
        {
            WorkspaceId = request.WorkspaceId,
            Name = channelName,
            Topic = request.Topic?.Trim(),
            Type = request.Type,
            IsPrivate = request.IsPrivate,
            CreatedById = userId.Value
        };

        channel.Members.Add(new ChannelMember
        {
            UserId = userId.Value
        });

        _context.Channels.Add(channel);
        await _context.SaveChangesAsync(cancellationToken);

        return new ChannelDto(
            channel.Id,
            channel.WorkspaceId,
            channel.Name,
            channel.Topic,
            channel.Type,
            channel.IsPrivate
        );
    }
}
