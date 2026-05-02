using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Billing;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileEmpresaEndpoints
{
    public static void MapMobileEmpresaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/empresa")
            .RequireAuthorization()
            .WithTags("Empresa")
            .WithOpenApi();

        group.MapGet("/", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            var tenantId = tenant.TenantId;

            var datos = await db.Set<HandySuites.Domain.Entities.DatosEmpresa>()
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.TenantId == tenantId);

            var settings = await db.Set<HandySuites.Domain.Entities.CompanySetting>()
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            if (datos == null)
                return Results.NotFound(new { success = false, message = "Datos de empresa no configurados" });

            var country = settings?.Country ?? "MX";

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    razonSocial = datos.RazonSocial,
                    // identificadorFiscal: nombre canónico genérico (RFC en MX, NIT en CO, etc.).
                    // rfc se mantiene como alias para versiones viejas del cliente mobile que aún lo leen.
                    identificadorFiscal = datos.IdentificadorFiscal,
                    rfc = datos.IdentificadorFiscal,
                    telefono = datos.Telefono,
                    email = datos.Email,
                    contacto = datos.Contacto,
                    direccion = datos.Direccion,
                    ciudad = datos.Ciudad,
                    estado = datos.Estado,
                    codigoPostal = datos.CodigoPostal,
                    sitioWeb = datos.SitioWeb,
                    logoUrl = settings?.LogoUrl,
                    country,
                    billingEnabled = BillingCountrySupport.IsSupported(country),
                    timezone = settings?.Timezone ?? "America/Mexico_City",
                    currency = settings?.Currency ?? "MXN",
                    language = settings?.Language ?? "es",
                    // Horario laboral configurado por el admin para el tracking GPS.
                    // Mobile usa estos valores en useHorarioLaboralWatcher para
                    // detener jornada automáticamente al salir del rango.
                    // Obligatorio — siempre tiene valor (default 08:00–18:00 L–V).
                    horaInicioJornada = (settings?.HoraInicioJornada ?? new TimeOnly(8, 0)).ToString("HH:mm"),
                    horaFinJornada = (settings?.HoraFinJornada ?? new TimeOnly(18, 0)).ToString("HH:mm"),
                    diasLaborables = settings?.DiasLaborables ?? "1,2,3,4,5", // CSV "1,2,3,4,5"
                }
            });
        })
        .WithSummary("Datos de la empresa")
        .WithDescription("Obtiene datos fiscales y de contacto de la empresa del tenant actual. Usado para tickets e impresión.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);
    }
}
