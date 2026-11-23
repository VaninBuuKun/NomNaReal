using StackExchange.Redis;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

public class RedisChannelSlowmodeService : IChannelSlowmodeService
{
    private readonly IConnectionMultiplexer _redis;
    private const string KeyPrefix = "nomna:slowmode:";

    public RedisChannelSlowmodeService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<(bool Allowed, int RemainingSeconds)> TryAcquireSlowmodeLeaseAsync(
        Guid channelId,
        Guid userId,
        int slowmodeSeconds)
    {
        if (slowmodeSeconds <= 0)
            return (true, 0);

        if (!_redis.IsConnected)
            return (true, 0); // Graceful fallback if Redis is down

        var db = _redis.GetDatabase();
        var slowmodeKey = $"{KeyPrefix}{channelId}:{userId}";

        var acquired = await db.StringSetAsync(
            slowmodeKey,
            "1",
            TimeSpan.FromSeconds(slowmodeSeconds),
            When.NotExists);

        if (acquired)
        {
            return (true, 0);
        }

        var ttl = await db.KeyTimeToLiveAsync(slowmodeKey);
        var remainingSeconds = Math.Max(1, (int)Math.Ceiling(ttl?.TotalSeconds ?? 1));

        return (false, remainingSeconds);
    }
}

