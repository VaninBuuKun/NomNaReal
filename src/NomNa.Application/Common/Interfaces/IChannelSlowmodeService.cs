namespace NomNa.Application.Common.Interfaces;

/// <summary>
/// Service managing channel-level slowmode rate limiting using distributed Redis TTL keys.
/// </summary>
public interface IChannelSlowmodeService
{
    /// <summary>
    /// Checks whether the user is currently throttled by channel slowmode.
    /// If not throttled, records the slowmode lease for the duration.
    /// </summary>
    /// <param name="channelId">Target channel ID.</param>
    /// <param name="userId">Author user ID.</param>
    /// <param name="slowmodeSeconds">Configured channel slowmode duration in seconds.</param>
    /// <returns>True if allowed to post; false if throttled along with remaining cooldown seconds.</returns>
    Task<(bool Allowed, int RemainingSeconds)> TryAcquireSlowmodeLeaseAsync(
        Guid channelId,
        Guid userId,
        int slowmodeSeconds);
}

