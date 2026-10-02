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
        var subject = $"[NomNa] {inviterName} đã mời bạn tham gia workspace \"{workspaceName}\"";

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
    .code {{ font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 4px; color: #f97316; word-break: break-all; }}
    .btn {{ display: block; text-align: center; background: #f97316; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 24px 0; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }}
    .footer {{ font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 28px; border-top: 1px solid #f4f4f5; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""header"">
      <div class=""logo"">NomNa</div>
      <div class=""title"">Lời mời tham gia Workspace</div>
    </div>
    <div class=""content"">
      Xin chào,<br><br>
      <strong>{inviterName}</strong> vừa gửi lời mời bạn cùng tham gia trò chuyện và làm việc tại workspace <strong>""{workspaceName}""</strong> trên NomNa.
    </div>
    <div class=""code-box"">
      <span class=""code-label"">Mã tham gia trực tiếp</span>
      <span class=""code"" select-all>{inviteCode}</span>
    </div>
    <a href=""{effectiveJoinUrl}"" class=""btn"" target=""_blank"">Tham gia Workspace ngay</a>
    <div class=""footer"">
      Nếu bạn không biết người gửi hoặc không yêu cầu lời mời này, bạn có thể yên tâm bỏ qua email.<br>
      NomNa — Nền tảng giao tiếp theo thời gian thực.
    </div>
  </div>
</body>
</html>";

        var devSummary = $"[DEV EMAIL INVITE] Sent to: {toEmail} | Workspace: {workspaceName} | Code: {inviteCode} | Link: {effectiveJoinUrl}";
        await SendHtmlEmailAsync(toEmail, subject, bodyHtml, devSummary, cancellationToken);
    }

    public async Task SendPasswordResetEmailAsync(
        string toEmail,
        string displayName,
        string resetToken,
        string? resetUrl = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveResetUrl = resetUrl ?? $"http://localhost:5173/reset-password?email={Uri.EscapeDataString(toEmail)}&token={Uri.EscapeDataString(resetToken)}";
        var subject = "[NomNa] Hướng dẫn khôi phục mật khẩu tài khoản";

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
    .code-box {{ background: #fafaf9; border: 1px dashed #d6d3d1; border-radius: 8px; padding: 14px; text-align: center; margin: 20px 0; }}
    .code-label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 6px; display: block; }}
    .code {{ font-family: monospace; font-size: 14px; font-weight: 700; color: #f97316; word-break: break-all; }}
    .btn {{ display: block; text-align: center; background: #f97316; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 24px 0; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }}
    .footer {{ font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 28px; border-top: 1px solid #f4f4f5; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""header"">
      <div class=""logo"">NomNa</div>
      <div class=""title"">Yêu cầu khôi phục mật khẩu</div>
    </div>
    <div class=""content"">
      Xin chào <strong>{displayName}</strong>,<br><br>
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản NomNa liên kết với email <strong>{toEmail}</strong>.<br>
      Nhấp vào nút bên dưới để thiết lập mật khẩu mới:
    </div>
    <a href=""{effectiveResetUrl}"" class=""btn"" target=""_blank"">Đặt lại mật khẩu của bạn</a>
    <div class=""code-box"">
      <span class=""code-label"">Hoặc dùng mã Token khôi phục bên dưới nếu cần:</span>
      <span class=""code"">{resetToken}</span>
    </div>
    <div class=""footer"">
      Liên kết này có hiệu lực trong vòng 15 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email — tài khoản của bạn vẫn an toàn.<br>
      NomNa — Nền tảng giao tiếp theo thời gian thực.
    </div>
  </div>
</body>
</html>";

        var devSummary = $"[DEV PASSWORD RESET] Sent to: {toEmail} | Token: {resetToken} | ResetLink: {effectiveResetUrl}";
        await SendHtmlEmailAsync(toEmail, subject, bodyHtml, devSummary, cancellationToken);
    }

    public async Task SendVerificationEmailAsync(
        string toEmail,
        string displayName,
        string verificationCode,
        CancellationToken cancellationToken = default)
    {
        var subject = $"[NomNa] {verificationCode} là mã xác thực tài khoản của bạn";

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
    .code-box {{ background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0; }}
    .code-label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; color: #c2410c; margin-bottom: 8px; display: block; }}
    .code {{ font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #ea580c; }}
    .footer {{ font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 28px; border-top: 1px solid #f4f4f5; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""header"">
      <div class=""logo"">NomNa</div>
      <div class=""title"">Xác thực tài khoản NomNa</div>
    </div>
    <div class=""content"">
      Xin chào <strong>{displayName}</strong>,<br><br>
      Chào mừng bạn đến với NomNa! Dưới đây là mã xác thực 6 chữ số để kích hoạt tài khoản của bạn:
    </div>
    <div class=""code-box"">
      <span class=""code-label"">Mã xác thực một lần (OTP)</span>
      <span class=""code"">{verificationCode}</span>
    </div>
    <div class=""footer"">
      Mã xác thực có hiệu lực trong vòng 10 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.<br>
      NomNa — Nền tảng giao tiếp theo thời gian thực.
    </div>
  </div>
</body>
</html>";

        var devSummary = $"[DEV VERIFY EMAIL] Sent to: {toEmail} | Code: {verificationCode}";
        await SendHtmlEmailAsync(toEmail, subject, bodyHtml, devSummary, cancellationToken);
    }

    private async Task SendHtmlEmailAsync(
        string toEmail,
        string subject,
        string bodyHtml,
        string devLogSummary,
        CancellationToken cancellationToken)
    {
        var smtpHost = _configuration["Email:SmtpHost"];
        var smtpPortStr = _configuration["Email:SmtpPort"];
        var smtpUser = _configuration["Email:SmtpUser"];
        var smtpPass = _configuration["Email:SmtpPass"];
        var senderEmail = _configuration["Email:SenderEmail"] ?? "no-reply@nomna.app";
        var senderName = _configuration["Email:SenderName"] ?? "NomNa Chat";

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
                _logger.LogInformation("Successfully sent email via SMTP to {Email} | Subject: {Subject}", toEmail, subject);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send email via SMTP to {Email}. Falling back to logger preview.", toEmail);
            }
        }

        // Fallback or dev simulation: Log the email details cleanly
        _logger.LogInformation("{DevSummary}", devLogSummary);
    }
}
