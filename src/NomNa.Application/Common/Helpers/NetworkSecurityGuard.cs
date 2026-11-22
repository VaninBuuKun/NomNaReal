using System.Net;
using System.Net.Sockets;

namespace NomNa.Application.Common.Helpers;

/// <summary>
/// Defense-in-depth network validator providing socket-level and application-level protection
/// against Server-Side Request Forgery (SSRF), DNS Rebinding, and internal network probe attacks.
/// </summary>
public static class NetworkSecurityGuard
{
    /// <summary>
    /// Determines whether the specified IP address belongs to loopback, private RFC 1918,
    /// link-local (cloud metadata 169.254.169.254), carrier-grade NAT, or multicast/reserved ranges.
    /// </summary>
    public static bool IsPrivateOrForbiddenIp(IPAddress ip)
    {
        // Unmap IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
        var normalizedIp = ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip;

        if (IPAddress.IsLoopback(normalizedIp))
            return true;

        if (normalizedIp.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = normalizedIp.GetAddressBytes();

            // 0.0.0.0/8 (Current network / default route)
            if (bytes[0] == 0) return true;

            // 10.0.0.0/8 (Private network RFC 1918)
            if (bytes[0] == 10) return true;

            // 100.64.0.0/10 (Carrier-grade NAT RFC 6598: 100.64.0.0 - 100.127.255.255)
            if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;

            // 127.0.0.0/8 (Loopback RFC 1122)
            if (bytes[0] == 127) return true;

            // 169.254.0.0/16 (Link-local RFC 3927 & Cloud instance metadata 169.254.169.254)
            if (bytes[0] == 169 && bytes[1] == 254) return true;

            // 172.16.0.0/12 (Private network RFC 1918: 172.16.0.0 - 172.31.255.255)
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;

            // 192.168.0.0/16 (Private network RFC 1918)
            if (bytes[0] == 192 && bytes[1] == 168) return true;

            // 198.18.0.0/15 (Benchmarking network RFC 2544: 198.18.0.0 - 198.19.255.255)
            if (bytes[0] == 198 && (bytes[1] == 18 || bytes[1] == 19)) return true;

            // 224.0.0.0/4 (Multicast RFC 5771) and 240.0.0.0/4 (Reserved RFC 1112)
            if (bytes[0] >= 224) return true;
        }
        else if (normalizedIp.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (normalizedIp.IsIPv6LinkLocal || normalizedIp.IsIPv6Multicast || normalizedIp.IsIPv6SiteLocal)
                return true;

            var bytes = normalizedIp.GetAddressBytes();

            // fc00::/7 (Unique Local Address RFC 4193)
            if ((bytes[0] & 0xFE) == 0xFC) return true;

            // ::/128 (Unspecified) or ::1/128 (Loopback)
            if (normalizedIp.Equals(IPAddress.IPv6Loopback) ||
                normalizedIp.Equals(IPAddress.IPv6None) ||
                normalizedIp.Equals(IPAddress.IPv6Any))
            {
                return true;
            }

            // 2001:db8::/32 (Documentation prefix RFC 3849)
            if (bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0D && bytes[3] == 0xB8)
                return true;
        }

        return false;
    }

    /// <summary>
    /// Resolves DNS for the given host and checks if ANY resolved address is forbidden.
    /// Defensively rejects resolution failures or hosts resolving to internal addresses.
    /// </summary>
    public static async Task<bool> IsPrivateOrForbiddenHostAsync(string host, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(host))
            return true;

        var trimmedHost = host.Trim().TrimEnd('.');

        // Fast-path for localhost
        if (string.Equals(trimmedHost, "localhost", StringComparison.OrdinalIgnoreCase))
            return true;

        try
        {
            IPAddress[] addresses;
            if (IPAddress.TryParse(trimmedHost, out var parsedIp))
            {
                addresses = [parsedIp];
            }
            else
            {
                addresses = await Dns.GetHostAddressesAsync(trimmedHost, cancellationToken);
            }

            if (addresses.Length == 0)
                return true;

            foreach (var ip in addresses)
            {
                if (IsPrivateOrForbiddenIp(ip))
                    return true;
            }
        }
        catch
        {
            // If DNS resolution fails, reject defensively
            return true;
        }

        return false;
    }
}
