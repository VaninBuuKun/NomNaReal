using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAt) GenerateAccessToken(Guid userId, string email, string username)
    {
        var secret = _configuration["Jwt:Secret"] ?? "SuperSecretKeyForNomNaHighPerformanceApp2026!";
        var issuer = _configuration["Jwt:Issuer"] ?? "NomNa";
        var audience = _configuration["Jwt:Audience"] ?? "NomNaClient";
        var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationMinutes"], out var mins) ? mins : 1440; // 24 hours default

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.CreateVersion7().ToString())
        };

        var tokenDescriptor = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        var tokenHandler = new JwtSecurityTokenHandler();
        return (tokenHandler.WriteToken(tokenDescriptor), expiresAt);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
