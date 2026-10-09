using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Common.Interfaces;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class FilesController : ApiControllerBase
{
    private readonly IFileStorageService _fileStorageService;
    private const long MaxFileSize = 100 * 1024 * 1024; // 100MB limit

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // Images
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
        // Videos (extensible for high-definition streaming & storage up to 100MB)
        ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v",
        // Audio
        ".mp3", ".wav", ".ogg", ".m4a",
        // Documents & Archives
        ".pdf", ".txt", ".md", ".json", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".tar", ".gz", ".7z"
    };

    public FilesController(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(105 * 1024 * 1024)] // 105MB to allow multipart headers
    public async Task<IActionResult> Upload([FromForm] IFormFile? file, [FromQuery] string folder = "uploads")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { code = "File.Empty", message = "No file uploaded or file is empty." });
        }

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new { code = "File.TooLarge", message = "File size exceeds 100MB limit." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { code = "File.InvalidType", message = $"File type {extension} is not supported." });
        }

        // Sanitize folder name
        var safeFolder = folder.ToLowerInvariant() switch
        {
            "avatars" => "avatars",
            "servers" => "servers",
            "videos" => "videos",
            "attachments" => "attachments",
            _ => "uploads"
        };

        using var stream = file.OpenReadStream();
        var fileUrl = await _fileStorageService.SaveFileAsync(stream, file.FileName, safeFolder, file.ContentType, HttpContext.RequestAborted);

        return Ok(new
        {
            url = fileUrl,
            fileName = file.FileName,
            fileSize = file.Length,
            contentType = file.ContentType
        });
    }
}
