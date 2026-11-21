using Microsoft.Extensions.Caching.Memory;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Infrastructure.Services;

public class PinnedMessageCache : IPinnedMessageCache
{
    private readonly IMemoryCache _cache;
    private readonly ICacheInvalidationBus _invalidationBus;
    private static readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan DefaultSlidingExpiration = TimeSpan.FromMinutes(3);

    public PinnedMessageCache(IMemoryCache cache, ICacheInvalidationBus invalidationBus)
    {
        _cache = cache;
        _invalidationBus = invalidationBus;
    }

    public List<PinnedMessageDto>? Get(Guid channelId)
    {
        var cacheKey = GetCacheKey(channelId);
        return _cache.TryGetValue<List<PinnedMessageDto>>(cacheKey, out var pins) ? pins : null;
    }

    public void Set(Guid channelId, List<PinnedMessageDto> pinnedMessages)
    {
        var cacheKey = GetCacheKey(channelId);
        var options = new MemoryCacheEntryOptions
        {
            SlidingExpiration = DefaultSlidingExpiration,
            AbsoluteExpirationRelativeToNow = DefaultCacheExpiration
        };
        _cache.Set(cacheKey, pinnedMessages, options);
    }

    public void Invalidate(Guid channelId)
    {
        InvalidateLocal(channelId);
        _ = _invalidationBus.PublishInvalidationAsync(new CacheInvalidationMessage(CacheInvalidationScope.PinnedMessages, channelId));
    }

    public void InvalidateLocal(Guid channelId)
    {
        _cache.Remove(GetCacheKey(channelId));
    }

    private static string GetCacheKey(Guid channelId) => $"pinned_messages_{channelId}";
}
