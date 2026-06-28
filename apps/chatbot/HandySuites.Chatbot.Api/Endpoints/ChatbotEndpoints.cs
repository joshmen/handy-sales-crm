namespace HandySuites.Chatbot.Api.Endpoints;

/// <summary>
/// Rutas del chatbot. Fase 0: health real + stubs (501) por zona; Fase 1 implementa la logica.
/// Zonas: PUBLIC (sin JWT, rate-limited, CORS publico), AGENT (JWT SUPER_ADMIN), INTERNAL (api key).
/// </summary>
public static class ChatbotEndpoints
{
    public static void MapChatbotEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", () => Results.Ok(new
        {
            status = "healthy",
            service = "HandySuites Chatbot",
            timestamp = DateTime.UtcNow
        })).WithName("Health");

        // ── PUBLIC (visitante anonimo) ──
        var pub = app.MapGroup("/public/conversations")
            .RequireCors("ChatbotPublic")
            .RequireRateLimiting("chatbot-anonymous");
        pub.MapPost("/", () => Results.Problem(statusCode: 501, title: "Fase 1: iniciar conversacion"));
        pub.MapPost("/{publicId:guid}/chat", (Guid publicId) => Results.Problem(statusCode: 501, title: "Fase 1: chat RAG (SSE)"));
        pub.MapGet("/{publicId:guid}/stream", (Guid publicId) => Results.Problem(statusCode: 501, title: "Fase 1: stream visitante (SSE)"));
        pub.MapPost("/{publicId:guid}/handoff", (Guid publicId) => Results.Problem(statusCode: 501, title: "Fase 1: handoff a agente"));
        pub.MapPost("/{publicId:guid}/lead", (Guid publicId) => Results.Problem(statusCode: 501, title: "Fase 1: capturar lead"));

        // ── AGENT (consola SA, JWT SUPER_ADMIN) ──
        var agent = app.MapGroup("/agent")
            .RequireAuthorization(p => p.RequireRole("SUPER_ADMIN"))
            .RequireCors("ChatbotAgent");
        agent.MapGet("/conversations", () => Results.Problem(statusCode: 501, title: "Fase 1: lista bandeja + KPIs"));
        agent.MapGet("/conversations/{id:int}", (int id) => Results.Problem(statusCode: 501, title: "Fase 1: hilo + lead"));
        agent.MapPost("/conversations/{id:int}/take", (int id) => Results.Problem(statusCode: 501, title: "Fase 1: tomar conversacion"));
        agent.MapPost("/conversations/{id:int}/messages", (int id) => Results.Problem(statusCode: 501, title: "Fase 1: responder en vivo"));
        agent.MapPost("/conversations/{id:int}/close", (int id) => Results.Problem(statusCode: 501, title: "Fase 1: cerrar"));
        agent.MapGet("/badges", () => Results.Problem(statusCode: 501, title: "Fase 1: conteo waiting"));

        // ── INTERNAL (carga de KB, api key) ──
        app.MapPost("/kb/ingest", (HttpRequest req, IConfiguration cfg) =>
        {
            var provided = req.Headers["X-Internal-Api-Key"].ToString();
            var expected = cfg["INTERNAL_API_KEY"] ?? Environment.GetEnvironmentVariable("INTERNAL_API_KEY");
            if (string.IsNullOrEmpty(provided) || string.IsNullOrEmpty(expected) || provided != expected)
                return Results.Unauthorized();
            return Results.Problem(statusCode: 501, title: "Fase 1: ingest KB (chunk + embed)");
        });
    }
}
