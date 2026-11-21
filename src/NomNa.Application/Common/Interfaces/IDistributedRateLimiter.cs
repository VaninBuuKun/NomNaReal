namespace NomNa.Application.Common.Interfaces;

/// <summary>
/// Distributed sliding-window rate limiter contract.
/// Enforces cluster-wide request frequency limits across multiple WebAPI nodes using atomic Redis scripts.
/// </summary>
public interface IDistributedRateLimiter
{
    /// <summary>
    /// Checks if the request rate limit for the specified key has been exceeded in the given sliding window.
    /// </summary>
    /// <param name="key">Unique partition key (e.g., IP address, user ID, connection ID).</param>
    /// <param name="permitLimit">Maximum number of permits allowed in the window.</param>
    /// <param name="window">Sliding window time span.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if the rate limit is exceeded (should block); false if allowed.</returns>
    Task<bool> IsRateLimitExceededAsync(
        string key,
        int permitLimit,
        TimeSpan window,
        CancellationToken cancellationToken = default);
}

