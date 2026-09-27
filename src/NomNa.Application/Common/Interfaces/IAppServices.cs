namespace NomNa.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
}

public interface IJwtService
{
    (string Token, DateTime ExpiresAt) GenerateAccessToken(Guid userId, string email, string username);
    string GenerateRefreshToken();
    string HashToken(string token);
}
