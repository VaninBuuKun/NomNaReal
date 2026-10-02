using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.Auth.Commands.ForgotPassword;
using NomNa.Application.Features.Auth.Commands.GoogleLogin;
using NomNa.Application.Features.Auth.Commands.Login;
using NomNa.Application.Features.Auth.Commands.RefreshToken;
using NomNa.Application.Features.Auth.Commands.Register;
using NomNa.Application.Features.Auth.Commands.ResendVerification;
using NomNa.Application.Features.Auth.Commands.ResetPassword;
using NomNa.Application.Features.Auth.Commands.UpdateProfile;
using NomNa.Application.Features.Auth.Commands.VerifyEmail;
using NomNa.Application.Features.Auth.Queries.GetCurrentUser;

namespace NomNa.WebAPI.Controllers;

public class AuthController : ApiControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterCommand command)
    {
        var result = await Mediator.Send(command);
        if (!result.IsSuccess)
        {
            return HandleResult(result);
        }

        AppendAccessTokenCookie(result.Value!.AccessToken, result.Value.ExpiresAt);
        AppendRefreshTokenCookie(result.Value.RefreshToken);

        // Do not expose tokens in JSON body since they are stored in HttpOnly cookies
        return Ok(result.Value.User);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginCommand command)
    {
        var result = await Mediator.Send(command);
        if (!result.IsSuccess)
        {
            return HandleResult(result);
        }

        AppendAccessTokenCookie(result.Value!.AccessToken, result.Value.ExpiresAt);
        AppendRefreshTokenCookie(result.Value.RefreshToken);

        // Do not expose tokens in JSON body since they are stored in HttpOnly cookies
        return Ok(result.Value.User);
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginCommand command)
    {
        var result = await Mediator.Send(command);
        if (!result.IsSuccess)
        {
            return HandleResult(result);
        }

        AppendAccessTokenCookie(result.Value!.AccessToken, result.Value.ExpiresAt);
        AppendRefreshTokenCookie(result.Value.RefreshToken);

        return Ok(result.Value.User);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenCommand? command)
    {
        var tokenFromCookie = Request.Cookies["refresh_token"];
        var refreshToken = !string.IsNullOrEmpty(command?.RefreshToken) ? command.RefreshToken : tokenFromCookie;

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new { message = "Refresh token is missing from cookie." });
        }

        var effectiveCommand = new RefreshTokenCommand(
            command?.UserId ?? Guid.Empty,
            refreshToken
        );

        var result = await Mediator.Send(effectiveCommand);
        if (!result.IsSuccess)
        {
            ClearAuthCookies();
            return HandleResult(result);
        }

        AppendAccessTokenCookie(result.Value!.AccessToken, result.Value.ExpiresAt);
        AppendRefreshTokenCookie(result.Value.RefreshToken);

        return Ok(result.Value.User);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        ClearAuthCookies();
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordCommand command)
    {
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordCommand command)
    {
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailCommand command)
    {
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationCommand command)
    {
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var result = await Mediator.Send(new GetCurrentUserQuery());
        return HandleResult(result);
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileCommand command)
    {
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    private void AppendAccessTokenCookie(string accessToken, DateTime expiresAt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt,
            Secure = Request.IsHttps,
            Path = "/"
        };
        Response.Cookies.Append("access_token", accessToken, cookieOptions);
    }

    private void AppendRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Secure = Request.IsHttps,
            Path = "/api/auth" // Transmitted only when requesting auth endpoints like /refresh or /logout
        };
        Response.Cookies.Append("refresh_token", refreshToken, cookieOptions);
    }

    private void ClearAuthCookies()
    {
        Response.Cookies.Delete("access_token", new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Path = "/"
        });

        Response.Cookies.Delete("refresh_token", new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Path = "/api/auth"
        });
    }
}
