using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Common.Interfaces;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Hub invocation filter enforcing distributed sliding-window rate limits across SignalR WebSocket connections
/// to prevent message flooding, WebRTC signaling denial-of-service, and cluster-wide server exhaustion.
/// </summary>
public class SignalRRateLimitingHubFilter : IHubFilter
{
    private readonly IDistributedRateLimiter _rateLimiter;
    private readonly ILogger<SignalRRateLimitingHubFilter> _logger;

    private const int MaxCallsPerSecond = 25; // 25 RPC invocations per 1-second window
    private static readonly TimeSpan WindowDuration = TimeSpan.FromSeconds(1);

    public SignalRRateLimitingHubFilter(
        IDistributedRateLimiter rateLimiter,
        ILogger<SignalRRateLimitingHubFilter> logger)
    {
        _rateLimiter = rateLimiter;
        _logger = logger;
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var connectionId = invocationContext.Context.ConnectionId;
        var userId = invocationContext.Context.UserIdentifier;

        // Partition by user ID if authenticated, otherwise by connection ID
        var partitionKey = !string.IsNullOrEmpty(userId) ? $"ws:user:{userId}" : $"ws:conn:{connectionId}";

        var isRateExceeded = await _rateLimiter.IsRateLimitExceededAsync(
            partitionKey,
            MaxCallsPerSecond,
            WindowDuration);

        if (isRateExceeded)
        {
            _logger.LogWarning(
                "SignalR rate limit exceeded by {PartitionKey} calling method {Method}",
                partitionKey,
                invocationContext.HubMethodName);

            throw new HubException("SignalR rate limit exceeded. Please throttle your requests.");
        }

        return await next(invocationContext);
    }
}
