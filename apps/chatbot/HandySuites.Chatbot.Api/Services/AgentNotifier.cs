using HandySuites.Chatbot.Api.Models;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>
/// Notifica a los asesores (SUPER_ADMIN) por email cuando hay un handoff. SendGrid propio del
/// chatbot (CHAT__AGENT_EMAILS), NUNCA el NotificationService del Main API (el SA no tiene tenant).
/// Fail-safe: si SendGrid no esta configurado o falla, NO rompe el handoff.
/// </summary>
public class AgentNotifier
{
    private readonly IConfiguration _cfg;
    private readonly ILogger<AgentNotifier> _log;

    public AgentNotifier(IConfiguration cfg, ILogger<AgentNotifier> log)
    {
        _cfg = cfg;
        _log = log;
    }

    public async Task NotifyHandoffAsync(Conversation conv, CancellationToken ct = default)
    {
        var apiKey = Get("SENDGRID_API_KEY");
        var from = Get("SENDGRID_FROM_EMAIL") ?? "no-reply@handysuites.com";
        var agents = (Get("CHAT__AGENT_EMAILS") ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (string.IsNullOrWhiteSpace(apiKey) || agents.Length == 0)
        {
            _log.LogInformation("Handoff conv {Id}: SendGrid no configurado; se omite email al asesor.", conv.Id);
            return;
        }

        try
        {
            var client = new SendGridClient(apiKey);
            var origin = string.IsNullOrWhiteSpace(conv.OriginPage) ? "(desconocida)" : conv.OriginPage;
            var msg = new SendGridMessage
            {
                From = new EmailAddress(from, "Handy Suites Bot"),
                Subject = "Nuevo handoff en el chat de la landing"
            };
            msg.AddContent("text/plain",
                "Un visitante pidio hablar con un asesor.\n\n" +
                $"Conversacion: {conv.PublicId}\n" +
                $"Pagina de origen: {origin}\n\n" +
                "Abre la Bandeja del bot en la consola para atenderlo.");
            foreach (var a in agents) msg.AddTo(new EmailAddress(a));

            var resp = await client.SendEmailAsync(msg, ct);
            if ((int)resp.StatusCode >= 400)
                _log.LogWarning("SendGrid devolvio {Code} al notificar handoff conv {Id}", (int)resp.StatusCode, conv.Id);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo enviar email de handoff (conv {Id})", conv.Id);
        }
    }

    private string? Get(string key) => _cfg[key] ?? Environment.GetEnvironmentVariable(key);
}
