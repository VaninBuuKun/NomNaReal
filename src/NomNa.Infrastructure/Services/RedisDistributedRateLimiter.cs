using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Distributed rate limiter using the Sliding Window Counter algorithm backed by Redis.
/// Estimates request count across sliding windows using:
///     EstimatedCount = CurrentWindowCount + (PreviousWindowCount * (1 - (Elapsed / WindowSize)))
/// Provides O(1) memory footprint per user with only 2 lightweight integer keys instead of O(N) logs,
/// while smoothing out Boundary Burst spikes.
/// Adheres to Fail-Closed principle: if Redis cluster is unreachable, rejects excess traffic to protect
/// database and background workers from unthrottled denial-of-service attacks.
/// </summary>
public class RedisDistributedRateLimiter : IDistributedRateLimiter
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisDistributedRateLimiter> _logger;

    private const string RateLimitKeyPrefix = "nomna:ratelimit:";

    // Atomic Lua Script: Sliding Window Counter (O(1) memory overhead)
    private static readonly LuaScript SlidingWindowCounterScript = LuaScript.Prepare(@"
        local rateKey = @rateKey
        local now = tonumber(@now)
        local windowMs = tonumber(@windowMs)
        local limit = tonumber(@limit)

        local currentBlock = math.floor(now / windowMs)
        local prevBlock = currentBlock - 1

        local currKey = rateKey .. ':' .. currentBlock
        local prevKey = rateKey .. ':' .. prevBlock

        local currCount = tonumber(redis.call('GET', currKey) or '0')
        local prevCount = tonumber(redis.call('GET', prevKey) or '0')

        local elapsed = now % windowMs
        local weight = (windowMs - elapsed) / windowMs
        local estimatedCount = currCount + (prevCount * weight)

        if estimatedCount < limit then
            redis.call('INCR', currKey)
            redis.call('PEXPIRE', currKey, windowMs * 2)
            return 0
        else
            return 1
        end
    ");

    public RedisDistributedRateLimiter(IConnectionMultiplexer redis, ILogger<RedisDistributedRateLimiter> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<bool> IsRateLimitExceededAsync(
        string key,
        int permitLimit,
        TimeSpan window,
        CancellationToken cancellationToken = default)
    {
        var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = (long)window.TotalMilliseconds;
        var fullKey = $"{RateLimitKeyPrefix}{key}";

        if (!_redis.IsConnected)
        {
            _logger.LogError("Distributed Rate Limiter Error: Redis is disconnected. Failing-closed for key {Key}.", key);
            // Fail-closed: block requests when coordinator is unavailable to protect the backend
            return true;
        }

        try
        {
            var db = _redis.GetDatabase();
            var result = await db.ScriptEvaluateAsync(SlidingWindowCounterScript, new
            {
                rateKey = (RedisKey)fullKey,
                now = nowMs,
                windowMs = windowMs,
                limit = permitLimit
            });

            if (result.IsNull)
            {
                return false;
            }

            return (int)result == 1;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate Redis sliding window counter script for key {Key}. Failing closed.", key);
            return true;
        }
    }
}
