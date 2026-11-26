namespace NomNa.Application.Common.Interfaces;

public record PresignedUploadResult(
    string UploadUrl,
    string PublicUrl,
    string ObjectKey,
    DateTime ExpiresAt);

public interface IFileStorageService
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string folder, string? contentType = null, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default);
    Task<PresignedUploadResult?> GeneratePresignedUploadUrlAsync(
        string fileName,
        string folder,
        string contentType,
        long fileSize,
        CancellationToken cancellationToken = default);
}
