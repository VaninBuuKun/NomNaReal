using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.ChannelOverwrites.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.ChannelOverwrites.Queries.GetChannelOverwrites;

public class GetChannelOverwritesQueryHandler : IRequestHandler<GetChannelOverwritesQuery, Result<List<ChannelOverwriteDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetChannelOverwritesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ChannelOverwriteDto>>> Handle(GetChannelOverwritesQuery request, CancellationToken cancellationToken)
    {
        var channel = await _context.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
        {
            return Error.NotFound("Channel.NotFound", "Kênh không tồn tại.");
        }

        var overwrites = await _context.ChannelPermissionOverwrites
            .AsNoTracking()
            .Where(o => o.ChannelId == request.ChannelId)
            .ToListAsync(cancellationToken);

        var roleIds = overwrites.Where(o => o.TargetType == OverwriteType.Role).Select(o => o.TargetId).ToList();
        var userIds = overwrites.Where(o => o.TargetType == OverwriteType.Member).Select(o => o.TargetId).ToList();

        var rolesMap = await _context.Roles
            .AsNoTracking()
            .Where(r => roleIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => new { r.Name, r.ColorHex }, cancellationToken);

        var usersMap = await _context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);

        var result = overwrites.Select(o =>
        {
            string name = "Unknown";
            string? colorHex = null;

            if (o.TargetType == OverwriteType.Role && rolesMap.TryGetValue(o.TargetId, out var roleInfo))
            {
                name = roleInfo.Name;
                colorHex = roleInfo.ColorHex;
            }
            else if (o.TargetType == OverwriteType.Member && usersMap.TryGetValue(o.TargetId, out var userName))
            {
                name = userName;
            }

            return new ChannelOverwriteDto(
                o.Id,
                o.ChannelId,
                o.TargetId,
                o.TargetType,
                name,
                colorHex,
                (long)o.Allow,
                (long)o.Deny
            );
        }).ToList();

        return result;
    }
}
