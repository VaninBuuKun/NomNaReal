namespace NomNa.Domain.Entities;

public class MessageAttachmentItem
{
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Type { get; set; } = "image";
}
