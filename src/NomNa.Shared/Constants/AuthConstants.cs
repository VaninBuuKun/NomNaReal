namespace NomNa.Shared.Constants;

/// <summary>
/// Centralized authentication and token lifecycle constants.
/// </summary>
public static class AuthConstants
{
    /// <summary>
    /// Fallback HMAC-SHA256 secret key for development environments.
    /// In production, Jwt:Secret MUST be set via environment variable.
    /// </summary>
    public const string DefaultDevSecret = "NomNaSuperSecretKeyForDevelopmentAndDemoPurposes2026!MustBeLongEnough";

    /// <summary>
    /// Default access token lifetime (30 minutes) to minimize stolen token blast radius.
    /// </summary>
    public const int DefaultAccessTokenExpirationMinutes = 30;

    /// <summary>
    /// Refresh token validity duration (7 days).
    /// </summary>
    public const int RefreshTokenExpirationDays = 7;
}

