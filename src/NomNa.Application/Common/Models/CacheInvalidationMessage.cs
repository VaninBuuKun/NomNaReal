namespace NomNa.Application.Common.Models;

/// <summary>
/// Scopes for distributed cache invalidation broadcasts across the cluster.
/// </summary>
public enum CacheInvalidationScope
{
    ServerPermissions = 1,
    ChannelPermissions = 2,
    UserPermissions = 3,
    UserProfile = 4,
    PinnedMessages = 5
}

/// <summary>
/// Distributed message packet payload broadcast across Redis Pub/Sub to invalidate L1 in-memory caches on peer nodes.
/// </summary>
public record CacheInvalidationMessage(
    CacheInvalidationScope Scope,
    Guid EntityId,
    Guid? SecondaryId = null);

