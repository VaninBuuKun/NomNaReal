using System.Text;
using FluentAssertions;
using NomNa.Application.Common.Helpers;
using Xunit;

namespace NomNa.Application.UnitTests;

public class FileSignatureValidatorTests
{
    [Fact]
    public void IsValidSignature_ValidJpeg_ReturnsTrue()
    {
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46 };
        using var stream = new MemoryStream(jpegBytes);

        var result = FileSignatureValidator.IsValidSignature(stream, ".jpg");

        result.Should().BeTrue();
        stream.Position.Should().Be(0); // Position must be preserved
    }

    [Fact]
    public void IsValidSignature_ValidPng_ReturnsTrue()
    {
        var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
        using var stream = new MemoryStream(pngBytes);

        var result = FileSignatureValidator.IsValidSignature(stream, ".png");

        result.Should().BeTrue();
    }

    [Fact]
    public void IsValidSignature_ValidPdf_ReturnsTrue()
    {
        var pdfBytes = Encoding.UTF8.GetBytes("%PDF-1.7\nSample content");
        using var stream = new MemoryStream(pdfBytes);

        var result = FileSignatureValidator.IsValidSignature(stream, ".pdf");

        result.Should().BeTrue();
    }

    [Fact]
    public void IsValidSignature_ValidZipOrDocx_ReturnsTrue()
    {
        var zipBytes = new byte[] { 0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00 };
        using var stream = new MemoryStream(zipBytes);

        var result = FileSignatureValidator.IsValidSignature(stream, ".docx");

        result.Should().BeTrue();
    }

    [Fact]
    public void IsValidSignature_WhenExtensionIsSvg_ReturnsFalseDueToXssRisk()
    {
        var svgBytes = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");
        using var stream = new MemoryStream(svgBytes);

        var result = FileSignatureValidator.IsValidSignature(stream, ".svg");

        result.Should().BeFalse();
    }

    [Fact]
    public void IsValidSignature_WhenExecutableIsDisguisedAsPng_ReturnsFalse()
    {
        // DOS PE 'MZ' header renamed to .png
        var fakePng = new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00 };
        using var stream = new MemoryStream(fakePng);

        var result = FileSignatureValidator.IsValidSignature(stream, ".png");

        result.Should().BeFalse();
    }

    [Fact]
    public void IsValidSignature_WhenLinuxElfIsDisguisedAsJpg_ReturnsFalse()
    {
        // ELF header renamed to .jpg
        var fakeJpg = new byte[] { 0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00 };
        using var stream = new MemoryStream(fakeJpg);

        var result = FileSignatureValidator.IsValidSignature(stream, ".jpg");

        result.Should().BeFalse();
    }

    [Fact]
    public void IsValidSignature_WhenPlainTextContainsHtmlInjection_ReturnsFalse()
    {
        var htmlInTxt = Encoding.UTF8.GetBytes("<script>document.cookie</script>");
        using var stream = new MemoryStream(htmlInTxt);

        var result = FileSignatureValidator.IsValidSignature(stream, ".txt");

        result.Should().BeFalse();
    }

    [Fact]
    public void IsValidSignature_SafePlainText_ReturnsTrue()
    {
        var safeText = Encoding.UTF8.GetBytes("This is a safe configuration or log line.");
        using var stream = new MemoryStream(safeText);

        var result = FileSignatureValidator.IsValidSignature(stream, ".txt");

        result.Should().BeTrue();
    }
}

