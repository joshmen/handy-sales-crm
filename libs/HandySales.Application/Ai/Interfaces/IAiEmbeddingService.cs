namespace HandySales.Application.Ai.Interfaces;

public interface IAiEmbeddingService
{
    /// <summary>
    /// Generate embedding from OpenAI and upsert into ai_embeddings table.
    /// </summary>
    Task UpsertEmbeddingAsync(int tenantId, string sourceType, int sourceId, string contentText);

    /// <summary>
    /// Delete embedding for a given source.
    /// </summary>
    Task DeleteEmbeddingAsync(int tenantId, string sourceType, int sourceId);

    /// <summary>
    /// Search for similar embeddings using cosine similarity.
    /// Returns top-K results above minScore threshold.
    /// </summary>
    Task<List<SemanticSearchResult>> SearchAsync(int tenantId, string query, int topK = 3, double minScore = 0.72);

    /// <summary>
    /// Fire-and-forget-safe wrapper around UpsertEmbeddingAsync.
    /// Never throws — logs errors and continues.
    /// </summary>
    Task SafeUpsertAsync(int tenantId, string sourceType, int sourceId, string contentText);
}

public record SemanticSearchResult(
    string SourceType,
    int SourceId,
    string ContentText,
    double Score
);
