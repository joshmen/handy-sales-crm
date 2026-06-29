using System.Text.Json;
using HandySuites.Chatbot.Api.Dtos;
using HandySuites.Chatbot.Api.Services;

namespace HandySuites.Chatbot.Api.Workers;

/// <summary>
/// Carga la KB curada (kb/handy-kb.json) una vez al arrancar, de forma idempotente
/// (KbIngestService salta documentos sin cambios por slug+hash). Fail-safe: si no hay
/// archivo o falla OpenAI, no rompe el arranque. Desactivable con SEED_KB=false.
/// </summary>
public class KbSeeder : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHostEnvironment _env;
    private readonly ILogger<KbSeeder> _log;

    public KbSeeder(IServiceScopeFactory scopeFactory, IHostEnvironment env, ILogger<KbSeeder> log)
    {
        _scopeFactory = scopeFactory;
        _env = env;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.Equals(Environment.GetEnvironmentVariable("SEED_KB"), "false", StringComparison.OrdinalIgnoreCase))
            return;

        var path = Path.Combine(_env.ContentRootPath, "kb", "handy-kb.json");
        if (!File.Exists(path))
        {
            _log.LogInformation("KB seed: no se encontro {Path}; se omite.", path);
            return;
        }

        try
        {
            var json = await File.ReadAllTextAsync(path, stoppingToken);
            var req = JsonSerializer.Deserialize<KbIngestRequest>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            if (req?.Documents is null || req.Documents.Count == 0)
            {
                _log.LogInformation("KB seed: archivo sin documentos; se omite.");
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var ingest = scope.ServiceProvider.GetRequiredService<KbIngestService>();
            var result = await ingest.IngestAsync(req.Documents, stoppingToken);
            _log.LogInformation("KB seed: docs={Docs} chunks={Chunks} skipped={Skipped}",
                result.Documents, result.Chunks, result.Skipped);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "KB seed fallo (no critico)");
        }
    }
}
