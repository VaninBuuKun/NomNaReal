using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Hub invocation filter enforcing sliding-window rate limits across SignalR WebSocket connections
/// to prevent message flooding, WebRTC signaling denial-of-service, and server exhaustion.
/// </summary>
public class SignalRRateLimitingHubFilter : IHubFilter
{
    private readonly ILogger<SignalRRateLimitingHubFilter> _logger;

    // Sliding window tracker: ConnectionId -> (Count, WindowStartTimestampMs)
    private static readonly ConcurrentDictionary<string, (int Count, long WindowStartMs)> _rateLimits = new();
    private const int MaxCallsPerSecond = 25; // 25 RPC invocations per 1-second window
    private const long WindowDurationMs = 1000;

    public SignalRRateLimitingHubFilter(ILogger<SignalRRateLimitingHubFilter> logger)
    {
        _logger = logger;
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var connectionId = invocationContext.Context.ConnectionId;
        var now = Environment.TickCount64;

        var isRateExceeded = false;

        _rateLimits.AddOrUpdate(
            connectionId,
            _ => (1, now),
            (_, current) =>
            {
                if (now - current.WindowStartMs > WindowDurationMs)
                {
                    // New window
                    return (1, now);
                }

                if (current.Count >= MaxCallsPerSecond)
                {
                    isRateExceeded = true;
                    return current;
                }

                return (current.Count + 1, current.WindowStartMs);
            });

        if (isRateExceeded)
        {
            _logger.LogWarning(
                "SignalR rate limit exceeded by Connection {ConnectionId} (User {UserId}) calling method {Method}",
                connectionId,
                invocationContext.Context.UserIdentifier,
                invocationContext.HubMethodName);

            throw new HubException("SignalR rate limit exceeded. Please throttle your requests.");
        }

        return await next(invocationContext);
    }

    public async Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        _rateLimits.TryRemove(context.Context.ConnectionId, out _);
        await next(context, exception);
    }
}
