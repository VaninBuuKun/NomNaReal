namespace NomNa.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
