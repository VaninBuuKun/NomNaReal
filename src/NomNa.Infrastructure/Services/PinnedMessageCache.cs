using Microsoft.Extensions.Caching.Memory;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Infrastructure.Services;

public class PinnedMessageCache : IPinnedMessageCache
{
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan DefaultSlidingExpiration = TimeSpan.FromMinutes(3);

    public PinnedMessageCache(IMemoryCache cache)
    {
        _cache = cache;
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
        _cache.Remove(GetCacheKey(channelId));
    }

    private static string GetCacheKey(Guid channelId) => $"pinned_messages_{channelId}";
}
