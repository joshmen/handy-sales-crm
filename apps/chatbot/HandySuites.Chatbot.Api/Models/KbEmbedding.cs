using System.ComponentModel.DataAnnotations.Schema;
using Pgvector;

namespace HandySuites.Chatbot.Api.Models;

/// <summary>
/// Chunk vectorizado de un KbDocument para busqueda semantica (RAG).
/// El embedding es vector(1536) de text-embedding-3-small.
/// Indice unico (document_id, chunk_index); indice HNSW sobre embedding (en la migracion).
/// </summary>
public class KbEmbedding
{
    public long Id { get; set; }

    public int DocumentId { get; set; }
    public KbDocument? Document { get; set; }

    /// <summary>Orden del chunk dentro del documento (0-based).</summary>
    public int ChunkIndex { get; set; }

    /// <summary>Texto original del chunk (para mostrar/citar en resultados).</summary>
    public string ChunkText { get; set; } = "";

    /// <summary>Vector de 1536 dimensiones (text-embedding-3-small).</summary>
    [Column("embedding", TypeName = "vector(1536)")]
    public Vector Embedding { get; set; } = null!;

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}
