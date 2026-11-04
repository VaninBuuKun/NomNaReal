namespace NomNa.Shared.Models;

/// <summary>
/// Payload gửi khi người gọi bắt đầu cuộc gọi (Offer)
/// </summary>
public record CallOfferPayload(
    Guid CallerId,
    string CallerName,
    string? CallerAvatar,
    Guid TargetUserId,
    string Sdp,
    bool IsVideoCall);

/// <summary>
/// Payload gửi khi người nhận chấp nhận cuộc gọi (Answer)
/// </summary>
public record CallAnswerPayload(
    Guid ResponderId,
    Guid CallerId,
    string Sdp);

/// <summary>
/// Payload trao đổi ICE candidate giữa hai bên
/// </summary>
public record IceCandidatePayload(
    Guid SenderId,
    Guid TargetUserId,
    string Candidate);

/// <summary>
/// Payload thông báo cuộc gọi bị từ chối
/// </summary>
public record CallRejectedPayload(
    Guid PeerId,
    string? Reason);

/// <summary>
/// Payload thông báo cuộc gọi đã kết thúc
/// </summary>
public record CallEndedPayload(
    Guid PeerId);
