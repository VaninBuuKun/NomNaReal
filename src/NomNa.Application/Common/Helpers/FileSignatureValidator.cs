using System.Text;

namespace NomNa.Application.Common.Helpers;

/// <summary>
/// Validates binary file signatures (magic bytes) to prevent file extension spoofing,
/// MIME confusion attacks, and malicious executable uploads.
/// </summary>
public static class FileSignatureValidator
{
    private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".svg", ".htm", ".html", ".xhtml", ".js", ".mjs", ".ts",
        ".exe", ".dll", ".so", ".dylib", ".bin", ".bat", ".cmd",
        ".sh", ".bash", ".ps1", ".vbs", ".php", ".phtml", ".asp",
        ".aspx", ".jsp", ".jspx", ".cgi", ".pl", ".py"
    };

    /// <summary>
    /// Validates the stream header against expected binary signatures for the given extension.
    /// Resets stream position to original after inspection.
    /// </summary>
    public static bool IsValidSignature(Stream stream, string extension)
    {
        if (string.IsNullOrWhiteSpace(extension))
            return false;

        var ext = extension.Trim().ToLowerInvariant();
        if (BlockedExtensions.Contains(ext))
            return false;

        if (!stream.CanRead)
            return false;

        var originalPosition = stream.CanSeek ? stream.Position : 0;
        try
        {
            if (stream.CanSeek)
            {
                stream.Position = 0;
            }

            var header = new byte[512];
            var bytesRead = stream.Read(header, 0, header.Length);
            if (bytesRead < 4)
            {
                // Very short files cannot be valid media/documents
                return ext is ".txt" or ".md" or ".json" && bytesRead > 0 && !ContainsNullBytes(header, bytesRead);
            }

            // Reject known executable binary signatures immediately
            if (IsExecutableSignature(header))
                return false;

            return ext switch
            {
                // Images
                ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => header.Length >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                          header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
                ".gif" => header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38, // GIF8
                ".webp" => header.Length >= 12 &&
                           header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 && // RIFF
                           header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50, // WEBP

                // Videos & Audio
                ".mp4" or ".m4v" or ".mov" => HasFtypBox(header),
                ".webm" or ".mkv" => header[0] == 0x1A && header[1] == 0x45 && header[2] == 0xDF && header[3] == 0xA3, // EBML header
                ".avi" => header.Length >= 12 &&
                          header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 && // RIFF
                          header[8] == 0x41 && header[9] == 0x56 && header[10] == 0x49 && header[11] == 0x20, // AVI 
                ".mp3" => (header[0] == 0x49 && header[1] == 0x44 && header[2] == 0x33) || // ID3 tag
                          (header[0] == 0xFF && (header[1] == 0xFB || header[1] == 0xF3 || header[1] == 0xF2)), // MPEG sync frame
                ".wav" => header.Length >= 12 &&
                          header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 && // RIFF
                          header[8] == 0x57 && header[9] == 0x41 && header[10] == 0x42 && header[11] == 0x50, // WAVE (57 41 56 45)
                ".ogg" or ".opus" => header[0] == 0x4F && header[1] == 0x67 && header[2] == 0x67 && header[3] == 0x53, // OggS
                ".m4a" => HasFtypBox(header),

                // Documents & Archives
                ".pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46, // %PDF
                ".zip" or ".docx" or ".xlsx" or ".doc" or ".xls" =>
                    (header[0] == 0x50 && header[1] == 0x4B && (header[2] == 0x03 || header[2] == 0x05 || header[2] == 0x07)) || // PK.. (ZIP / OOXML)
                    (header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0), // OLE Compound File (Legacy DOC/XLS)
                ".7z" => header.Length >= 6 && header[0] == 0x37 && header[1] == 0x7A && header[2] == 0xBC &&
                         header[3] == 0xAF && header[4] == 0x27 && header[5] == 0x1C,
                ".gz" => header[0] == 0x1F && header[1] == 0x8B,
                ".tar" => IsTarHeader(header, bytesRead),

                // Plain Text & Structured Data
                ".txt" or ".md" or ".json" => IsSafePlainText(header, bytesRead),

                _ => false
            };
        }
        finally
        {
            if (stream.CanSeek)
            {
                stream.Position = originalPosition;
            }
        }
    }

    private static bool IsExecutableSignature(byte[] header)
    {
        // Windows PE / DOS MZ executable
        if (header.Length >= 2 && header[0] == 0x4D && header[1] == 0x5A)
            return true;

        // Linux ELF executable
        if (header.Length >= 4 && header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46)
            return true;

        // macOS Mach-O binaries
        if (header.Length >= 4)
        {
            if ((header[0] == 0xFE && header[1] == 0xED && header[2] == 0xFA && header[3] == 0xCE) ||
                (header[0] == 0xFE && header[1] == 0xED && header[2] == 0xFA && header[3] == 0xCF) ||
                (header[0] == 0xCF && header[1] == 0xFA && header[2] == 0xED && header[3] == 0xFE) ||
                (header[0] == 0xCE && header[1] == 0xFA && header[2] == 0xED && header[3] == 0xFE))
            {
                return true;
            }
        }

        // Java Class file
        if (header.Length >= 4 && header[0] == 0xCA && header[1] == 0xFE && header[2] == 0xBA && header[3] == 0xBE)
            return true;

        // Shell script shebang
        if (header.Length >= 2 && header[0] == 0x23 && header[1] == 0x21) // #!
            return true;

        return false;
    }

    private static bool HasFtypBox(byte[] header)
    {
        if (header.Length < 12)
            return false;

        // ISO Base Media File Format: [4 bytes box size] 'ftyp'
        return header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70;
    }

    private static bool IsTarHeader(byte[] header, int bytesRead)
    {
        // Standard tar header contains 'ustar' at offset 257
        if (bytesRead < 262)
            return false;

        return header[257] == 0x75 && header[258] == 0x73 && header[259] == 0x74 &&
               header[260] == 0x61 && header[261] == 0x72;
    }

    private static bool IsSafePlainText(byte[] header, int bytesRead)
    {
        if (ContainsNullBytes(header, bytesRead))
            return false;

        // Disallow HTML / script injections in plaintext formats
        var text = Encoding.UTF8.GetString(header, 0, Math.Min(bytesRead, 128)).TrimStart().ToLowerInvariant();
        if (text.StartsWith("<!doctype") || text.StartsWith("<html") || text.StartsWith("<script") ||
            text.StartsWith("<?xml") || text.StartsWith("<?php"))
        {
            return false;
        }

        return true;
    }

    private static bool ContainsNullBytes(byte[] buffer, int count)
    {
        for (var i = 0; i < count; i++)
        {
            if (buffer[i] == 0x00)
                return true;
        }
        return false;
    }
}
