namespace NomNa.Application.Common.Interfaces;

public record GooglePayload(string Subject, string Email, string? Name, string? Picture);

public interface IGoogleAuthService
{
    Task<GooglePayload?> ValidateTokenAsync(string idToken, CancellationToken cancellationToken = default);
}
