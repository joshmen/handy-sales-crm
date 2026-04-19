using System.Security.Claims;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Billing.Api.Controllers;

/// <summary>
/// Endpoints internos para sincronización cross-API (Main API → Billing API).
///
/// SEGURIDAD (defensa en profundidad):
/// 1. JWT Bearer: el caller forwardea el JWT del usuario que disparó el update (admin del tenant).
///    Esto dispara el BillingTenantRlsInterceptor que setea app.current_tenant_id desde el JWT →
///    Row-Level Security y global query filters aplican como siempre (isolación multi-tenant).
/// 2. Header X-Internal-Api-Key: shared secret que solo Main API conoce. Evita que un usuario
///    regular pueda llamar este endpoint aunque tenga un JWT válido.
/// 3. El request body NO controla el tenant — el TenantId se valida contra el JWT para evitar
///    que alguien con la API key pueda cross-tenant.
/// </summary>
[ApiController]
[Route("api/internal/sync")]
[Authorize] // requiere JWT válido → RLS y query filters aplican por tenant_id del JWT
public class InternalSyncController : ControllerBase
{
    private readonly BillingDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<InternalSyncController> _logger;

    public InternalSyncController(BillingDbContext db, IConfiguration config, ILogger<InternalSyncController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public record SyncDatosEmpresaRequest(
        int TenantId,
        string? Rfc,
        string? RazonSocial,
        string? DireccionFiscal,
        string? CodigoPostal);

    [HttpPost("datos-empresa")]
    public async Task<IActionResult> SyncDatosEmpresa(
        [FromBody] SyncDatosEmpresaRequest req,
        CancellationToken ct)
    {
        // 1) Validar API key (defensa en profundidad: solo Main API debe poder llamar este endpoint)
        var expectedKey = _config["INTERNAL_API_KEY"];
        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            _logger.LogError("INTERNAL_API_KEY no configurada en Billing API — rechazando sync");
            return StatusCode(503, new { error = "Internal sync no habilitado" });
        }

        if (!Request.Headers.TryGetValue("X-Internal-Api-Key", out var providedKey)
            || !string.Equals(providedKey.ToString(), expectedKey, StringComparison.Ordinal))
        {
            _logger.LogWarning("InternalSync con API key inválida (IP {Ip})", HttpContext.Connection.RemoteIpAddress);
            return Unauthorized();
        }

        // 2) Validar que el TenantId del body coincide con el JWT — previene cross-tenant abuse
        var jwtTenantId = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrWhiteSpace(jwtTenantId) || jwtTenantId != req.TenantId.ToString())
        {
            _logger.LogWarning("InternalSync: TenantId mismatch (body={BodyTenant}, jwt={JwtTenant})",
                req.TenantId, jwtTenantId);
            return Forbid();
        }

        // 3) Upsert — los filtros globales y RLS aplican automáticamente vía BillingTenantRlsInterceptor
        //    (que setea app.current_tenant_id desde el JWT)
        var tenantIdStr = req.TenantId.ToString();
        var config = await _db.ConfiguracionesFiscales
            .FirstOrDefaultAsync(c => c.TenantId == tenantIdStr, ct);

        if (config is null)
        {
            config = new ConfiguracionFiscal
            {
                TenantId = tenantIdStr,
                EmpresaId = req.TenantId,
                Rfc = req.Rfc,
                RazonSocial = req.RazonSocial,
                DireccionFiscal = req.DireccionFiscal,
                CodigoPostal = req.CodigoPostal,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Activo = true
            };
            _db.ConfiguracionesFiscales.Add(config);
            _logger.LogInformation("InternalSync: creando ConfiguracionFiscal para tenant {TenantId}", req.TenantId);
        }
        else
        {
            // Solo actualizar los campos duplicados — preservar certificados, series, PAC
            config.Rfc = req.Rfc;
            config.RazonSocial = req.RazonSocial;
            config.DireccionFiscal = req.DireccionFiscal;
            config.CodigoPostal = req.CodigoPostal;
            config.UpdatedAt = DateTime.UtcNow;
            _logger.LogInformation("InternalSync: actualizando ConfiguracionFiscal para tenant {TenantId}", req.TenantId);
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { synced = true, tenantId = req.TenantId });
    }
}