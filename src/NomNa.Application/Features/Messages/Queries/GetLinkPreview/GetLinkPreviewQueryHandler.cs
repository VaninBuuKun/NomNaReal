using System.Net;
using System.Text.RegularExpressions;
using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetLinkPreview;

public class GetLinkPreviewQueryHandler : IRequestHandler<GetLinkPreviewQuery, Result<LinkPreviewDto>>
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<GetLinkPreviewQueryHandler> _logger;
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromMilliseconds(100);

    public GetLinkPreviewQueryHandler(
        IHttpClientFactory httpClientFactory,
        IMemoryCache memoryCache,
        ILogger<GetLinkPreviewQueryHandler> logger)
    {
        _httpClientFactory = httpClientFactory;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task<Result<LinkPreviewDto>> Handle(GetLinkPreviewQuery request, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return Result<LinkPreviewDto>.Failure(Error.Validation("LinkPreview.InvalidUrl", "URL không hợp lệ."));
        }

        // SEC-03: Pre-flight SSRF check with full DNS resolution
        if (await IsPrivateOrForbiddenHostAsync(uri.DnsSafeHost, cancellationToken))
        {
            return Result<LinkPreviewDto>.Failure(Error.Forbidden("LinkPreview.ForbiddenHost", "Không được phép xem trước URL nội bộ hoặc mạng riêng tư."));
        }

        var cacheKey = $"link_preview_{request.Url.Trim().ToLowerInvariant()}";
        if (_memoryCache.TryGetValue(cacheKey, out LinkPreviewDto? cachedDto) && cachedDto != null)
        {
            return Result<LinkPreviewDto>.Success(cachedDto);
        }

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(3.5));

            var client = _httpClientFactory.CreateClient("LinkPreviewClient");

            var currentUri = uri;
            HttpResponseMessage? response = null;
            var redirectHops = 0;
            const int maxRedirectHops = 3;

            while (redirectHops <= maxRedirectHops)
            {
                // Validate destination host on every redirect hop to avoid SSRF redirect bypass
                if (await IsPrivateOrForbiddenHostAsync(currentUri.DnsSafeHost, cts.Token))
                {
                    response?.Dispose();
                    return Result<LinkPreviewDto>.Failure(Error.Forbidden("LinkPreview.ForbiddenHost", "Không được phép xem trước URL chuyển hướng đến mạng nội bộ."));
                }

                var requestMessage = new HttpRequestMessage(HttpMethod.Get, currentUri);
                requestMessage.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NomNaBot/1.0");
                requestMessage.Headers.Accept.ParseAdd("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

                response = await client.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, cts.Token);

                if ((int)response.StatusCode >= 300 && (int)response.StatusCode <= 399 && response.Headers.Location != null)
                {
                    redirectHops++;
                    var nextUri = new Uri(currentUri, response.Headers.Location);
                    response.Dispose();
                    response = null;
                    currentUri = nextUri;
                    continue;
                }

                break;
            }

            if (response == null || !response.IsSuccessStatusCode)
            {
                response?.Dispose();
                var fallback = BuildFallbackDto(uri);
                _memoryCache.Set(cacheKey, fallback, TimeSpan.FromMinutes(10));
                return Result<LinkPreviewDto>.Success(fallback);
            }

            using (response)
            {
                var contentType = response.Content.Headers.ContentType?.MediaType?.ToLowerInvariant() ?? "";
                if (contentType.StartsWith("image/"))
                {
                    var imageDto = new LinkPreviewDto
                    {
                        Url = request.Url,
                        Title = uri.Segments.LastOrDefault()?.Trim('/') ?? uri.Host,
                        SiteName = uri.Host,
                        ImageUrl = request.Url,
                        FaviconUrl = $"{uri.Scheme}://{uri.Host}/favicon.ico"
                    };
                    _memoryCache.Set(cacheKey, imageDto, TimeSpan.FromHours(2));
                    return Result<LinkPreviewDto>.Success(imageDto);
                }

                // Read up to 128KB of the response stream (only head section is needed)
                using var stream = await response.Content.ReadAsStreamAsync(cts.Token);
                using var reader = new StreamReader(stream);
                var buffer = new char[131072];
                var bytesRead = await reader.ReadBlockAsync(buffer, 0, buffer.Length);
                var html = new string(buffer, 0, bytesRead);

                var dto = ParseHtmlMetadata(html, uri, request.Url);
                _memoryCache.Set(cacheKey, dto, TimeSpan.FromHours(1));
                return Result<LinkPreviewDto>.Success(dto);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve link preview for {Url}", request.Url);
            var fallback = BuildFallbackDto(uri);
            _memoryCache.Set(cacheKey, fallback, TimeSpan.FromMinutes(5));
            return Result<LinkPreviewDto>.Success(fallback);
        }
    }

    private static async Task<bool> IsPrivateOrForbiddenHostAsync(string host, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(host))
            return true;

        if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        try
        {
            IPAddress[] addresses;
            if (IPAddress.TryParse(host, out var parsedIp))
            {
                addresses = new[] { parsedIp };
            }
            else
            {
                addresses = await Dns.GetHostAddressesAsync(host, cancellationToken);
            }

            if (addresses.Length == 0)
                return true;

            foreach (var rawIp in addresses)
            {
                var ip = rawIp.IsIPv4MappedToIPv6 ? rawIp.MapToIPv4() : rawIp;

                if (IPAddress.IsLoopback(ip))
                    return true;

                if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                {
                    var bytes = ip.GetAddressBytes();
                    // 0.0.0.0/8
                    if (bytes[0] == 0) return true;
                    // 10.0.0.0/8
                    if (bytes[0] == 10) return true;
                    // 100.64.0.0/10 (Carrier-grade NAT)
                    if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;
                    // 127.0.0.0/8
                    if (bytes[0] == 127) return true;
                    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure instance metadata 169.254.169.254)
                    if (bytes[0] == 169 && bytes[1] == 254) return true;
                    // 172.16.0.0/12
                    if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                    // 192.168.0.0/16
                    if (bytes[0] == 192 && bytes[1] == 168) return true;
                    // 198.18.0.0/15
                    if (bytes[0] == 198 && (bytes[1] == 18 || bytes[1] == 19)) return true;
                    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
                    if (bytes[0] >= 224) return true;
                }
                else if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
                {
                    if (ip.IsIPv6LinkLocal || ip.IsIPv6Multicast || ip.IsIPv6SiteLocal)
                        return true;

                    var bytes = ip.GetAddressBytes();
                    // fc00::/7 (Unique Local Address)
                    if ((bytes[0] & 0xFE) == 0xFC) return true;
                    // ::/128 or ::1/128
                    if (ip.Equals(IPAddress.IPv6Loopback) || ip.Equals(IPAddress.IPv6None) || ip.Equals(IPAddress.IPv6Any)) return true;
                }
            }
        }
        catch
        {
            // If DNS resolution fails, reject defensively
            return true;
        }

        return false;
    }

    private static LinkPreviewDto BuildFallbackDto(Uri uri)
    {
        return new LinkPreviewDto
        {
            Url = uri.ToString(),
            Title = uri.Host,
            SiteName = uri.Host,
            FaviconUrl = $"{uri.Scheme}://{uri.Host}/favicon.ico"
        };
    }

    private static LinkPreviewDto ParseHtmlMetadata(string html, Uri baseUri, string originalUrl)
    {
        string? title = ExtractMeta(html, "property", "og:title")
            ?? ExtractMeta(html, "name", "twitter:title")
            ?? ExtractTagContent(html, "title");

        string? description = ExtractMeta(html, "property", "og:description")
            ?? ExtractMeta(html, "name", "twitter:description")
            ?? ExtractMeta(html, "name", "description");

        string? siteName = ExtractMeta(html, "property", "og:site_name")
            ?? baseUri.Host;

        string? imageUrl = ExtractMeta(html, "property", "og:image")
            ?? ExtractMeta(html, "name", "twitter:image")
            ?? ExtractMeta(html, "property", "og:image:url");

        string? faviconUrl = ExtractLink(html, "icon")
            ?? ExtractLink(html, "shortcut icon")
            ?? $"{baseUri.Scheme}://{baseUri.Host}/favicon.ico";

        // Resolve relative URLs
        if (!string.IsNullOrEmpty(imageUrl) && Uri.TryCreate(baseUri, imageUrl, out var absImage))
        {
            imageUrl = absImage.ToString();
        }

        if (!string.IsNullOrEmpty(faviconUrl) && Uri.TryCreate(baseUri, faviconUrl, out var absFavicon))
        {
            faviconUrl = absFavicon.ToString();
        }

        return new LinkPreviewDto
        {
            Url = originalUrl,
            Title = !string.IsNullOrWhiteSpace(title) ? WebUtility.HtmlDecode(title.Trim()) : baseUri.Host,
            Description = !string.IsNullOrWhiteSpace(description) ? WebUtility.HtmlDecode(description.Trim()) : null,
            SiteName = !string.IsNullOrWhiteSpace(siteName) ? WebUtility.HtmlDecode(siteName.Trim()) : baseUri.Host,
            ImageUrl = imageUrl,
            FaviconUrl = faviconUrl
        };
    }

    private static string? ExtractMeta(string html, string attrName, string attrValue)
    {
        // Matches <meta (property|name)="attrValue" content="val"> or <meta content="val" (property|name)="attrValue">
        var pattern = $@"(?i)<meta\s+[^>]*?{attrName}\s*=\s*[""']{Regex.Escape(attrValue)}[""'][^>]*?content\s*=\s*[""']([^""']*)[""']";
        var match = Regex.Match(html, pattern, RegexOptions.None, RegexTimeout);
        if (match.Success) return match.Groups[1].Value;

        var patternReverse = $@"(?i)<meta\s+[^>]*?content\s*=\s*[""']([^""']*)[""'][^>]*?{attrName}\s*=\s*[""']{Regex.Escape(attrValue)}[""']";
        var matchReverse = Regex.Match(html, patternReverse, RegexOptions.None, RegexTimeout);
        if (matchReverse.Success) return matchReverse.Groups[1].Value;

        return null;
    }

    private static string? ExtractTagContent(string html, string tagName)
    {
        var pattern = $@"(?i)<{tagName}[^>]*>([\s\S]*?)<\/{tagName}>";
        var match = Regex.Match(html, pattern, RegexOptions.None, RegexTimeout);
        return match.Success ? match.Groups[1].Value : null;
    }

    private static string? ExtractLink(string html, string relValue)
    {
        var pattern = $@"(?i)<link\s+[^>]*?rel\s*=\s*[""'][^""']*{Regex.Escape(relValue)}[^""']*[""'][^>]*?href\s*=\s*[""']([^""']*)[""']";
        var match = Regex.Match(html, pattern, RegexOptions.None, RegexTimeout);
        if (match.Success) return match.Groups[1].Value;

        var patternReverse = $@"(?i)<link\s+[^>]*?href\s*=\s*[""']([^""']*)[""'][^>]*?rel\s*=\s*[""'][^""']*{Regex.Escape(relValue)}[^""']*[""']";
        var matchReverse = Regex.Match(html, patternReverse, RegexOptions.None, RegexTimeout);
        if (matchReverse.Success) return matchReverse.Groups[1].Value;

        return null;
    }
}
