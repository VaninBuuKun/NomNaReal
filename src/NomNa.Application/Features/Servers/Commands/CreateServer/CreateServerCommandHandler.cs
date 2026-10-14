using MediatR;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.CreateServer;

public class CreateServerCommandHandler : IRequestHandler<CreateServerCommand, Result<ServerDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateServerCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ServerDto>> Handle(CreateServerCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var server = new Server
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IconUrl = request.IconUrl.Trim(),
            OwnerId = userId.Value
        };

        // Add creator as Server Owner
        server.Members.Add(new ServerMember
        {
            UserId = userId.Value,
            Role = ServerRole.Owner
        });

        // Seed default @everyone role
        server.Roles.Add(new Role
        {
            Name = "@everyone",
            IsDefault = true,
            Position = 0,
            Permissions = Permissions.Default,
            ServerId = server.Id
        });

        // 1. Default Category: KÊNH CHAT
        var textCategory = new Channel
        {
            Name = "KÊNH CHAT",
            Type = ChannelType.Category,
            Position = 0,
            CreatedById = userId.Value,
            ServerId = server.Id
        };
        server.Channels.Add(textCategory);

        // Add default #general text channel
        var generalChannel = new Channel
        {
            Name = "general",
            Type = ChannelType.Text,
            Position = 0,
            CategoryId = textCategory.Id,
            CreatedById = userId.Value,
            ServerId = server.Id
        };
        generalChannel.Members.Add(new ChannelMember
        {
            UserId = userId.Value
        });
        server.Channels.Add(generalChannel);

        // 2. Default Category: KÊNH THOẠI
        var voiceCategory = new Channel
        {
            Name = "KÊNH THOẠI",
            Type = ChannelType.Category,
            Position = 1,
            CreatedById = userId.Value,
            ServerId = server.Id
        };
        server.Channels.Add(voiceCategory);

        // Add default voice channel
        var generalVoiceChannel = new Channel
        {
            Name = "general-voice",
            Type = ChannelType.Voice,
            Position = 0,
            CategoryId = voiceCategory.Id,
            CreatedById = userId.Value,
            ServerId = server.Id
        };
        generalVoiceChannel.Members.Add(new ChannelMember
        {
            UserId = userId.Value
        });
        server.Channels.Add(generalVoiceChannel);

        _context.Servers.Add(server);
        await _context.SaveChangesAsync(cancellationToken);

        return new ServerDto(
            server.Id,
            server.Name,
            server.Description,
            server.IconUrl,
            server.InviteCode,
            server.OwnerId,
            1
        );
    }
}
