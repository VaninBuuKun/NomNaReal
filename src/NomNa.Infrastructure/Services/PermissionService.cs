using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;
using NomNa.Domain.Services;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Service giải quyết và cache quyền hạn của User trên Server và Channel.
/// Sử dụng Cache-Aside (IMemoryCache) với TTL ngắn hạn để đạt hiệu năng < 0.1ms dưới tải cao.
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromMinutes(2);

    public PermissionService(IApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<Permissions> GetServerPermissionsAsync(Guid userId, Guid serverId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"perm_srv_{serverId}_{userId}";
        if (_cache.TryGetValue<Permissions>(cacheKey, out var cached))
        {
            return cached;
        }

        var server = await _context.Servers
            .AsNoTracking()
            .Where(s => s.Id == serverId)
            .Select(s => new
            {
                s.OwnerId,
                EveryoneRole = s.Roles.FirstOrDefault(r => r.IsDefault)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (server == null)
            return Permissions.None;

        if (userId == server.OwnerId)
        {
            _cache.Set(cacheKey, Permissions.All, DefaultCacheExpiration);
            return Permissions.All;
        }

        var memberRoles = await _context.MemberRoles
            .AsNoTracking()
            .Where(mr => mr.ServerMember.ServerId == serverId && mr.ServerMember.UserId == userId)
            .Select(mr => mr.Role)
            .ToListAsync(cancellationToken);

        var everyone = server.EveryoneRole ?? new Role
        {
            Name = "@everyone",
            IsDefault = true,
            Permissions = Permissions.Default
        };

        var permissions = PermissionCalculator.CalculateServerPermissions(
            userId,
            server.OwnerId,
            everyone,
            memberRoles
        );

        _cache.Set(cacheKey, permissions, DefaultCacheExpiration);
        return permissions;
    }

    public async Task<Permissions> GetChannelPermissionsAsync(Guid userId, Guid channelId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"perm_chn_{channelId}_{userId}";
        if (_cache.TryGetValue<Permissions>(cacheKey, out var cached))
        {
            return cached;
        }

        var channelInfo = await _context.Channels
            .AsNoTracking()
            .Where(c => c.Id == channelId)
            .Select(c => new
            {
                c.ServerId,
                c.Server.OwnerId,
                EveryoneRole = c.Server.Roles.FirstOrDefault(r => r.IsDefault),
                Overwrites = c.Overwrites.ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (channelInfo == null)
            return Permissions.None;

        if (userId == channelInfo.OwnerId)
        {
            _cache.Set(cacheKey, Permissions.All, DefaultCacheExpiration);
            return Permissions.All;
        }

        var memberRoles = await _context.MemberRoles
            .AsNoTracking()
            .Where(mr => mr.ServerMember.ServerId == channelInfo.ServerId && mr.ServerMember.UserId == userId)
            .Select(mr => mr.Role)
            .ToListAsync(cancellationToken);

        var everyone = channelInfo.EveryoneRole ?? new Role
        {
            Name = "@everyone",
            IsDefault = true,
            Permissions = Permissions.Default
        };

        var permissions = PermissionCalculator.CalculateChannelPermissions(
            userId,
            channelInfo.OwnerId,
            everyone,
            memberRoles,
            channelInfo.Overwrites
        );

        _cache.Set(cacheKey, permissions, DefaultCacheExpiration);
        return permissions;
    }

    public async Task<bool> HasServerPermissionAsync(Guid userId, Guid serverId, Permissions requiredPermission, CancellationToken cancellationToken = default)
    {
        var permissions = await GetServerPermissionsAsync(userId, serverId, cancellationToken);
        return PermissionCalculator.HasPermission(permissions, requiredPermission);
    }

    public async Task<bool> HasChannelPermissionAsync(Guid userId, Guid channelId, Permissions requiredPermission, CancellationToken cancellationToken = default)
    {
        var permissions = await GetChannelPermissionsAsync(userId, channelId, cancellationToken);
        return PermissionCalculator.HasPermission(permissions, requiredPermission);
    }
}
