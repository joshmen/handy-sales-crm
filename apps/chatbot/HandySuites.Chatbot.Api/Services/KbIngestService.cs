using System.Security.Cryptography;
using System.Text;
using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Dtos;
using HandySuites.Chatbot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>
/// Carga de la base de conocimiento: upsert idempotente por slug + hash, troceo y embeddings.
/// Si el contenido no cambio (mismo hash) y ya hay embeddings, se salta (idempotente).
/// </summary>
public class KbIngestService
{
    private const int ChunkTarget = 700;

    private readonly ChatDbContext _db;
    private readonly OpenAiClient _ai;
    private readonly ILogger<KbIngestService> _log;

    public KbIngestService(ChatDbContext db, OpenAiClient ai, ILogger<KbIngestService> log)
    {
        _db = db;
        _ai = ai;
        _log = log;
    }

    public async Task<KbIngestResult> IngestAsync(IEnumerable<KbIngestDoc> docs, CancellationToken ct = default)
    {
        int documents = 0, chunks = 0, skipped = 0;

        foreach (var d in docs)
        {
            if (string.IsNullOrWhiteSpace(d.Slug) || string.IsNullOrWhiteSpace(d.Content))
            {
                skipped++;
                continue;
            }

            var hash = Sha256(d.Content);
            var existing = await _db.KbDocuments
                .Include(x => x.Embeddings)
                .FirstOrDefaultAsync(x => x.Slug == d.Slug, ct);

            if (existing != null && existing.ContentHash == hash && existing.Embeddings.Count > 0)
            {
                skipped++;
                continue;
            }

            if (existing == null)
            {
                existing = new KbDocument { Slug = d.Slug, CreadoEn = DateTime.UtcNow };
                _db.KbDocuments.Add(existing);
            }

            existing.Title = d.Title;
            existing.Category = d.Category;
            existing.Content = d.Content;
            existing.SourceUrl = d.SourceUrl;
            existing.ContentHash = hash;
            existing.Activo = true;
            existing.ActualizadoEn = DateTime.UtcNow;

            if (existing.Embeddings.Count > 0)
            {
                _db.KbEmbeddings.RemoveRange(existing.Embeddings);
                existing.Embeddings.Clear();
            }

            await _db.SaveChangesAsync(ct); // asegura existing.Id

            var parts = Chunk(d.Content);
            var idx = 0;
            foreach (var part in parts)
            {
                var vec = await _ai.EmbedAsync(part, ct);
                if (vec == null)
                {
                    _log.LogWarning("No se pudo generar embedding del chunk {Idx} de {Slug}", idx, d.Slug);
                    continue;
                }
                _db.KbEmbeddings.Add(new KbEmbedding
                {
                    DocumentId = existing.Id,
                    ChunkIndex = idx++,
                    ChunkText = part,
                    Embedding = vec,
                    CreadoEn = DateTime.UtcNow
                });
                chunks++;
            }

            await _db.SaveChangesAsync(ct);
            documents++;
        }

        return new KbIngestResult(documents, chunks, skipped);
    }

    /// <summary>Trocea por parrafos agrupando hasta ~ChunkTarget chars; corta parrafos muy largos.</summary>
    private static List<string> Chunk(string content, int target = ChunkTarget)
    {
        var paras = content.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries);
        var chunks = new List<string>();
        var sb = new StringBuilder();

        foreach (var raw in paras)
        {
            var para = raw.Trim();
            if (para.Length == 0) continue;

            if (sb.Length > 0 && sb.Length + para.Length > target)
            {
                chunks.Add(sb.ToString().Trim());
                sb.Clear();
            }

            if (para.Length > target)
            {
                for (var i = 0; i < para.Length; i += target)
                    chunks.Add(para.Substring(i, Math.Min(target, para.Length - i)).Trim());
            }
            else
            {
                if (sb.Length > 0) sb.Append("\n\n");
                sb.Append(para);
            }
        }

        if (sb.Length > 0) chunks.Add(sb.ToString().Trim());
        return chunks.Where(c => c.Length > 0).ToList();
    }

    private static string Sha256(string s)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(s ?? ""));
        return Convert.ToHexString(bytes);
    }
}
