using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using HandySales.Application.Ai.DTOs;
using HandySales.Application.Ai.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HandySales.Infrastructure.Ai.Services;

public class AiGatewayService : IAiGatewayService
{
    private readonly HandySalesDbContext _db;
    private readonly IAiCreditService _creditService;
    private readonly IAiSanitizer _sanitizer;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<AiGatewayService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AiGatewayService(
        HandySalesDbContext db,
        IAiCreditService creditService,
        IAiSanitizer sanitizer,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<AiGatewayService> logger)
    {
        _db = db;
        _creditService = creditService;
        _sanitizer = sanitizer;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<AiResponseDto> ProcessRequestAsync(AiRequestDto request, int tenantId, int userId)
    {
        var sw = Stopwatch.StartNew();

        // 1. Sanitize
        var sanitization = _sanitizer.Sanitize(request.Prompt);
        if (!sanitization.IsClean)
        {
            await LogUsageAsync(tenantId, userId, request, 0, 0, 0, false, sanitization.BlockedReason, sw);
            throw new InvalidOperationException(sanitization.BlockedReason);
        }

        // 2. Check credits
        var hasCredits = await _creditService.HasSufficientCreditsAsync(tenantId, request.TipoAccion);
        if (!hasCredits)
        {
            await LogUsageAsync(tenantId, userId, request, 0, 0, 0, false, "Cr\u00e9ditos insuficientes", sw);
            throw new InvalidOperationException("No tienes cr\u00e9ditos suficientes. Actualiza tu plan o compra cr\u00e9ditos adicionales.");
        }

        // 3. Build messages
        var systemPrompt = _config["Ai:SystemPrompt"]
            ?? "Eres un asistente de negocios para HandySales, un CRM/ERP para PyMEs mexicanas. Solo respondes preguntas sobre ventas, inventario, clientes, cobros, rutas y operaciones del negocio. No proporcionas informaci\u00f3n personal, contrase\u00f1as ni datos t\u00e9cnicos del sistema. Responde siempre en espa\u00f1ol.";

        var model = _config["Ai:Model"] ?? "gpt-4o-mini";
        var maxTokens = int.TryParse(_config["Ai:MaxTokens"], out var mt) ? mt : 1000;
        var temperature = double.TryParse(_config["Ai:Temperature"], out var temp) ? temp : 0.3;

        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt },
            new { role = "user", content = BuildUserPrompt(request) }
        };

        var payload = new
        {
            model,
            messages,
            max_tokens = maxTokens,
            temperature
        };

        // 4. Call OpenAI
        try
        {
            var client = _httpClientFactory.CreateClient("OpenAI");
            var response = await client.PostAsJsonAsync("v1/chat/completions", payload, JsonOptions);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("OpenAI API error {StatusCode}: {Body}", response.StatusCode, errorBody);
                await LogUsageAsync(tenantId, userId, request, 0, 0, 0, false, $"OpenAI API error: {response.StatusCode}", sw);
                throw new InvalidOperationException("Error al procesar tu solicitud con el servicio de IA. Int\u00e9ntalo de nuevo.");
            }

            var result = await response.Content.ReadFromJsonAsync<OpenAiResponse>(JsonOptions);
            var content = result?.Choices?.FirstOrDefault()?.Message?.Content ?? "";
            var tokensIn = result?.Usage?.PromptTokens ?? 0;
            var tokensOut = result?.Usage?.CompletionTokens ?? 0;

            // 5. Deduct credits
            await _creditService.DeductCreditsAsync(tenantId, request.TipoAccion);

            // 6. Log usage
            var costoUsd = (tokensIn * 0.00000015m) + (tokensOut * 0.0000006m); // gpt-4o-mini pricing
            await LogUsageAsync(tenantId, userId, request, tokensIn, tokensOut, costoUsd, true, null, sw);

            // 7. Get remaining credits
            var balance = await _creditService.GetCurrentBalanceAsync(tenantId);

            sw.Stop();
            return new AiResponseDto(
                Respuesta: content,
                CreditosUsados: _creditService.GetCreditCost(request.TipoAccion),
                CreditosRestantes: balance.Disponibles,
                LatenciaMs: (int)sw.ElapsedMilliseconds
            );
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Error connecting to OpenAI API");
            await LogUsageAsync(tenantId, userId, request, 0, 0, 0, false, ex.Message, sw);
            throw new InvalidOperationException("No se pudo conectar con el servicio de IA. Verifica la configuraci\u00f3n.");
        }
    }

    private static string BuildUserPrompt(AiRequestDto request)
    {
        var prefix = request.TipoAccion.ToLower() switch
        {
            "resumen" => "Resume la siguiente informaci\u00f3n de manera concisa:\n\n",
            "insight" => "Analiza los siguientes datos y proporciona insights accionables para el negocio:\n\n",
            "pregunta" => "",
            "pronostico" => "Basado en los siguientes datos hist\u00f3ricos, proporciona un pron\u00f3stico y tendencias:\n\n",
            _ => ""
        };

        var context = string.IsNullOrEmpty(request.Contexto)
            ? ""
            : $"\n\nContexto adicional:\n{request.Contexto}";

        return $"{prefix}{request.Prompt}{context}";
    }

    private async Task LogUsageAsync(int tenantId, int userId, AiRequestDto request,
        int tokensIn, int tokensOut, decimal costoUsd, bool exitoso, string? error, Stopwatch sw)
    {
        sw.Stop();
        var log = new AiUsageLog
        {
            TenantId = tenantId,
            UsuarioId = userId,
            TipoAccion = request.TipoAccion,
            CreditosCobrados = exitoso ? _creditService.GetCreditCost(request.TipoAccion) : 0,
            Prompt = request.Prompt.Length > 2000 ? request.Prompt[..2000] : request.Prompt,
            ModeloUsado = _config["Ai:Model"] ?? "gpt-4o-mini",
            TokensInput = tokensIn,
            TokensOutput = tokensOut,
            CostoEstimadoUsd = costoUsd,
            LatenciaMs = (int)sw.ElapsedMilliseconds,
            Exitoso = exitoso,
            ErrorMessage = error,
            CreadoEn = DateTime.UtcNow
        };

        _db.AiUsageLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    // OpenAI response DTOs (internal)
    private class OpenAiResponse
    {
        public List<OpenAiChoice>? Choices { get; set; }
        public OpenAiUsage? Usage { get; set; }
    }

    private class OpenAiChoice
    {
        public OpenAiMessage? Message { get; set; }
    }

    private class OpenAiMessage
    {
        public string Content { get; set; } = "";
    }

    private class OpenAiUsage
    {
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
        public int TotalTokens { get; set; }
    }
}
