using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.ResendVerification;

public class ResendVerificationCommandHandler : IRequestHandler<ResendVerificationCommand, Result<AuthActionResponseDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly ILogger<ResendVerificationCommandHandler> _logger;

    public ResendVerificationCommandHandler(
        UserManager<User> userManager,
        IEmailService emailService,
        ILogger<ResendVerificationCommandHandler> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<Result<AuthActionResponseDto>> Handle(ResendVerificationCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(emailLower);

        // Security best practice: Do not disclose if user exists
        if (user == null)
        {
            _logger.LogInformation("Resend verification requested for non-existent email: {Email}", emailLower);
            return new AuthActionResponseDto(true, "Nếu email tồn tại trong hệ thống, mã xác thực mới đã được gửi.");
        }

        if (user.EmailConfirmed)
        {
            return new AuthActionResponseDto(true, "Tài khoản của bạn đã được xác thực trước đó.");
        }

        var code = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");
        await _emailService.SendVerificationEmailAsync(
            user.Email ?? emailLower,
            user.DisplayName ?? user.UserName ?? "bạn",
            code,
            cancellationToken);

        return new AuthActionResponseDto(true, "Mã xác thực mới đã được gửi đến email của bạn.");
    }
}
