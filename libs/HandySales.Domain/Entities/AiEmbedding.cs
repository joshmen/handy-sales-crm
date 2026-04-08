using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Pgvector;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Stores vector embeddings for semantic search (RAG).
/// NOT an AuditableEntity — this is a technical AI table, not a business entity.
/// </summary>
[Table("ai_embeddings")]
public class AiEmbedding
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    /// <summary>
    /// Discriminator: "Cliente", "Producto", "Visita", "Pedido"
    /// </summary>
    [Column("source_type")]
    [MaxLength(30)]
    public string SourceType { get; set; } = "";

    [Column("source_id")]
    public int SourceId { get; set; }

    /// <summary>
    /// The original text that was embedded (for display in search results).
    /// </summary>
    [Column("content_text")]
    public string ContentText { get; set; } = "";

    /// <summary>
    /// The 1536-dimensional vector from text-embedding-3-small.
    /// </summary>
    [Column("embedding", TypeName = "vector(1536)")]
    public Vector Embedding { get; set; } = null!;

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; }

    [Column("actualizado_en")]
    public DateTime? ActualizadoEn { get; set; }
}
