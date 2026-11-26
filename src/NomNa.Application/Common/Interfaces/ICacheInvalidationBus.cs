using NomNa.Application.Common.Models;

namespace NomNa.Application.Common.Interfaces;

/// <summary>
/// Distributed Cache Invalidation Bus.
/// Coordinates instant L1 memory cache purging across multi-node clusters using Redis Pub/Sub.
/// </summary>
public interface ICacheInvalidationBus
{
    /// <summary>
    /// Publishes a cache invalidation event to all cluster nodes.
    /// </summary>
    Task PublishInvalidationAsync(CacheInvalidationMessage message, CancellationToken cancellationToken = default);
}

