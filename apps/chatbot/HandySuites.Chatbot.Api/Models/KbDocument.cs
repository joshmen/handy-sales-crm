namespace HandySuites.Chatbot.Api.Models;

/// <summary>
/// Documento de la base de conocimiento (KB) que alimenta el RAG del chatbot.
/// Cada documento se trocea en chunks y cada chunk genera un KbEmbedding.
/// snake_case via EFCore.NamingConventions.
/// </summary>
public class KbDocument
{
    public int Id { get; set; }

    /// <summary>Titulo legible del documento.</summary>
    public string Title { get; set; } = "";

    /// <summary>URL de origen (si aplica): pagina web, PDF, etc.</summary>
    public string? SourceUrl { get; set; }

    /// <summary>Categoria/etiqueta para filtrar (ej. "precios", "soporte").</summary>
    public string? Category { get; set; }

    /// <summary>Contenido completo del documento antes de trocear.</summary>
    public string Content { get; set; } = "";

    /// <summary>Hash del contenido para deteccion de cambios e idempotencia de ingest.</summary>
    public string? ContentHash { get; set; }

    public bool Activo { get; set; } = true;

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? ActualizadoEn { get; set; }

    public List<KbEmbedding> Embeddings { get; set; } = new();
}
