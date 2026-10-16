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
                c.Type,
                c.CreatedById,
                c.ServerId,
                OwnerId = c.Server != null ? c.Server.OwnerId : Guid.Empty,
                EveryoneRole = c.Server != null ? c.Server.Roles.FirstOrDefault(r => r.IsDefault) : null,
                Overwrites = c.Overwrites.ToList(),
                IsMember = c.Members.Any(m => m.UserId == userId) || c.CreatedById == userId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (channelInfo == null)
            return Permissions.None;

        if (channelInfo.Type == ChannelType.DirectMessage)
        {
            var dmPerms = channelInfo.IsMember
                ? (Permissions.ViewChannel | Permissions.SendMessages | Permissions.AttachFiles | Permissions.AddReactions | Permissions.ReadMessageHistory)
                : Permissions.None;
            _cache.Set(cacheKey, dmPerms, DefaultCacheExpiration);
            return dmPerms;
        }

        if (!channelInfo.ServerId.HasValue)
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

    public async Task<Dictionary<Guid, Permissions>> GetChannelsPermissionsAsync(Guid userId, Guid serverId, IEnumerable<Guid> channelIds, CancellationToken cancellationToken = default)
    {
        var channelIdList = channelIds.ToList();
        var result = new Dictionary<Guid, Permissions>();
        if (channelIdList.Count == 0)
            return result;

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
        {
            foreach (var id in channelIdList)
                result[id] = Permissions.None;
            return result;
        }

        // Owner bypass
        if (userId == server.OwnerId)
        {
            foreach (var id in channelIdList)
            {
                result[id] = Permissions.All;
                _cache.Set($"perm_chn_{id}_{userId}", Permissions.All, DefaultCacheExpiration);
            }
            return result;
        }

        // Fetch user's member roles in this server
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

        // Administrator bypass
        var basePerms = everyone.Permissions;
        foreach (var r in memberRoles)
        {
            basePerms |= r.Permissions;
        }
        if (PermissionCalculator.HasPermission(basePerms, Permissions.Administrator))
        {
            foreach (var id in channelIdList)
            {
                result[id] = Permissions.All;
                _cache.Set($"perm_chn_{id}_{userId}", Permissions.All, DefaultCacheExpiration);
            }
            return result;
        }

        // Fetch all overwrites for these channels in 1 query
        var allOverwrites = await _context.ChannelPermissionOverwrites
            .AsNoTracking()
            .Where(o => channelIdList.Contains(o.ChannelId))
            .ToListAsync(cancellationToken);

        var overwritesByChannel = allOverwrites
            .GroupBy(o => o.ChannelId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var id in channelIdList)
        {
            var overwrites = overwritesByChannel.GetValueOrDefault(id) ?? new List<ChannelPermissionOverwrite>();
            var perms = PermissionCalculator.CalculateChannelPermissions(
                userId,
                server.OwnerId,
                everyone,
                memberRoles,
                overwrites
            );
            result[id] = perms;
            _cache.Set($"perm_chn_{id}_{userId}", perms, DefaultCacheExpiration);
        }

        return result;
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
