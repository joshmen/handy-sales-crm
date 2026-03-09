using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using HandySales.Application.Ai.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Pgvector;

namespace HandySales.Infrastructure.Ai.Services;

public class AiEmbeddingService : IAiEmbeddingService
{
    private readonly HandySalesDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<AiEmbeddingService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AiEmbeddingService(
        HandySalesDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<AiEmbeddingService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task UpsertEmbeddingAsync(int tenantId, string sourceType, int sourceId, string contentText)
    {
        if (string.IsNullOrWhiteSpace(contentText))
            return;

        var vector = await GetEmbeddingFromOpenAiAsync(contentText);
        if (vector == null)
            return;

        var existing = await _db.AiEmbeddings
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.SourceType == sourceType && e.SourceId == sourceId);

        if (existing != null)
        {
            existing.ContentText = contentText;
            existing.Embedding = vector;
            existing.ActualizadoEn = DateTime.UtcNow;
        }
        else
        {
            _db.AiEmbeddings.Add(new AiEmbedding
            {
                TenantId = tenantId,
                SourceType = sourceType,
                SourceId = sourceId,
                ContentText = contentText,
                Embedding = vector,
                CreadoEn = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task DeleteEmbeddingAsync(int tenantId, string sourceType, int sourceId)
    {
        var existing = await _db.AiEmbeddings
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.SourceType == sourceType && e.SourceId == sourceId);

        if (existing != null)
        {
            _db.AiEmbeddings.Remove(existing);
            await _db.SaveChangesAsync();
        }
    }

    public async Task<List<SemanticSearchResult>> SearchAsync(int tenantId, string query, int topK = 3, double minScore = 0.72)
    {
        var queryVector = await GetEmbeddingFromOpenAiAsync(query);
        if (queryVector == null)
            return [];

        // Cosine distance: <=> operator returns distance (0 = identical, 2 = opposite)
        // Score = 1 - distance (so 1.0 = perfect match)
        var results = await _db.Database
            .SqlQueryRaw<EmbeddingSearchRow>(@"
                SELECT
                    source_type AS ""SourceType"",
                    source_id AS ""SourceId"",
                    content_text AS ""ContentText"",
                    1 - (embedding <=> {0}::vector) AS ""Score""
                FROM ai_embeddings
                WHERE tenant_id = {1}
                  AND 1 - (embedding <=> {0}::vector) >= {2}
                ORDER BY embedding <=> {0}::vector
                LIMIT {3}",
                queryVector.ToString(), tenantId, minScore, topK)
            .ToListAsync();

        return results.Select(r => new SemanticSearchResult(
            r.SourceType, r.SourceId, r.ContentText, r.Score
        )).ToList();
    }

    public async Task SafeUpsertAsync(int tenantId, string sourceType, int sourceId, string contentText)
    {
        try
        {
            await UpsertEmbeddingAsync(tenantId, sourceType, sourceId, contentText);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to upsert embedding for {SourceType}:{SourceId} in tenant {TenantId}",
                sourceType, sourceId, tenantId);
        }
    }

    private async Task<Vector?> GetEmbeddingFromOpenAiAsync(string text)
    {
        var model = _config["Ai:EmbeddingModel"] ?? "text-embedding-3-small";

        var payload = new
        {
            model,
            input = text.Length > 8000 ? text[..8000] : text // Truncate to avoid token limits
        };

        try
        {
            var client = _httpClientFactory.CreateClient("OpenAI");
            var response = await client.PostAsJsonAsync("v1/embeddings", payload, JsonOptions);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("OpenAI Embeddings API error {StatusCode}: {Body}", response.StatusCode, errorBody);
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<EmbeddingResponse>(JsonOptions);
            var floats = result?.Data?.FirstOrDefault()?.Embedding;
            if (floats == null || floats.Length == 0)
                return null;

            return new Vector(floats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling OpenAI Embeddings API");
            return null;
        }
    }

    // Internal DTOs for OpenAI embeddings API response
    private class EmbeddingResponse
    {
        public List<EmbeddingData>? Data { get; set; }
    }

    private class EmbeddingData
    {
        public float[] Embedding { get; set; } = [];
    }

    // Row type for SqlQueryRaw mapping
    private class EmbeddingSearchRow
    {
        public string SourceType { get; set; } = "";
        public int SourceId { get; set; }
        public string ContentText { get; set; } = "";
        public double Score { get; set; }
    }
}
