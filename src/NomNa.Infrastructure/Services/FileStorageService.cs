using Microsoft.AspNetCore.Hosting;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;

    public FileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folder, string? contentType = null, CancellationToken cancellationToken = default)
    {
        string webRoot;
        if (!string.IsNullOrWhiteSpace(_environment.WebRootPath) && Directory.Exists(_environment.WebRootPath))
        {
            webRoot = _environment.WebRootPath;
        }
        else
        {
            var cur = Directory.GetCurrentDirectory();
            var apiWwwRoot = Path.Combine(cur, "src", "NomNa.WebAPI", "wwwroot");
            webRoot = Directory.Exists(apiWwwRoot) ? apiWwwRoot : Path.Combine(cur, "wwwroot");
        }

        var cleanFolder = folder.Trim().Trim('/');
        var targetDir = Path.Combine(webRoot, cleanFolder);

        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var uniqueName = $"{Guid.CreateVersion7():N}{extension}";
        var filePath = Path.Combine(targetDir, uniqueName);

        using (var destStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await fileStream.CopyToAsync(destStream, cancellationToken);
        }

        return $"/{folder.Trim('/')}/{uniqueName}";
    }

    public Task DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
            return Task.CompletedTask;

        var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var relativePath = fileUrl.TrimStart('/');
        var filePath = Path.Combine(webRoot, relativePath);

        if (File.Exists(filePath))
        {
            try
            {
                File.Delete(filePath);
            }
            catch
            {
                // Ignore file delete errors
            }
        }

        return Task.CompletedTask;
    }
}
