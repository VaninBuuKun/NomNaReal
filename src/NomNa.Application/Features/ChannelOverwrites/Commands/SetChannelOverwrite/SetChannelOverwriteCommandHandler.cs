using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.ChannelOverwrites.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.ChannelOverwrites.Commands.SetChannelOverwrite;

public class SetChannelOverwriteCommandHandler : IRequestHandler<SetChannelOverwriteCommand, Result<ChannelOverwriteDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPermissionService _permissionService;

    public SetChannelOverwriteCommandHandler(IApplicationDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<Result<ChannelOverwriteDto>> Handle(SetChannelOverwriteCommand request, CancellationToken cancellationToken)
    {
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
        {
            return Error.NotFound("Channel.NotFound", "Kênh không tồn tại.");
        }

        string targetName = "Unknown";
        string? targetColorHex = null;

        if (request.TargetType == OverwriteType.Role)
        {
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == request.TargetId && r.ServerId == channel.ServerId, cancellationToken);

            if (role == null)
            {
                return Error.NotFound("Role.NotFound", "Role không tồn tại trong server của kênh này.");
            }

            targetName = role.Name;
            targetColorHex = role.ColorHex;
        }
        else if (request.TargetType == OverwriteType.Member)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.TargetId, cancellationToken);

            if (user == null)
            {
                return Error.NotFound("User.NotFound", "Người dùng không tồn tại.");
            }

            targetName = user.DisplayName;
        }

        var overwrite = await _context.ChannelPermissionOverwrites
            .FirstOrDefaultAsync(o => 
                o.ChannelId == request.ChannelId && 
                o.TargetId == request.TargetId && 
                o.TargetType == request.TargetType, cancellationToken);

        if (overwrite == null)
        {
            overwrite = new ChannelPermissionOverwrite
            {
                ChannelId = request.ChannelId,
                TargetId = request.TargetId,
                TargetType = request.TargetType,
                Allow = (Permissions)request.Allow,
                Deny = (Permissions)request.Deny
            };

            _context.ChannelPermissionOverwrites.Add(overwrite);
        }
        else
        {
            overwrite.Allow = (Permissions)request.Allow;
            overwrite.Deny = (Permissions)request.Deny;
        }

        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateChannel(request.ChannelId);

        return new ChannelOverwriteDto(
            overwrite.Id,
            overwrite.ChannelId,
            overwrite.TargetId,
            overwrite.TargetType,
            targetName,
            targetColorHex,
            (long)overwrite.Allow,
            (long)overwrite.Deny
        );
    }
}
