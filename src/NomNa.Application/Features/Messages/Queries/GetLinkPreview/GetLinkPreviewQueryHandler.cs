using System.Net;
using System.Text.RegularExpressions;
using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Helpers;
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
        if (await NetworkSecurityGuard.IsPrivateOrForbiddenHostAsync(uri.DnsSafeHost, cancellationToken))
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
                if (await NetworkSecurityGuard.IsPrivateOrForbiddenHostAsync(currentUri.DnsSafeHost, cts.Token))
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
