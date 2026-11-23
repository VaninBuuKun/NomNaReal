using NomNa.Application.Common.Models;

namespace NomNa.Application.Common.Interfaces;

/// <summary>
/// Distributed 1v1 Call Signaling State Manager contract.
/// Manages WebRTC active call pairings, ringing states, and busy statuses across multi-node server clusters.
/// </summary>
public interface ICallSignalingManager
{
    /// <summary>
    /// Attempts to register an active call intent from caller to target user atomically in Redis.
    /// Returns false if either party is already in an active call.
    /// </summary>
    Task<bool> TryInitiateCallAsync(
        Guid callerId,
        Guid targetUserId,
        bool isVideo,
        TimeSpan ringTimeout,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Accepts a ringing call from callerId to responderId, transitioning the session to connected.
    /// </summary>
    Task<bool> TryAcceptCallAsync(
        Guid callerId,
        Guid responderId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks whether the user is currently engaged in an active or pending call.
    /// </summary>
    Task<bool> HasActiveCallAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the peer user ID the given user is currently in a call with, if any.
    /// </summary>
    Task<Guid?> GetCallPartnerAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifies that callerId initiated a call intended for targetUserId.
    /// </summary>
    Task<bool> VerifyPendingCallAsync(
        Guid callerId,
        Guid targetUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Terminates an active or pending call session atomically, returning call duration and metadata.
    /// </summary>
    Task<CallTerminationResult> TerminateCallAsync(
        Guid userId,
        Guid? expectedPartnerId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cleans up active call pairing for both participants (backward compatibility wrapper).
    /// </summary>
    Task EndCallAsync(
        Guid userA,
        Guid userB,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cleans up any call association for a disconnecting user and returns their call termination result if active.
    /// </summary>
    Task<CallTerminationResult> CleanupCallForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}

