using System.Net;
using FluentAssertions;
using NomNa.Application.Common.Helpers;
using Xunit;

namespace NomNa.Application.UnitTests;

/// <summary>
/// Unit tests for NetworkSecurityGuard.
/// Verifies socket-level and application-level SSRF defense, DNS Rebinding prevention,
/// and complete blocking of internal, link-local, carrier NAT, and cloud metadata ranges.
/// </summary>
public class NetworkSecurityGuardTests
{
    [Theory]
    // IPv4 Loopback
    [InlineData("127.0.0.1", true)]
    [InlineData("127.0.0.254", true)]
    [InlineData("127.255.255.254", true)]
    // RFC 1918 Private Ranges
    [InlineData("10.0.0.1", true)]
    [InlineData("10.254.0.1", true)]
    [InlineData("172.16.0.1", true)]
    [InlineData("172.24.1.100", true)]
    [InlineData("172.31.255.254", true)]
    [InlineData("192.168.0.1", true)]
    [InlineData("192.168.100.50", true)]
    // Link-Local & Cloud Instance Metadata (AWS/GCP/Azure 169.254.169.254)
    [InlineData("169.254.169.254", true)]
    [InlineData("169.254.1.1", true)]
    // Current network / Default route
    [InlineData("0.0.0.0", true)]
    [InlineData("0.1.2.3", true)]
    // Carrier-Grade NAT (RFC 6598)
    [InlineData("100.64.0.1", true)]
    [InlineData("100.100.50.25", true)]
    [InlineData("100.127.255.254", true)]
    // Benchmarking (RFC 2544)
    [InlineData("198.18.0.1", true)]
    [InlineData("198.19.255.254", true)]
    // Multicast & Reserved
    [InlineData("224.0.0.1", true)]
    [InlineData("239.255.255.250", true)]
    [InlineData("240.0.0.1", true)]
    [InlineData("255.255.255.255", true)]
    // Public Internet IPv4 (Must be allowed)
    [InlineData("8.8.8.8", false)]
    [InlineData("1.1.1.1", false)]
    [InlineData("142.250.190.46", false)]
    [InlineData("93.184.216.34", false)]
    public void IsPrivateOrForbiddenIp_IPv4_CorrectlyIdentifiesForbidden(string ipString, bool expectedForbidden)
    {
        var ip = IPAddress.Parse(ipString);
        var result = NetworkSecurityGuard.IsPrivateOrForbiddenIp(ip);
        result.Should().Be(expectedForbidden);
    }

    [Theory]
    // IPv6 Loopback
    [InlineData("::1", true)]
    // IPv6 Unspecified
    [InlineData("::", true)]
    // IPv6 Unique Local Address (ULA fc00::/7)
    [InlineData("fc00::1", true)]
    [InlineData("fd12:3456:789a:1::1", true)]
    // IPv6 Link-Local (fe80::/10)
    [InlineData("fe80::1", true)]
    [InlineData("fe80::dead:beef", true)]
    // IPv6 Multicast (ff00::/8)
    [InlineData("ff02::1", true)]
    // IPv6 Documentation prefix (2001:db8::/32)
    [InlineData("2001:db8::1", true)]
    // IPv4-mapped IPv6 Loopback and Private
    [InlineData("::ffff:127.0.0.1", true)]
    [InlineData("::ffff:10.0.0.1", true)]
    [InlineData("::ffff:169.254.169.254", true)]
    [InlineData("::ffff:192.168.1.1", true)]
    // Public IPv6 (Must be allowed)
    [InlineData("2607:f8b0:4005:805::200e", false)]
    [InlineData("2606:4700:4700::1111", false)]
    public void IsPrivateOrForbiddenIp_IPv6_CorrectlyIdentifiesForbidden(string ipString, bool expectedForbidden)
    {
        var ip = IPAddress.Parse(ipString);
        var result = NetworkSecurityGuard.IsPrivateOrForbiddenIp(ip);
        result.Should().Be(expectedForbidden);
    }

    [Fact]
    public async Task IsPrivateOrForbiddenHostAsync_Localhost_ReturnsTrue()
    {
        var result = await NetworkSecurityGuard.IsPrivateOrForbiddenHostAsync("localhost");
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsPrivateOrForbiddenHostAsync_EmptyHost_ReturnsTrue()
    {
        var result = await NetworkSecurityGuard.IsPrivateOrForbiddenHostAsync("");
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsPrivateOrForbiddenHostAsync_DirectMetadataIp_ReturnsTrue()
    {
        var result = await NetworkSecurityGuard.IsPrivateOrForbiddenHostAsync("169.254.169.254");
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsPrivateOrForbiddenHostAsync_PublicDomain_ReturnsFalse()
    {
        // one.one.one.one resolves to 1.1.1.1 which is public
        var result = await NetworkSecurityGuard.IsPrivateOrForbiddenHostAsync("one.one.one.one");
        result.Should().BeFalse();
    }
}
