namespace NomNa.Shared.Models;

/// <summary>
/// Represents a participant connected to a real-time voice channel room.
/// </summary>
public record VoiceParticipantPayload(
    Guid UserId,
    Guid ChannelId,
    string DisplayName,
    string? AvatarUrl,
    bool IsMuted,
    bool IsDeafened,
    bool IsSpeaking,
    bool IsScreenSharing,
    bool IsCameraActive);

/// <summary>
/// Broadcast payload dispatched when a participant's voice state alters (mute, deafen, speaking, screen share).
/// </summary>
public record VoiceStateChangedPayload(
    Guid ChannelId,
    Guid UserId,
    bool IsMuted,
    bool IsDeafened,
    bool IsSpeaking,
    bool IsScreenSharing,
    bool IsCameraActive);

/// <summary>
/// Dispatched when a participant departs from a voice channel room.
/// </summary>
public record VoiceUserLeftPayload(
    Guid ChannelId,
    Guid UserId);

/// <summary>
/// WebRTC signaling packet routed peer-to-peer across participants within a voice room.
/// </summary>
public record VoiceSignalPayload(
    Guid ChannelId,
    Guid SenderUserId,
    Guid TargetUserId,
    string SignalData);
