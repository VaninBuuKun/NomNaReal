using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.Auth.Commands.GoogleLogin;
using NomNa.Application.Features.Auth.Commands.Login;
using NomNa.Application.Features.Auth.Commands.RefreshToken;
using NomNa.Application.Features.Auth.Commands.Register;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Application.Features.Auth.Queries.GetCurrentUser;

namespace NomNa.WebAPI.Controllers;

public class AuthController : ApiControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterCommand command)
    {
        var result = await Mediator.Send(command);
        if (result.IsSuccess && !string.IsNullOrEmpty(result.Value?.RefreshToken))
        {
            AppendRefreshTokenCookie(result.Value.RefreshToken);
        }
        return HandleResult(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginCommand command)
    {
        var result = await Mediator.Send(command);
        if (result.IsSuccess && !string.IsNullOrEmpty(result.Value?.RefreshToken))
        {
            AppendRefreshTokenCookie(result.Value.RefreshToken);
        }
        return HandleResult(result);
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginCommand command)
    {
        var result = await Mediator.Send(command);
        if (result.IsSuccess && !string.IsNullOrEmpty(result.Value?.RefreshToken))
        {
            AppendRefreshTokenCookie(result.Value.RefreshToken);
        }
        return HandleResult(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenCommand? command)
    {
        var tokenFromCookie = Request.Cookies["refresh_token"];
        var refreshToken = !string.IsNullOrEmpty(command?.RefreshToken) ? command.RefreshToken : tokenFromCookie;

        var effectiveCommand = new RefreshTokenCommand(
            command?.UserId ?? Guid.Empty,
            refreshToken ?? string.Empty
        );

        var result = await Mediator.Send(effectiveCommand);
        if (result.IsSuccess && !string.IsNullOrEmpty(result.Value?.RefreshToken))
        {
            AppendRefreshTokenCookie(result.Value.RefreshToken);
        }
        return HandleResult(result);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        ClearRefreshTokenCookie();
        return Ok(new { message = "Logged out successfully" });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var result = await Mediator.Send(new GetCurrentUserQuery());
        return HandleResult(result);
    }

    private void AppendRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Secure = Request.IsHttps,
            Path = "/"
        };
        Response.Cookies.Append("refresh_token", refreshToken, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete("refresh_token", new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Path = "/"
        });
    }
}
