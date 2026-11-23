namespace NomNa.Application.Common.Models;

/// <summary>
/// Result returned when terminating an active or pending WebRTC 1v1 call session.
/// Contains bilateral metadata required to persist audit/call logs and calculate exact duration.
/// </summary>
public record CallTerminationResult(
    bool WasActive,
    Guid CallerId,
    Guid CalleeId,
    bool WasConnected,
    bool IsVideo,
    long DurationSeconds);

