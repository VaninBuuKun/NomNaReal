using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Channels.Commands.CreateChannel;

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
