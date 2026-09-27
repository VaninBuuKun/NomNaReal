using System.Security.Cryptography;

namespace NomNa.Domain.Common;

/// <summary>
/// Utility for generating cryptographically secure, collision-resistant workspace invite codes.
/// Follows industry best practices (Discord / Slack style):
/// - Cryptographically secure pseudo-random number generator (CSPRNG).
/// - Unbiased uniform sampling (no modulo bias).
/// - High entropy: 8 characters of Base62 provides ~2.18 x 10^14 combinations (47.7 bits of entropy).
/// </summary>
public static class InviteCodeGenerator
{
    // Base62: 0-9, a-z, A-Z (Standard for short URLs and invite links like Discord)
    private const string Base62Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /// <summary>
    /// Generates a secure random invite code.
    /// </summary>
    /// <param name="length">Length of the code (default is 8, max recommended is 12).</param>
    public static string Generate(int length = 8)

    {
        if (length <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(length), "Length must be greater than 0.");
        }


        return string.Create(length, Base62Chars, (span, chars) =>
        {
            for (int i = 0; i < span.Length; i++)
            {
                span[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
            }
        });
    }
}
