using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Common.Helpers;
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
        // Images (SVG is explicitly omitted to prevent stored XSS via embedded script tags)
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
        // Videos (extensible for high-definition streaming & storage up to 100MB)
        ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v",
        // Audio
        ".mp3", ".wav", ".ogg", ".m4a", ".opus",
        // Documents & Archives
        ".pdf", ".txt", ".md", ".json", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".tar", ".gz", ".7z"
    };

    public FilesController(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    public record PresignedUploadRequest(string FileName, string ContentType, long FileSize, string? Folder = "uploads");

    [HttpPost("presigned-upload")]
    public async Task<IActionResult> CreatePresignedUpload([FromBody] PresignedUploadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName) || request.FileSize <= 0)
        {
            return BadRequest(new { code = "File.Empty", message = "File metadata is invalid or file is empty." });
        }

        if (request.FileSize > MaxFileSize)
        {
            return BadRequest(new { code = "File.TooLarge", message = "File size exceeds 100MB limit." });
        }

        var sanitizedFileName = Path.GetFileName(request.FileName);
        var extension = Path.GetExtension(sanitizedFileName);
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { code = "File.InvalidType", message = $"File type {extension} is not supported." });
        }

        var safeFolder = (request.Folder ?? "uploads").ToLowerInvariant() switch
        {
            "avatars" => "avatars",
            "servers" or "workspaces" => "servers",
            "videos" => "videos",
            "attachments" => "attachments",
            _ => "uploads"
        };

        var result = await _fileStorageService.GeneratePresignedUploadUrlAsync(
            sanitizedFileName,
            safeFolder,
            string.IsNullOrWhiteSpace(request.ContentType) ? "application/octet-stream" : request.ContentType,
            request.FileSize,
            HttpContext.RequestAborted);

        if (result == null)
        {
            return Ok(new { supported = false });
        }

        return Ok(new
        {
            supported = true,
            uploadUrl = result.UploadUrl,
            publicUrl = result.PublicUrl,
            objectKey = result.ObjectKey,
            expiresAt = result.ExpiresAt
        });
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

        // Sanitize file name to avoid directory traversal attacks
        var sanitizedFileName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(sanitizedFileName);
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { code = "File.InvalidType", message = $"File type {extension} is not supported." });
        }

        // SEC-02: Binary signature verification to detect extension spoofing and malicious executables
        using var stream = file.OpenReadStream();
        if (!FileSignatureValidator.IsValidSignature(stream, extension))
        {
            return BadRequest(new { code = "File.SignatureMismatch", message = "File content signature does not match the claimed file extension." });
        }

        // Sanitize folder name
        var safeFolder = folder.ToLowerInvariant() switch
        {
            "avatars" => "avatars",
            "servers" or "workspaces" => "servers",
            "videos" => "videos",
            "attachments" => "attachments",
            _ => "uploads"
        };

        var fileUrl = await _fileStorageService.SaveFileAsync(stream, sanitizedFileName, safeFolder, file.ContentType, HttpContext.RequestAborted);

        return Ok(new
        {
            url = fileUrl,
            fileName = sanitizedFileName,
            fileSize = file.Length,
            contentType = file.ContentType
        });
    }
}
