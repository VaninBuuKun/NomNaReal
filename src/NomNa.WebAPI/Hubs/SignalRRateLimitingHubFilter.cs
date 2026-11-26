using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Common.Interfaces;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Hub invocation filter enforcing distributed sliding-window rate limits across SignalR WebSocket connections
/// with method-specific policies to prevent message flooding, call ring spamming, and signaling denial-of-service.
/// </summary>
public class SignalRRateLimitingHubFilter : IHubFilter
{
    private readonly IDistributedRateLimiter _rateLimiter;
    private readonly ILogger<SignalRRateLimitingHubFilter> _logger;

    // Granular RPC limits: (Limit, Window)
    private static readonly Dictionary<string, (int Limit, TimeSpan Window)> MethodPolicies = new(StringComparer.OrdinalIgnoreCase)
    {
        // Text messages: max 8 messages per 5 seconds
        [nameof(ChatHub.SendMessage)] = (8, TimeSpan.FromSeconds(5)),
        [nameof(ChatHub.EditMessage)] = (10, TimeSpan.FromSeconds(10)),
        // 1v1 Calls: max 3 outgoing call attempts per 60 seconds (prevents call harassment / ringing flood)
        [nameof(ChatHub.StartCall)] = (3, TimeSpan.FromSeconds(60)),
        // Voice channels: max 6 channel switches per 30 seconds
        [nameof(ChatHub.JoinVoiceChannel)] = (6, TimeSpan.FromSeconds(30)),
        // WebRTC Signaling bursts: during ICE gathering, browser emits host, srflx, relay candidates for audio & video
        // across multiple network interfaces in tens of milliseconds. Needs dedicated high-throughput policy.
        [nameof(ChatHub.SendIceCandidate)] = (120, TimeSpan.FromSeconds(2)),
        [nameof(ChatHub.SendVoiceSignal)] = (120, TimeSpan.FromSeconds(2)),
    };

    // Default policy for other interactive actions (Reactions, Pins, Typing)
    private const int DefaultMaxCallsPerSecond = 30;
    private static readonly TimeSpan DefaultWindow = TimeSpan.FromSeconds(1);

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
        var methodName = invocationContext.HubMethodName;

        var baseKey = !string.IsNullOrEmpty(userId) ? $"ws:user:{userId}" : $"ws:conn:{connectionId}";

        int limit;
        TimeSpan window;
        string partitionKey;

        if (MethodPolicies.TryGetValue(methodName, out var policy))
        {
            limit = policy.Limit;
            window = policy.Window;
            partitionKey = $"{baseKey}:{methodName.ToLowerInvariant()}";
        }
        else
        {
            limit = DefaultMaxCallsPerSecond;
            window = DefaultWindow;
            partitionKey = $"{baseKey}:default";
        }

        var isRateExceeded = await _rateLimiter.IsRateLimitExceededAsync(
            partitionKey,
            limit,
            window);

        if (isRateExceeded)
        {
            _logger.LogWarning(
                "SignalR rate limit exceeded by {PartitionKey} calling method {Method} (Limit: {Limit} per {Window}s)",
                partitionKey,
                methodName,
                limit,
                window.TotalSeconds);

            throw new HubException($"Rate limit exceeded for '{methodName}'. Please wait before trying again.");
        }

        return await next(invocationContext);
    }
}
