using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.VerifyEmail;

public class VerifyEmailCommandHandler : IRequestHandler<VerifyEmailCommand, Result<AuthActionResponseDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<VerifyEmailCommandHandler> _logger;

    public VerifyEmailCommandHandler(
        UserManager<User> userManager,
        ICurrentUserService currentUserService,
        ILogger<VerifyEmailCommandHandler> logger)
    {
        _userManager = userManager;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<Result<AuthActionResponseDto>> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        User? user = null;

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var emailLower = request.Email.Trim().ToLowerInvariant();
            user = await _userManager.FindByEmailAsync(emailLower);
        }
        else if (_currentUserService.UserId != Guid.Empty)
        {
            user = await _userManager.FindByIdAsync(_currentUserService.UserId.ToString());
        }

        if (user == null)
        {
            return Error.NotFound("Auth.UserNotFound", "Không tìm thấy thông tin tài khoản cần xác thực.");
        }

        if (user.EmailConfirmed)
        {
            return new AuthActionResponseDto(true, "Tài khoản của bạn đã được xác thực trước đó.");
        }

        // Try verifying 6-digit OTP code or standard token
        bool isValid = await _userManager.VerifyTwoFactorTokenAsync(user, "Email", request.Code);
        if (!isValid)
        {
            var confirmResult = await _userManager.ConfirmEmailAsync(user, request.Code);
            isValid = confirmResult.Succeeded;
        }

        if (!isValid)
        {
            _logger.LogWarning("Email verification failed for {Email} with code {Code}", user.Email, request.Code);
            return Error.Validation("Auth.InvalidVerificationCode", "Mã xác thực không chính xác hoặc đã hết hạn.");
        }

        user.EmailConfirmed = true;
        await _userManager.UpdateAsync(user);

        return new AuthActionResponseDto(true, "Xác thực tài khoản thành công!");
    }
}
