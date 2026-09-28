namespace NomNa.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendInviteEmailAsync(
        string toEmail,
        string workspaceName,
        string inviteCode,
        string inviterName,
        string? joinUrl = null,
        CancellationToken cancellationToken = default);
}
