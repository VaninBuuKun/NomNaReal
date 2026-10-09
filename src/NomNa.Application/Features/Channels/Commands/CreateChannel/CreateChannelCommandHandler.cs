using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.CreateChannel;

public class CreateChannelCommandHandler : IRequestHandler<CreateChannelCommand, Result<ChannelDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateChannelCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ChannelDto>> Handle(CreateChannelCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var isMember = await _context.ServerMembers
            .AnyAsync(wm => wm.ServerId == request.ServerId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        var channelName = request.Name.Trim().ToLowerInvariant();

        if (await _context.Channels.AnyAsync(c => c.ServerId == request.ServerId && c.Name == channelName, cancellationToken))
        {
            return Error.Conflict("Channel.AlreadyExists", $"Channel #{channelName} already exists in this server.");
        }

        var channel = new Channel
        {
            ServerId = request.ServerId,
            Name = channelName,
            Type = request.Type,
            IsPrivate = request.IsPrivate,
            CreatedById = userId.Value
        };

        // Discord Model: ChannelMember is only created for private channels and DMs
        if (request.IsPrivate || request.Type == ChannelType.DirectMessage)
        {
            channel.Members.Add(new ChannelMember
            {
                UserId = userId.Value
            });
        }

        _context.Channels.Add(channel);
        await _context.SaveChangesAsync(cancellationToken);

        return new ChannelDto(
            channel.Id,
            channel.ServerId,
            channel.Name,
            channel.Type,
            channel.IsPrivate
        );
    }
}
