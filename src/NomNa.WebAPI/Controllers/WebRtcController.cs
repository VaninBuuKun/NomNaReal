using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Common.Interfaces;

namespace NomNa.WebAPI.Controllers;

/// <summary>
/// Controller providing WebRTC ICE server configurations, STUN endpoints,
/// and RFC 5766 time-limited ephemeral TURN credentials generated using HMAC-SHA1.
/// Prevents bandwidth theft by rejecting static publicly-exposed TURN credentials.
/// </summary>
[Authorize]
public class WebRtcController : ApiControllerBase
{
    private readonly IConfiguration _config;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<WebRtcController> _logger;

    public WebRtcController(
        IConfiguration config,
        ICurrentUserService currentUser,
        ILogger<WebRtcController> logger)
    {
        _config = config;
        _currentUser = currentUser;
        _logger = logger;
    }

    /// <summary>
    /// Returns dynamic STUN and Ephemeral TURN ICE servers for the authenticated user.
    /// Credentials expire in 12 hours according to the TURN shared-secret specification.
    /// </summary>
    [HttpGet("ice-servers")]
    public IActionResult GetIceServers()
    {
        var iceServers = new List<object>
        {
            new
            {
                urls = new[]
                {
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302"
                }
            }
        };

        var turnUrl = _config["Turn:Url"];
        var turnSecret = _config["Turn:SharedSecret"];
        var userId = _currentUser.UserId ?? Guid.Empty;

        if (!string.IsNullOrWhiteSpace(turnUrl) && !string.IsNullOrWhiteSpace(turnSecret) && userId != Guid.Empty)
        {
            try
            {
                // RFC 5766 Ephemeral TURN credential valid for 12 hours
                var expiresAtUnix = DateTimeOffset.UtcNow.AddHours(12).ToUnixTimeSeconds();
                var username = $"{expiresAtUnix}:{userId}";

                using var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(turnSecret));
                var credentialBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(username));
                var credential = Convert.ToBase64String(credentialBytes);

                var urls = turnUrl.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                iceServers.Add(new
                {
                    urls,
                    username,
                    credential
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate ephemeral TURN credential for user {UserId}", userId);
            }
        }

        return Ok(new { iceServers });
    }
}

