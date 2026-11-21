using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;
using NomNa.Domain.Services;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Service resolving and caching user permissions across Servers and Channels.
/// Employs a Cache-Aside pattern (IMemoryCache) coupled with CancellationChangeTokens
/// and Redis Pub/Sub invalidation bus for instant cluster-wide cache invalidation.
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ICacheInvalidationBus _invalidationBus;
    private static readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromMinutes(2);

    // Static token registries shared across scoped PermissionService instances to guarantee reliable cache invalidation
    private static readonly ConcurrentDictionary<Guid, CancellationTokenSource> _serverTokens = new();
    private static readonly ConcurrentDictionary<Guid, CancellationTokenSource> _channelTokens = new();
    private static readonly ConcurrentDictionary<(Guid ServerId, Guid UserId), CancellationTokenSource> _userTokens = new();

    public PermissionService(
        IApplicationDbContext context,
        IMemoryCache cache,
        ICacheInvalidationBus invalidationBus)
    {
        _context = context;
        _cache = cache;
        _invalidationBus = invalidationBus;
    }

    private MemoryCacheEntryOptions CreateServerCacheOptions(Guid serverId, Guid userId)
    {
        var srvCts = _serverTokens.GetOrAdd(serverId, _ => new CancellationTokenSource());
        var userCts = _userTokens.GetOrAdd((serverId, userId), _ => new CancellationTokenSource());

        return new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = DefaultCacheExpiration
        }
        .AddExpirationToken(new CancellationChangeToken(srvCts.Token))
        .AddExpirationToken(new CancellationChangeToken(userCts.Token));
    }

    private MemoryCacheEntryOptions CreateChannelCacheOptions(Guid? serverId, Guid channelId, Guid userId)
    {
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = DefaultCacheExpiration
        };

        if (serverId.HasValue)
        {
            var srvCts = _serverTokens.GetOrAdd(serverId.Value, _ => new CancellationTokenSource());
            var userCts = _userTokens.GetOrAdd((serverId.Value, userId), _ => new CancellationTokenSource());
            options.AddExpirationToken(new CancellationChangeToken(srvCts.Token));
            options.AddExpirationToken(new CancellationChangeToken(userCts.Token));
        }

        var chnCts = _channelTokens.GetOrAdd(channelId, _ => new CancellationTokenSource());
        options.AddExpirationToken(new CancellationChangeToken(chnCts.Token));

        return options;
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
            _cache.Set(cacheKey, Permissions.All, CreateServerCacheOptions(serverId, userId));
            return Permissions.All;
        }

        // SEC-01: Verify server membership before evaluating roles or default permissions.
        // Non-members receive Permissions.None to prevent unauthorized access.
        var member = await _context.ServerMembers
            .AsNoTracking()
            .Where(m => m.ServerId == serverId && m.UserId == userId)
            .Select(m => new
            {
                Roles = m.MemberRoles.Select(mr => mr.Role).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null)
        {
            _cache.Set(cacheKey, Permissions.None, CreateServerCacheOptions(serverId, userId));
            return Permissions.None;
        }

        var memberRoles = member.Roles;

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

        _cache.Set(cacheKey, permissions, CreateServerCacheOptions(serverId, userId));
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
                c.IsPrivate,
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
                ? (Permissions.ViewChannel | Permissions.SendMessages | Permissions.AttachFiles | Permissions.AddReactions | Permissions.ReadMessageHistory | Permissions.ManageMessages)
                : Permissions.None;
            _cache.Set(cacheKey, dmPerms, CreateChannelCacheOptions(null, channelId, userId));
            return dmPerms;
        }

        if (!channelInfo.ServerId.HasValue)
            return Permissions.None;

        if (userId == channelInfo.OwnerId)
        {
            _cache.Set(cacheKey, Permissions.All, CreateChannelCacheOptions(channelInfo.ServerId, channelId, userId));
            return Permissions.All;
        }

        // SEC-01: Verify server membership before evaluating channel permissions.
        var serverMember = await _context.ServerMembers
            .AsNoTracking()
            .Where(m => m.ServerId == channelInfo.ServerId.Value && m.UserId == userId)
            .Select(m => new
            {
                Roles = m.MemberRoles.Select(mr => mr.Role).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (serverMember == null)
        {
            _cache.Set(cacheKey, Permissions.None, CreateChannelCacheOptions(channelInfo.ServerId, channelId, userId));
            return Permissions.None;
        }

        var memberRoles = serverMember.Roles;

        var everyone = channelInfo.EveryoneRole ?? new Role
        {
            Name = "@everyone",
            IsDefault = true,
            Permissions = Permissions.Default
        };

        var overwrites = channelInfo.Overwrites.ToList();

        // SEC-01: For private channels, remove ViewChannel from @everyone base role.
        // Grant ViewChannel only if member is explicitly enrolled or has an explicit allow overwrite.
        var effectiveEveryone = channelInfo.IsPrivate
            ? new Role
            {
                Id = everyone.Id,
                Name = everyone.Name,
                IsDefault = true,
                Permissions = everyone.Permissions & ~Permissions.ViewChannel
            }
            : everyone;

        if (channelInfo.IsPrivate && channelInfo.IsMember)
        {
            if (!overwrites.Any(o => o.TargetType == OverwriteType.Member && o.TargetId == userId))
            {
                overwrites.Add(new ChannelPermissionOverwrite
                {
                    ChannelId = channelId,
                    TargetType = OverwriteType.Member,
                    TargetId = userId,
                    Allow = Permissions.ViewChannel | Permissions.SendMessages | Permissions.ReadMessageHistory | Permissions.AttachFiles | Permissions.AddReactions,
                    Deny = Permissions.None
                });
            }
        }

        var permissions = PermissionCalculator.CalculateChannelPermissions(
            userId,
            channelInfo.OwnerId,
            effectiveEveryone,
            memberRoles,
            overwrites
        );

        _cache.Set(cacheKey, permissions, CreateChannelCacheOptions(channelInfo.ServerId, channelId, userId));
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
                _cache.Set($"perm_chn_{id}_{userId}", Permissions.All, CreateChannelCacheOptions(serverId, id, userId));
            }
            return result;
        }

        // SEC-01: Verify server membership before returning any channel permissions
        var serverMember = await _context.ServerMembers
            .AsNoTracking()
            .Where(m => m.ServerId == serverId && m.UserId == userId)
            .Select(m => new
            {
                Roles = m.MemberRoles.Select(mr => mr.Role).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (serverMember == null)
        {
            foreach (var id in channelIdList)
            {
                result[id] = Permissions.None;
                _cache.Set($"perm_chn_{id}_{userId}", Permissions.None, CreateChannelCacheOptions(serverId, id, userId));
            }
            return result;
        }

        var memberRoles = serverMember.Roles;

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
                _cache.Set($"perm_chn_{id}_{userId}", Permissions.All, CreateChannelCacheOptions(serverId, id, userId));
            }
            return result;
        }

        // Fetch channel metadata to enforce privacy rules
        var channelMetaList = await _context.Channels
            .AsNoTracking()
            .Where(c => channelIdList.Contains(c.Id))
            .Select(c => new
            {
                c.Id,
                c.IsPrivate,
                IsMember = c.Members.Any(m => m.UserId == userId) || c.CreatedById == userId
            })
            .ToListAsync(cancellationToken);

        var channelMetaMap = channelMetaList.ToDictionary(c => c.Id);

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
            var overwrites = (overwritesByChannel.GetValueOrDefault(id) ?? new List<ChannelPermissionOverwrite>()).ToList();
            var meta = channelMetaMap.GetValueOrDefault(id);
            var isPrivate = meta?.IsPrivate ?? false;
            var isMember = meta?.IsMember ?? false;

            var effectiveEveryone = isPrivate
                ? new Role
                {
                    Id = everyone.Id,
                    Name = everyone.Name,
                    IsDefault = true,
                    Permissions = everyone.Permissions & ~Permissions.ViewChannel
                }
                : everyone;

            if (isPrivate && isMember && !overwrites.Any(o => o.TargetType == OverwriteType.Member && o.TargetId == userId))
            {
                overwrites.Add(new ChannelPermissionOverwrite
                {
                    ChannelId = id,
                    TargetType = OverwriteType.Member,
                    TargetId = userId,
                    Allow = Permissions.ViewChannel | Permissions.SendMessages | Permissions.ReadMessageHistory | Permissions.AttachFiles | Permissions.AddReactions,
                    Deny = Permissions.None
                });
            }

            var perms = PermissionCalculator.CalculateChannelPermissions(
                userId,
                server.OwnerId,
                effectiveEveryone,
                memberRoles,
                overwrites
            );
            result[id] = perms;
            _cache.Set($"perm_chn_{id}_{userId}", perms, CreateChannelCacheOptions(serverId, id, userId));
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

    public void InvalidateServer(Guid serverId)
    {
        InvalidateLocalServer(serverId);
        _ = _invalidationBus.PublishInvalidationAsync(new CacheInvalidationMessage(CacheInvalidationScope.ServerPermissions, serverId));
    }

    public void InvalidateChannel(Guid channelId)
    {
        InvalidateLocalChannel(channelId);
        _ = _invalidationBus.PublishInvalidationAsync(new CacheInvalidationMessage(CacheInvalidationScope.ChannelPermissions, channelId));
    }

    public void InvalidateUser(Guid serverId, Guid userId)
    {
        InvalidateLocalUser(serverId, userId);
        _ = _invalidationBus.PublishInvalidationAsync(new CacheInvalidationMessage(CacheInvalidationScope.UserPermissions, serverId, userId));
    }

    public void InvalidateLocalServer(Guid serverId)
    {
        if (_serverTokens.TryRemove(serverId, out var cts))
        {
            try
            {
                cts.Cancel();
                cts.Dispose();
            }
            catch
            {
                // Ignore disposal errors
            }
        }
    }

    public void InvalidateLocalChannel(Guid channelId)
    {
        if (_channelTokens.TryRemove(channelId, out var cts))
        {
            try
            {
                cts.Cancel();
                cts.Dispose();
            }
            catch
            {
                // Ignore disposal errors
            }
        }
    }

    public void InvalidateLocalUser(Guid serverId, Guid userId)
    {
        if (_userTokens.TryRemove((serverId, userId), out var cts))
        {
            try
            {
                cts.Cancel();
                cts.Dispose();
            }
            catch
            {
                // Ignore disposal errors
            }
        }
    }
}
