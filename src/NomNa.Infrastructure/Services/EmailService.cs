using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendInviteEmailAsync(
        string toEmail,
        string workspaceName,
        string inviteCode,
        string inviterName,
        string? joinUrl = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveJoinUrl = joinUrl ?? $"http://localhost:5173/join/{inviteCode}";

        var smtpHost = _configuration["Email:SmtpHost"];
        var smtpPortStr = _configuration["Email:SmtpPort"];
        var smtpUser = _configuration["Email:SmtpUser"];
        var smtpPass = _configuration["Email:SmtpPass"];
        var senderEmail = _configuration["Email:SenderEmail"] ?? "no-reply@nomna.app";
        var senderName = _configuration["Email:SenderName"] ?? "NomNa Chat";

        var subject = $"[NomNa] {inviterName} đã mời bạn tham gia không gian \"{workspaceName}\"";

        var bodyHtml = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e4e4e7; }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .logo {{ font-size: 24px; font-weight: 800; color: #f97316; letter-spacing: -0.5px; }}
    .title {{ font-size: 18px; font-weight: 700; margin-top: 12px; color: #09090b; }}
    .content {{ font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 20px 0; }}
    .code-box {{ background: #fafaf9; border: 1px dashed #d6d3d1; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }}
    .code-label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 6px; display: block; }}
    .code {{ font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 4px; color: #f97316; }}
    .btn {{ display: block; text-align: center; background: #f97316; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 24px 0; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }}
    .footer {{ font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 28px; border-top: 1px solid #f4f4f5; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""header"">
      <div class=""logo"">NomNa</div>
      <div class=""title"">Lời mời tham gia không gian làm việc</div>
    </div>
    <div class=""content"">
      Xin chào,<br><br>
      <strong>{inviterName}</strong> vừa gửi lời mời bạn cùng tham gia trò chuyện và làm việc tại không gian <strong>""{workspaceName}""</strong> trên NomNa.
    </div>
    <div class=""code-box"">
      <span class=""code-label"">Mã tham gia trực tiếp</span>
      <span class=""code"" select-all>{inviteCode}</span>
    </div>
    <a href=""{effectiveJoinUrl}"" class=""btn"" target=""_blank"">Tham gia không gian ngay</a>
    <div class=""footer"">
      Nếu bạn không biết người gửi hoặc không yêu cầu lời mời này, bạn có thể yên tâm bỏ qua email.<br>
      NomNa — Nền tảng giao tiếp theo thời gian thực.
    </div>
  </div>
</body>
</html>";

        // If SMTP server is configured, attempt real email delivery
        if (!string.IsNullOrWhiteSpace(smtpHost) && !string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
        {
            try
            {
                var port = int.TryParse(smtpPortStr, out var p) ? p : 587;
                using var client = new SmtpClient(smtpHost, port)
                {
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl = true
                };

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = subject,
                    Body = bodyHtml,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage, cancellationToken);
                _logger.LogInformation("Successfully sent workspace invite email via SMTP to {Email}", toEmail);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send email via SMTP to {Email}. Falling back to logger preview.", toEmail);
            }
        }

        // Fallback or dev simulation: Log the invitation details cleanly
        _logger.LogInformation(
            "[DEV EMAIL INVITE] Sent to: {ToEmail} | Workspace: {Workspace} | Code: {Code} | Link: {Url}",
            toEmail, workspaceName, inviteCode, effectiveJoinUrl);
    }
}
