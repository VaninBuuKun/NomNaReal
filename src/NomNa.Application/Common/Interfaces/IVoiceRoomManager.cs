using NomNa.Shared.Models;

namespace NomNa.Application.Common.Interfaces;

/// <summary>
/// Distributed Voice Room Manager contract.
/// Manages real-time multi-user voice channel participant rosters and state across multi-node server clusters.
/// </summary>
public interface IVoiceRoomManager
{
    /// <summary>
    /// Gets all active voice participants in a specific voice channel.
    /// </summary>
    Task<IReadOnlyCollection<VoiceParticipantPayload>> GetParticipantsAsync(
        Guid channelId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all active voice participants across all voice channels of a server for sidebar roster display.
    /// </summary>
    Task<IReadOnlyCollection<VoiceParticipantPayload>> GetServerParticipantsAsync(
        Guid serverId,
        IEnumerable<Guid>? knownChannelIds = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the voice channel ID the user is currently joined to, if any.
    /// </summary>
    Task<Guid?> GetUserVoiceChannelAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Registers or updates a user joining a voice channel.
    /// </summary>
    Task SetUserVoiceAsync(
        Guid channelId,
        Guid serverId,
        VoiceParticipantPayload participant,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a user from their active voice channel.
    /// </summary>
    /// <returns>Tuple containing the exited channel ID, server ID, and remaining user IDs in the room.</returns>
    Task<(Guid? ChannelId, Guid? ServerId, IReadOnlyCollection<Guid> RemainingUserIds)> RemoveUserVoiceAsync(
        Guid userId,
        Guid? expectedChannelId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates participant voice state (mute, deafen, speaking, screen sharing, camera).
    /// </summary>
    Task<VoiceParticipantPayload?> UpdateVoiceStateAsync(
        Guid channelId,
        Guid userId,
        bool isMuted,
        bool isDeafened,
        bool isSpeaking,
        bool isScreenSharing,
        bool isCameraActive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifies if two users are co-located in the same voice channel (security check for WebRTC signaling).
    /// </summary>
    Task<bool> AreUsersInSameVoiceChannelAsync(
        Guid channelId,
        Guid user1Id,
        Guid user2Id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves the server ID associated with a voice channel.
    /// </summary>
    Task<Guid?> GetChannelServerIdAsync(
        Guid channelId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Maps a voice channel to its parent server ID in the distributed cache.
    /// </summary>
    Task SetChannelServerIdAsync(
        Guid channelId,
        Guid serverId,
        CancellationToken cancellationToken = default);
}

