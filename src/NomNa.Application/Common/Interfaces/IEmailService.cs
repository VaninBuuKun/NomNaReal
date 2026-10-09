namespace NomNa.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendInviteEmailAsync(
        string toEmail,
        string serverName,
        string inviteCode,
        string inviterName,
        string? joinUrl = null,
        CancellationToken cancellationToken = default);

    Task SendPasswordResetEmailAsync(
        string toEmail,
        string displayName,
        string resetToken,
        string? resetUrl = null,
        CancellationToken cancellationToken = default);

    Task SendVerificationEmailAsync(
        string toEmail,
        string displayName,
        string verificationCode,
        CancellationToken cancellationToken = default);
}
