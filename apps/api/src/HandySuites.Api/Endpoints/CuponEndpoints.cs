using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class CuponEndpoints
{
    public static void MapCuponEndpoints(this IEndpointRouteBuilder app)
    {
        // ── SuperAdmin CRUD ──
        var superadmin = app.MapGroup("/api/superadmin/cupones")
            .RequireAuthorization()
            .RequireCors("HandySuitesPolicy");

        superadmin.MapGet("/", GetAll)
            .WithName("GetAllCupones")
            .WithSummary("Lista todos los cupones (SuperAdmin)");

        superadmin.MapPost("/", Create)
            .WithName("CreateCupon")
            .WithSummary("Crea un nuevo cupón (SuperAdmin)");

        superadmin.MapPut("/{id:int}", Update)
            .WithName("UpdateCupon")
            .WithSummary("Actualiza un cupón (SuperAdmin)");

        superadmin.MapDelete("/{id:int}", Delete)
            .WithName("DeleteCupon")
            .WithSummary("Elimina (soft delete) un cupón (SuperAdmin)");

        // ── Tenant redemption ──
        var subscription = app.MapGroup("/api/subscription")
            .RequireAuthorization()
            .RequireCors("HandySuitesPolicy");

        subscription.MapPost("/redimir-cupon", RedimirCupon)
            .WithName("RedimirCupon")
            .WithSummary("Redime un cupón para el tenant actual");
    }

    // ── GET /api/superadmin/cupones ──
    private static async Task<IResult> GetAll(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cupones = await db.Cupones
            .IgnoreQueryFilters()
            .Where(c => c.EliminadoEn == null)
            .AsNoTracking()
            .OrderByDescending(c => c.CreadoEn)
            .Select(c => new
            {
                c.Id,
                c.Codigo,
                c.Nombre,
                Tipo = c.Tipo.ToString(),
                c.MesesGratis,
                c.PlanObjetivo,
                c.MesesUpgrade,
                c.DescuentoPorcentaje,
                c.MaxUsos,
                c.UsosActuales,
                c.FechaExpiracion,
                c.Activo,
                c.CreadoEn
            })
            .ToListAsync();

        return Results.Ok(cupones);
    }

    // ── POST /api/superadmin/cupones ──
    private static async Task<IResult> Create(
        [FromBody] CuponCreateDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cupon = new Cupon
        {
            Nombre = dto.Nombre,
            Tipo = dto.Tipo,
            MesesGratis = dto.MesesGratis,
            PlanObjetivo = dto.PlanObjetivo,
            MesesUpgrade = dto.MesesUpgrade,
            DescuentoPorcentaje = dto.DescuentoPorcentaje,
            MaxUsos = dto.MaxUsos ?? 1,
            FechaExpiracion = dto.FechaExpiracion
        };

        db.Cupones.Add(cupon);
        await db.SaveChangesAsync();

        return Results.Created($"/api/superadmin/cupones/{cupon.Id}", new
        {
            cupon.Id,
            cupon.Codigo,
            cupon.Nombre,
            Tipo = cupon.Tipo.ToString()
        });
    }

    // ── PUT /api/superadmin/cupones/{id} ──
    private static async Task<IResult> Update(
        int id,
        [FromBody] CuponUpdateDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cupon = await db.Cupones
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == id && c.EliminadoEn == null);

        if (cupon == null)
            return Results.NotFound(new { message = "Cupón no encontrado" });

        cupon.Nombre = dto.Nombre ?? cupon.Nombre;
        cupon.MaxUsos = dto.MaxUsos ?? cupon.MaxUsos;
        cupon.FechaExpiracion = dto.FechaExpiracion ?? cupon.FechaExpiracion;
        cupon.Activo = dto.Activo ?? cupon.Activo;

        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cupón actualizado" });
    }

    // ── DELETE /api/superadmin/cupones/{id} ──
    private static async Task<IResult> Delete(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cupon = await db.Cupones
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == id && c.EliminadoEn == null);

        if (cupon == null)
            return Results.NotFound(new { message = "Cupón no encontrado" });

        db.Cupones.Remove(cupon);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cupón eliminado" });
    }

    // ── POST /api/subscription/redimir-cupon ──
    private static async Task<IResult> RedimirCupon(
        [FromBody] RedimirCuponRequest request,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var codigo = request.Codigo?.Trim().ToUpper();
        if (string.IsNullOrEmpty(codigo))
            return Results.BadRequest(new { message = "El código del cupón es requerido" });

        // Find coupon (ignore tenant filters since Cupon has no TenantId)
        var cupon = await db.Cupones
            .FirstOrDefaultAsync(c => c.Codigo == codigo);

        if (cupon == null)
            return Results.NotFound(new { message = "Cupón no encontrado" });

        if (!cupon.Activo)
            return Results.BadRequest(new { message = "Este cupón no está activo" });

        if (cupon.FechaExpiracion.HasValue && cupon.FechaExpiracion.Value < DateTime.UtcNow)
            return Results.BadRequest(new { message = "Este cupón ha expirado" });

        if (cupon.UsosActuales >= cupon.MaxUsos)
            return Results.BadRequest(new { message = "Este cupón ha alcanzado el máximo de usos" });

        // Check if tenant already redeemed this coupon
        var yaRedimido = await db.CuponRedenciones
            .IgnoreQueryFilters()
            .AnyAsync(r => r.CuponId == cupon.Id
                        && r.TenantId == currentTenant.TenantId
                        && r.EliminadoEn == null);

        if (yaRedimido)
            return Results.BadRequest(new { message = "Tu empresa ya ha utilizado este cupón" });

        // Get tenant
        var tenant = await db.Tenants
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        if (tenant == null)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        // Apply benefit based on type
        string beneficioAplicado;
        switch (cupon.Tipo)
        {
            case TipoCupon.MesesGratis:
                var meses = cupon.MesesGratis ?? 1;
                var baseDate = tenant.FechaExpiracion ?? DateTime.UtcNow;
                if (baseDate < DateTime.UtcNow) baseDate = DateTime.UtcNow;
                tenant.FechaExpiracion = baseDate.AddMonths(meses);
                if (tenant.SubscriptionStatus == "Trial" || tenant.SubscriptionStatus == "Expired")
                    tenant.SubscriptionStatus = "Active";
                beneficioAplicado = $"{meses} mes(es) gratis agregados. Nueva expiración: {tenant.FechaExpiracion:yyyy-MM-dd}";
                break;

            case TipoCupon.UpgradePlan:
                var planAnterior = tenant.PlanTipo;
                var upgradePlanCode = cupon.PlanObjetivo ?? "PRO";
                tenant.PlanTipo = upgradePlanCode;
                var upgradePlan = await db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Codigo == upgradePlanCode && p.Activo);
                if (upgradePlan != null) tenant.SubscriptionPlanId = upgradePlan.Id;
                var mesesUpgrade = cupon.MesesUpgrade ?? 1;
                var upgradeBase = tenant.FechaExpiracion ?? DateTime.UtcNow;
                if (upgradeBase < DateTime.UtcNow) upgradeBase = DateTime.UtcNow;
                tenant.FechaExpiracion = upgradeBase.AddMonths(mesesUpgrade);
                if (tenant.SubscriptionStatus == "Trial" || tenant.SubscriptionStatus == "Expired")
                    tenant.SubscriptionStatus = "Active";
                beneficioAplicado = $"Upgrade de {planAnterior ?? "N/A"} a {tenant.PlanTipo} por {mesesUpgrade} mes(es)";
                break;

            case TipoCupon.DescuentoPorcentaje:
                var porcentaje = cupon.DescuentoPorcentaje ?? 0;
                beneficioAplicado = $"Descuento de {porcentaje}% registrado (aplicar en Stripe)";
                break;

            case TipoCupon.PlanGratisPermanente:
                tenant.PlanTipo = "PRO";
                var freePlan = await db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Codigo == "PRO" && p.Activo);
                if (freePlan != null) tenant.SubscriptionPlanId = freePlan.Id;
                tenant.SubscriptionStatus = "Active";
                tenant.FechaExpiracion = null;
                beneficioAplicado = "Plan PRO permanente gratuito activado";
                break;

            default:
                return Results.BadRequest(new { message = "Tipo de cupón no reconocido" });
        }

        // Create redemption record
        var redencion = new CuponRedencion
        {
            CuponId = cupon.Id,
            TenantId = currentTenant.TenantId,
            FechaRedencion = DateTime.UtcNow,
            BeneficioAplicado = beneficioAplicado
        };

        db.CuponRedenciones.Add(redencion);
        cupon.UsosActuales++;
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            message = "Cupón redimido exitosamente",
            beneficio = beneficioAplicado,
            tipo = cupon.Tipo.ToString()
        });
    }
}

// DTOs
public class CuponCreateDto
{
    public string Nombre { get; set; } = "";
    [System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
    public TipoCupon Tipo { get; set; }
    public int? MesesGratis { get; set; }
    public string? PlanObjetivo { get; set; }
    public int? MesesUpgrade { get; set; }
    public decimal? DescuentoPorcentaje { get; set; }
    public int? MaxUsos { get; set; }
    public DateTime? FechaExpiracion { get; set; }
}

public class CuponUpdateDto
{
    public string? Nombre { get; set; }
    public int? MaxUsos { get; set; }
    public DateTime? FechaExpiracion { get; set; }
    public bool? Activo { get; set; }
}

public class RedimirCuponRequest
{
    public string Codigo { get; set; } = "";
}
