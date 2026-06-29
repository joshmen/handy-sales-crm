using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Pgvector;

namespace HandySuites.Chatbot.Api.Services;

public record ChatTurn(string Role, string Content);

/// <summary>Recoge el uso de tokens del stream (chunk final con include_usage).</summary>
public class StreamStats
{
    public int? PromptTokens { get; set; }
    public int? CompletionTokens { get; set; }
}

/// <summary>
/// Cliente delgado de OpenAI para el chatbot: embeddings, moderacion y chat con streaming.
/// La API key vive SOLO aqui (server-side), nunca llega al browser.
/// </summary>
public class OpenAiClient
{
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<OpenAiClient> _log;

    private static readonly JsonSerializerOptions Snake = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public OpenAiClient(IHttpClientFactory http, IConfiguration cfg, ILogger<OpenAiClient> log)
    {
        _http = http;
        _cfg = cfg;
        _log = log;
    }

    // ── Embeddings (text-embedding-3-small -> vector(1536)) ──
    public async Task<Vector?> EmbedAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var model = _cfg["Ai:EmbeddingModel"] ?? "text-embedding-3-small";
        var payload = new { model, input = text.Length > 8000 ? text[..8000] : text };
        try
        {
            var client = _http.CreateClient("OpenAI");
            using var resp = await client.PostAsync("v1/embeddings", JsonBody(payload), ct);
            if (!resp.IsSuccessStatusCode)
            {
                _log.LogError("OpenAI embeddings error {Code}", resp.StatusCode);
                return null;
            }
            var r = await resp.Content.ReadFromJsonAsync<EmbeddingResponse>(Snake, ct);
            var floats = r?.Data?.FirstOrDefault()?.Embedding;
            return floats is { Length: > 0 } ? new Vector(floats) : null;
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error llamando a OpenAI embeddings");
            return null;
        }
    }

    // ── Moderacion (omni-moderation-latest). Fail-open: si la API falla NO bloquea (se loguea). ──
    public async Task<bool> IsFlaggedAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var payload = new { model = "omni-moderation-latest", input = text.Length > 4000 ? text[..4000] : text };
        try
        {
            var client = _http.CreateClient("OpenAI");
            using var resp = await client.PostAsync("v1/moderations", JsonBody(payload), ct);
            if (!resp.IsSuccessStatusCode)
            {
                _log.LogWarning("OpenAI moderation error {Code} (fail-open)", resp.StatusCode);
                return false;
            }
            var r = await resp.Content.ReadFromJsonAsync<ModerationResponse>(Snake, ct);
            return r?.Results?.FirstOrDefault()?.Flagged ?? false;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Error en moderation (fail-open)");
            return false;
        }
    }

    // ── Chat con streaming (gpt-4o-mini). Emite deltas; setea uso en stats al final. ──
    public async IAsyncEnumerable<string> StreamChatAsync(
        string systemPrompt, IReadOnlyList<ChatTurn> history, StreamStats stats,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var model = _cfg["Ai:Model"] ?? "gpt-4o-mini";
        var maxTokens = int.TryParse(_cfg["Ai:MaxTokens"], out var mt) ? mt : 700;
        var temperature = double.TryParse(_cfg["Ai:Temperature"], out var temp) ? temp : 0.2;

        var messages = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var h in history) messages.Add(new { role = h.Role, content = h.Content });

        var payload = new
        {
            model,
            messages,
            max_tokens = maxTokens,
            temperature,
            stream = true,
            stream_options = new { include_usage = true }
        };

        var client = _http.CreateClient("OpenAI");
        using var req = new HttpRequestMessage(HttpMethod.Post, "v1/chat/completions") { Content = JsonBody(payload) };
        using var resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!resp.IsSuccessStatusCode)
        {
            // No volcar el body completo (puede llevar info operativa/sensible a logs centralizados).
            _log.LogError("OpenAI chat error {Code}", resp.StatusCode);
            yield break;
        }

        using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync(ct);
            if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data:", StringComparison.Ordinal)) continue;
            var data = line["data:".Length..].Trim();
            if (data == "[DONE]") break;

            ChatChunk? chunk = TryParseChunk(data);
            if (chunk?.Usage != null)
            {
                stats.PromptTokens = chunk.Usage.PromptTokens;
                stats.CompletionTokens = chunk.Usage.CompletionTokens;
            }
            var delta = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(delta)) yield return delta;
        }
    }

    private static ChatChunk? TryParseChunk(string data)
    {
        try { return JsonSerializer.Deserialize<ChatChunk>(data, Snake); }
        catch { return null; }
    }

    private static HttpContent JsonBody(object payload)
        => new StringContent(JsonSerializer.Serialize(payload, Snake), Encoding.UTF8, "application/json");

    // ── DTOs internos de la API de OpenAI ──
    private class EmbeddingResponse { public List<EmbeddingData>? Data { get; set; } }
    private class EmbeddingData { public float[] Embedding { get; set; } = []; }

    private class ModerationResponse { public List<ModerationResult>? Results { get; set; } }
    private class ModerationResult { public bool Flagged { get; set; } }

    private class ChatChunk
    {
        public List<ChatChoice>? Choices { get; set; }
        public ChatUsage? Usage { get; set; }
    }
    private class ChatChoice { public ChatDelta? Delta { get; set; } }
    private class ChatDelta { public string? Content { get; set; } }
    private class ChatUsage
    {
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
