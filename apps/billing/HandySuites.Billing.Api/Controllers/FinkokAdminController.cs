using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.DTOs;
using HandySuites.Billing.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Billing.Api.Controllers;

/// <summary>
/// Operaciones administrativas SuperAdmin sobre la integración Finkok.
/// SOLO accesible por usuarios con rol SUPER_ADMIN (verificado via JWT claim).
///
/// El frontend del panel /admin/finkok consume estos endpoints directamente
/// (vía apps/web/src/lib/billingApi.ts), no via proxy a Main API.
///
/// BILL-1 extensión (2026-05-26).
/// </summary>
[ApiController]
[Route("api/admin/finkok")]
[Authorize]
public class FinkokAdminController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly IRegistrationService _registrationService;
    private readonly ILogger<FinkokAdminController> _logger;

    public FinkokAdminController(
        BillingDbContext context,
        IRegistrationService registrationService,
        ILogger<FinkokAdminController> logger)
    {
        _context = context;
        _registrationService = registrationService;
        _logger = logger;
    }

    /// <summary>
    /// Devuelve 403 Forbid si el JWT no trae role=SUPER_ADMIN. true si OK.
    /// </summary>
    private bool IsSuperAdmin()
    {
        var role = User.FindFirst("role")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        return role == "SUPER_ADMIN";
    }

    // ─── GET /api/admin/finkok/emitters?page=1 ────────────────────────────────
    [HttpGet("emitters")]
    public async Task<IActionResult> ListEmitters([FromQuery] int page = 1)
    {
        if (!IsSuperAdmin()) return Forbid();

        var result = await _registrationService.ListEmittersAsync(page);
        if (!result.Success)
        {
            return StatusCode(502, new { error = result.Message ?? "Error consultando Finkok" });
        }

        // Cruzar con BD local: enriquecer cada emisor con su `tenant_id` interno y
        // `razon_social` que tenemos en `configuracion_fiscal` (Finkok puede no devolverla).
        var rfcs = result.Items.Select(e => e.Rfc).ToList();
        var localConfigs = await _context.ConfiguracionesFiscales
            .AsNoTracking()
            .IgnoreQueryFilters() // SuperAdmin ve todos los tenants
            .Where(c => rfcs.Contains(c.Rfc!))
            .Select(c => new { c.Rfc, c.TenantId, c.RazonSocial, c.FinkokRegistradoEn })
            .ToListAsync();

        var enriched = result.Items.Select(e =>
        {
            var local = localConfigs.FirstOrDefault(c => c.Rfc == e.Rfc);
            return new
            {
                e.Rfc,
                razonSocial = e.RazonSocial ?? local?.RazonSocial,
                e.Status,
                typeUser = e.TypeUser?.ToString(),
                creditsRemaining = e.CreditsRemaining,
                registeredAt = e.RegisteredAt ?? local?.FinkokRegistradoEn,
                tenantId = local?.TenantId,
            };
        }).ToList();

        return Ok(new { page, items = enriched });
    }

    // ─── GET /api/admin/finkok/emitters/{rfc} ─────────────────────────────────
    [HttpGet("emitters/{rfc}")]
    public async Task<IActionResult> GetEmitter(string rfc)
    {
        if (!IsSuperAdmin()) return Forbid();

        var result = await _registrationService.GetEmitterInfoAsync(rfc);
        if (!result.Success)
        {
            return StatusCode(502, new { error = result.Message ?? "Finkok no devolvió info del emisor" });
        }

        // Cruzar con BD local
        var local = await _context.ConfiguracionesFiscales
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(c => c.Rfc == rfc)
            .Select(c => new { c.TenantId, c.RazonSocial, c.FinkokRegistradoEn })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            rfc,
            result.Status,
            typeUser = result.TypeUser?.ToString(),
            creditsRemaining = result.CreditsRemaining,
            creditsConsumedMonth = result.CreditsConsumedMonth,
            local?.TenantId,
            razonSocial = local?.RazonSocial,
            registeredAt = local?.FinkokRegistradoEn,
        });
    }

    // ─── POST /api/admin/finkok/emitters/{rfc}/suspend ────────────────────────
    [HttpPost("emitters/{rfc}/suspend")]
    public async Task<IActionResult> SuspendEmitter(string rfc)
    {
        if (!IsSuperAdmin()) return Forbid();

        var result = await _registrationService.UpdateEmitterAsync(
            new UpdateEmitterRequest(rfc, "suspended", null, null, null));

        if (!result.Success)
            return BadRequest(new { error = result.Message ?? "Finkok rechazó la suspensión" });

        // Actualizar BD local para que UI tenant también lo vea
        await UpdateLocalFinkokStatus(rfc, "suspended");

        _logger.LogInformation("FINKOK_ADMIN_AUDIT: Emisor {Rfc} SUSPENDIDO por SuperAdmin {UserId}",
            rfc, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);

        return Ok(new { rfc, status = "suspended" });
    }

    // ─── POST /api/admin/finkok/emitters/{rfc}/reactivate ─────────────────────
    [HttpPost("emitters/{rfc}/reactivate")]
    public async Task<IActionResult> ReactivateEmitter(string rfc)
    {
        if (!IsSuperAdmin()) return Forbid();

        var result = await _registrationService.UpdateEmitterAsync(
            new UpdateEmitterRequest(rfc, "active", null, null, null));

        if (!result.Success)
            return BadRequest(new { error = result.Message ?? "Finkok rechazó la reactivación" });

        await UpdateLocalFinkokStatus(rfc, "active");

        _logger.LogInformation("FINKOK_ADMIN_AUDIT: Emisor {Rfc} REACTIVADO por SuperAdmin {UserId}",
            rfc, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);

        return Ok(new { rfc, status = "active" });
    }

    public record SwitchModeRequest(string TypeUser);

    // ─── POST /api/admin/finkok/emitters/{rfc}/switch-mode ────────────────────
    [HttpPost("emitters/{rfc}/switch-mode")]
    public async Task<IActionResult> SwitchMode(string rfc, [FromBody] SwitchModeRequest req)
    {
        if (!IsSuperAdmin()) return Forbid();
        if (string.IsNullOrEmpty(req.TypeUser) || (req.TypeUser != "P" && req.TypeUser != "O"))
            return BadRequest(new { error = "typeUser debe ser 'P' (prepago) u 'O' (ilimitado)" });

        var newTypeUser = req.TypeUser[0];
        var result = await _registrationService.SwitchTypeUserAsync(rfc, newTypeUser);

        if (!result.Success)
            return BadRequest(new { error = result.Message ?? "Finkok rechazó el cambio de modalidad" });

        // Actualizar BD local
        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Rfc == rfc);
        if (config != null)
        {
            config.FinkokTypeUser = newTypeUser;
            config.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("FINKOK_ADMIN_AUDIT: Emisor {Rfc} cambió modalidad a {Mode} por SuperAdmin {UserId}",
            rfc, newTypeUser, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);

        return Ok(new { rfc, typeUser = newTypeUser.ToString() });
    }

    public record AssignCreditsRequest(int Credits);

    // ─── POST /api/admin/finkok/emitters/{rfc}/assign-credits ─────────────────
    [HttpPost("emitters/{rfc}/assign-credits")]
    public async Task<IActionResult> AssignCreditsToEmitter(string rfc, [FromBody] AssignCreditsRequest req)
    {
        if (!IsSuperAdmin()) return Forbid();
        if (req.Credits <= 0)
            return BadRequest(new { error = "credits debe ser > 0" });

        var result = await _registrationService.AssignCreditsAsync(rfc, req.Credits);

        if (!result.Success)
            return BadRequest(new { error = result.Message ?? "Finkok rechazó la asignación" });

        // Actualizar BD local con créditos restantes (los retornados son el total post-asignación)
        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Rfc == rfc);
        if (config != null && result.CreditsTotal.HasValue)
        {
            config.FinkokCreditosRestantes = result.CreditsTotal.Value;
            config.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("FINKOK_ADMIN_AUDIT: Emisor {Rfc} recibió {Credits} créditos por SuperAdmin {UserId} (total: {Total})",
            rfc, req.Credits, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, result.CreditsTotal);

        return Ok(new { rfc, creditsAssigned = req.Credits, creditsTotal = result.CreditsTotal });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task UpdateLocalFinkokStatus(string rfc, string newStatus)
    {
        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Rfc == rfc);
        if (config == null) return;
        config.FinkokStatus = newStatus;
        config.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
