namespace NomNa.Application.Features.Messages.DTOs;

public class LinkPreviewDto
{
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? SiteName { get; set; }
    public string? ImageUrl { get; set; }
    public string? FaviconUrl { get; set; }
}
