using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Result<AuthActionResponseDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly ILogger<ResetPasswordCommandHandler> _logger;

    public ResetPasswordCommandHandler(
        UserManager<User> userManager,
        ILogger<ResetPasswordCommandHandler> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<Result<AuthActionResponseDto>> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(emailLower);

        if (user == null)
        {
            return Error.NotFound("Auth.UserNotFound", "Tài khoản với email này không tồn tại trong hệ thống.");
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var err = result.Errors.FirstOrDefault();
            _logger.LogWarning("Reset password failed for {Email}: {Code} - {Description}", emailLower, err?.Code, err?.Description);
            return Error.Validation("Auth.ResetPasswordFailed", err?.Description ?? "Mã xác thực không hợp lệ hoặc đã hết hạn.");
        }

        // Reset access failed count on successful reset
        await _userManager.ResetAccessFailedCountAsync(user);

        return new AuthActionResponseDto(true, "Mật khẩu đã được cập nhật thành công.");
    }
}
