using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3? _s3Client;
    private readonly string? _bucketName;
    private readonly string? _region;
    private readonly string? _serviceUrl;
    private readonly string? _publicBaseUrl;
    private readonly FileStorageService _fallbackLocalStorage;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<S3FileStorageService> _logger;

    public S3FileStorageService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<S3FileStorageService> logger)
    {
        _logger = logger;
        _environment = environment;
        _fallbackLocalStorage = new FileStorageService(environment);

        var s3Section = configuration.GetSection("AwsS3");
        _bucketName = s3Section["BucketName"] ?? Environment.GetEnvironmentVariable("AWS_S3_BUCKET_NAME");
        _region = s3Section["Region"] ?? Environment.GetEnvironmentVariable("AWS_REGION") ?? "ap-southeast-1";
        var accessKey = s3Section["AccessKey"] ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");
        var secretKey = s3Section["SecretKey"] ?? Environment.GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY");
        _serviceUrl = s3Section["ServiceUrl"] ?? Environment.GetEnvironmentVariable("AWS_S3_SERVICE_URL");
        _publicBaseUrl = s3Section["PublicBaseUrl"] ?? Environment.GetEnvironmentVariable("AWS_S3_PUBLIC_BASE_URL");
        var forcePathStyle = s3Section.GetValue<bool>("ForcePathStyle", !string.IsNullOrEmpty(_serviceUrl));

        if (!string.IsNullOrWhiteSpace(_bucketName))
        {
            try
            {
                var s3Config = new AmazonS3Config();
                if (!string.IsNullOrEmpty(_serviceUrl))
                {
                    s3Config.ServiceURL = _serviceUrl;
                    s3Config.ForcePathStyle = forcePathStyle;
                }
                else
                {
                    s3Config.RegionEndpoint = RegionEndpoint.GetBySystemName(_region);
                }

                if (!string.IsNullOrWhiteSpace(accessKey) && !string.IsNullOrWhiteSpace(secretKey))
                {
                    var credentials = new BasicAWSCredentials(accessKey, secretKey);
                    _s3Client = new AmazonS3Client(credentials, s3Config);
                }
                else
                {
                    // Use default credential provider chain (IAM role, ~/.aws/credentials, env vars)
                    _s3Client = new AmazonS3Client(s3Config);
                }

                _logger.LogInformation("AWS S3 File Storage initialized successfully for bucket '{Bucket}' in region '{Region}'.", _bucketName, _region);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize AWS S3 Client. Falling back to local file storage.");
                _s3Client = null;
            }
        }
        else
        {
            _logger.LogInformation("AWS S3 BucketName is not configured. Using local file storage fallback.");
            _s3Client = null;
        }
    }

    public async Task<string> SaveFileAsync(
        Stream fileStream,
        string fileName,
        string folder,
        string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        // If S3 client or bucket is not active
        if (_s3Client == null || string.IsNullOrWhiteSpace(_bucketName))
        {
            if (_environment.IsDevelopment())
            {
                return await _fallbackLocalStorage.SaveFileAsync(fileStream, fileName, folder, contentType, cancellationToken);
            }

            throw new InvalidOperationException("AWS S3 / Cloud storage is not configured. Local fallback is disabled in Production to prevent data loss when server is destroyed.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.CreateVersion7():N}{extension}";
        var cleanFolder = folder.Trim().Trim('/');
        var s3Key = string.IsNullOrEmpty(cleanFolder) ? uniqueFileName : $"{cleanFolder}/{uniqueFileName}";

        var resolvedContentType = contentType ?? GetContentType(extension);

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            InputStream = fileStream,
            ContentType = resolvedContentType,
            AutoCloseStream = false
        };

        try
        {
            await _s3Client.PutObjectAsync(putRequest, cancellationToken);

            // Construct public access URL
            if (!string.IsNullOrWhiteSpace(_publicBaseUrl))
            {
                return $"{_publicBaseUrl.TrimEnd('/')}/{s3Key}";
            }

            if (!string.IsNullOrWhiteSpace(_serviceUrl))
            {
                return $"{_serviceUrl.TrimEnd('/')}/{_bucketName}/{s3Key}";
            }

            return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{s3Key}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file '{FileName}' to AWS S3.", fileName);

            // In Development: fallback to local storage
            if (_environment.IsDevelopment())
            {
                _logger.LogWarning("Falling back to local file storage (Development environment).");
                if (fileStream.CanSeek)
                {
                    fileStream.Position = 0;
                }
                return await _fallbackLocalStorage.SaveFileAsync(fileStream, fileName, folder, contentType, cancellationToken);
            }

            // In Production: fail fast to prevent ephemeral data loss on server destruction
            throw;
        }
    }

    public async Task DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
            return;

        if (_s3Client == null || string.IsNullOrWhiteSpace(_bucketName))
        {
            await _fallbackLocalStorage.DeleteFileAsync(fileUrl, cancellationToken);
            return;
        }

        try
        {
            // Extract key from URL
            var key = ExtractKeyFromUrl(fileUrl, _bucketName);
            if (!string.IsNullOrEmpty(key))
            {
                await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = key
                }, cancellationToken);
            }
            else
            {
                // Fallback delete if local path
                await _fallbackLocalStorage.DeleteFileAsync(fileUrl, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file from S3: '{FileUrl}'", fileUrl);
        }
    }

    private static string? ExtractKeyFromUrl(string url, string bucketName)
    {
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            var path = uri.AbsolutePath.TrimStart('/');
            if (path.StartsWith(bucketName + "/", StringComparison.OrdinalIgnoreCase))
            {
                return path.Substring(bucketName.Length + 1);
            }
            return path;
        }
        return null;
    }

    private static string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            // Images
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",

            // Videos (extensible for high-definition streaming & storage)
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            ".mkv" => "video/x-matroska",
            ".avi" => "video/x-msvideo",
            ".m4v" => "video/x-m4v",

            // Audio
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".ogg" => "audio/ogg",
            ".m4a" => "audio/mp4",

            // Documents & files
            ".pdf" => "application/pdf",
            ".txt" => "text/plain",
            ".json" => "application/json",
            ".zip" => "application/zip",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            _ => "application/octet-stream"
        };
    }
}
