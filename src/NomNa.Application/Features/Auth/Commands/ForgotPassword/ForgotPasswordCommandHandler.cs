using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, Result<AuthActionResponseDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ForgotPasswordCommandHandler> _logger;

    public ForgotPasswordCommandHandler(
        UserManager<User> userManager,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<ForgotPasswordCommandHandler> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<Result<AuthActionResponseDto>> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(emailLower);

        // Security best practice: Do not disclose whether email exists
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for non-existent email: {Email}", emailLower);
            return new AuthActionResponseDto(true, "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến bạn.");
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var clientUrl = _configuration["ClientUrl"] ?? "http://localhost:5173";
        var resetUrl = $"{clientUrl.TrimEnd('/')}/reset-password?email={Uri.EscapeDataString(user.Email ?? emailLower)}&token={Uri.EscapeDataString(token)}";

        await _emailService.SendPasswordResetEmailAsync(
            user.Email ?? emailLower,
            user.DisplayName ?? user.UserName ?? "bạn",
            token,
            resetUrl,
            cancellationToken);

        return new AuthActionResponseDto(true, "Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.");
    }
}
