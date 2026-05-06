using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Usuarios.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileSupervisorEndpoints
{
    public static void MapMobileSupervisorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/supervisor")
            .RequireAuthorization()
            .WithTags("Supervisor")
            .WithOpenApi();

        // GET /api/mobile/supervisor/mis-vendedores
        group.MapGet("/mis-vendedores", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);

            // ADMIN/SUPER_ADMIN ven a TODOS los vendedores y supervisores del tenant;
            // SUPERVISOR ve solo a sus subordinados directos.
            var baseQuery = db.Usuarios
                .AsNoTracking()
                .Where(u => u.TenantId == tenant.TenantId && u.EliminadoEn == null);

            if (tenant.IsAdmin || tenant.IsSuperAdmin)
            {
                // Excluir a uno mismo y a otros admins; mostrar supervisores y vendedores
                baseQuery = baseQuery.Where(u =>
                    u.Id != supervisorId
                    && u.RolExplicito != RoleNames.Admin
                    && u.RolExplicito != RoleNames.SuperAdmin);
            }
            else
            {
                baseQuery = baseQuery.Where(u => u.SupervisorId == supervisorId);
            }

            var vendedoresBase = await baseQuery
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Email,
                    Rol = u.RolExplicito ?? RoleNames.Vendedor,
                    u.Activo,
                    u.AvatarUrl
                })
                .ToListAsync();

            // Calcular IsOnline real: último GPS ping en los últimos 15 min.
            // Antes el frontend mostraba un punto verde basado en `activo` (= cuenta
            // no eliminada), lo cual marcaba a TODOS los vendedores como "en línea"
            // aunque no estuvieran trabajando. Reportado por admin@jeyma.com 2026-05-02.
            var threshold = DateTime.UtcNow.AddMinutes(-15);
            var idsList = vendedoresBase.Select(v => v.Id).ToList();
            var lastPings = await db.UbicacionesVendedor
                .AsNoTracking()
                .Where(p => p.TenantId == tenant.TenantId && idsList.Contains(p.UsuarioId))
                .GroupBy(p => p.UsuarioId)
                .Select(g => new { UsuarioId = g.Key, UltimoPing = g.Max(p => p.CapturadoEn) })
                .ToDictionaryAsync(x => x.UsuarioId, x => (DateTime?)x.UltimoPing);

            var vendedores = vendedoresBase.Select(v => new
            {
                v.Id,
                v.Nombre,
                v.Email,
                v.Rol,
                v.Activo,           // estado de cuenta (legacy field, sigue para retrocompat)
                v.AvatarUrl,
                IsOnline = lastPings.TryGetValue(v.Id, out var p) && p.HasValue && p.Value >= threshold,
                UltimoPing = lastPings.TryGetValue(v.Id, out var pp) ? pp : null
            }).ToList();

            return Results.Ok(new { success = true, data = vendedores, count = vendedores.Count });
        })
        .WithSummary("Mis vendedores")
        .WithDescription("Obtiene los vendedores asignados al supervisor autenticado.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/supervisor/dashboard
        group.MapGet("/dashboard", async (
            ICurrentTenant tenant,
            ITenantTimeZoneService tenantTzSvc,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            // Ventanas en TZ tenant — antes "hoy" y "mes" filtraban por
            // calendario UTC del servidor, lo que excluía pedidos de TZ
            // negativas en rangos al límite del día/mes.
            var hoyTenant = await tenantTzSvc.GetTenantTodayAsync();
            var (hoyStartUtc, hoyEndUtc) = await tenantTzSvc.GetTenantDayWindowUtcAsync(hoyTenant);
            var mesStart = new DateOnly(hoyTenant.Year, hoyTenant.Month, 1);
            var mesEnd = mesStart.AddMonths(1);
            var mesStartUtc = await tenantTzSvc.ConvertTenantDateToUtcAsync(mesStart);
            var mesEndUtc = await tenantTzSvc.ConvertTenantDateToUtcAsync(mesEnd);

            List<int> allIds;
            if (tenant.IsAdmin || tenant.IsSuperAdmin)
            {
                allIds = await db.Usuarios.AsNoTracking()
                    .Where(u => u.TenantId == tenant.TenantId && u.EliminadoEn == null && u.Activo)
                    .Select(u => u.Id).ToListAsync();
            }
            else
            {
                var subordinadoIds = await db.Usuarios.AsNoTracking()
                    .Where(u => u.SupervisorId == supervisorId && u.TenantId == tenant.TenantId && u.EliminadoEn == null)
                    .Select(u => u.Id).ToListAsync();
                allIds = new List<int>(subordinadoIds) { supervisorId };
            }

            var pedidosHoy = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= hoyStartUtc && p.FechaPedido < hoyEndUtc
                         && p.Activo)
                .CountAsync();

            var pedidosMes = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= mesStartUtc && p.FechaPedido < mesEndUtc
                         && p.Activo)
                .CountAsync();

            var totalClientes = await db.Clientes
                .AsNoTracking()
                .Where(c => c.VendedorId.HasValue
                         && allIds.Contains(c.VendedorId.Value)
                         && c.TenantId == tenant.TenantId
                         && c.EliminadoEn == null)
                .CountAsync();

            var ventasMes = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= mesStartUtc && p.FechaPedido < mesEndUtc
                         && p.Activo)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var visitasHoy = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => allIds.Contains(v.UsuarioId)
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null
                         && v.FechaHoraInicio >= hoyStartUtc && v.FechaHoraInicio < hoyEndUtc
                         && v.EliminadoEn == null)
                .CountAsync();

            var visitasCompletadasHoy = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => allIds.Contains(v.UsuarioId)
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null
                         && v.FechaHoraInicio >= hoyStartUtc && v.FechaHoraInicio < hoyEndUtc
                         && v.FechaHoraFin != null
                         && v.EliminadoEn == null)
                .CountAsync();

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    totalVendedores = allIds.Count,
                    pedidosHoy,
                    pedidosMes,
                    totalClientes,
                    ventasMes,
                    visitasHoy,
                    visitasCompletadasHoy
                }
            });
        })
        .WithSummary("Dashboard supervisor")
        .WithDescription("KPIs del equipo del supervisor: pedidos, ventas, visitas, clientes.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/supervisor/ubicaciones
        group.MapGet("/ubicaciones", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);

            var subordinadoIds = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => u.Id)
                .ToListAsync();

            if (subordinadoIds.Count == 0)
                return Results.Ok(new { success = true, data = Array.Empty<object>(), count = 0 });

            // Get most recent visit with GPS per vendedor
            var ubicaciones = await db.ClienteVisitas
                .AsNoTracking()
                .Include(v => v.Cliente)
                .Where(v => subordinadoIds.Contains(v.UsuarioId)
                    && v.TenantId == tenant.TenantId
                    && v.LatitudInicio != null
                    && v.LongitudInicio != null)
                .GroupBy(v => v.UsuarioId)
                .Select(g => g.OrderByDescending(v => v.FechaHoraInicio).First())
                .ToListAsync();

            var userIds = ubicaciones.Select(u => u.UsuarioId).ToList();
            var usuarios = await db.Usuarios
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id) && u.Activo)
                .Select(u => new { u.Id, u.Nombre, u.AvatarUrl })
                .ToListAsync();

            var userMap = usuarios.ToDictionary(u => u.Id);

            var result = ubicaciones
                .Where(u => userMap.ContainsKey(u.UsuarioId))
                .Select(u => new
                {
                    usuarioId = u.UsuarioId,
                    nombre = userMap[u.UsuarioId].Nombre,
                    avatarUrl = userMap[u.UsuarioId].AvatarUrl,
                    latitud = u.LatitudInicio!.Value,
                    longitud = u.LongitudInicio!.Value,
                    fechaUbicacion = u.FechaHoraInicio,
                    clienteNombre = u.Cliente?.Nombre
                })
                .ToList();

            return Results.Ok(new { success = true, data = result, count = result.Count });
        })
        .WithSummary("Ubicaciones del equipo")
        .WithDescription("Última ubicación GPS conocida de cada vendedor del equipo (basado en check-ins de visitas).")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/supervisor/actividad
        group.MapGet("/actividad", async (
            ICurrentTenant tenant,
            ITenantTimeZoneService tenantTzSvc,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            // Ventana "hoy" en TZ tenant — antes filtraba por UTC.
            var (hoyStartUtc, hoyEndUtc) = await tenantTzSvc.GetTenantDayWindowUtcAsync();

            List<int> allIds;
            if (tenant.IsAdmin || tenant.IsSuperAdmin)
            {
                allIds = await db.Usuarios.AsNoTracking()
                    .Where(u => u.TenantId == tenant.TenantId && u.EliminadoEn == null && u.Activo)
                    .Select(u => u.Id).ToListAsync();
            }
            else
            {
                var subordinadoIds = await db.Usuarios.AsNoTracking()
                    .Where(u => u.SupervisorId == supervisorId && u.TenantId == tenant.TenantId && u.EliminadoEn == null)
                    .Select(u => u.Id).ToListAsync();
                allIds = new List<int>(subordinadoIds) { supervisorId };
            }

            // Recent orders today
            var pedidosRecientes = await db.Pedidos
                .AsNoTracking()
                .Include(p => p.Cliente)
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= hoyStartUtc && p.FechaPedido < hoyEndUtc
                         && p.Activo)
                .OrderByDescending(p => p.CreadoEn)
                .Take(20)
                .Select(p => new
                {
                    tipo = "pedido",
                    id = p.Id,
                    descripcion = $"Pedido #{p.NumeroPedido} — {p.Cliente!.Nombre}",
                    monto = p.Total,
                    estado = p.Estado,
                    fecha = p.CreadoEn,
                    usuarioId = p.UsuarioId
                })
                .ToListAsync();

            // Recent visits today
            var visitasRecientes = await db.ClienteVisitas
                .AsNoTracking()
                .Include(v => v.Cliente)
                .Where(v => allIds.Contains(v.UsuarioId)
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null
                         && v.FechaHoraInicio >= hoyStartUtc && v.FechaHoraInicio < hoyEndUtc
                         && v.EliminadoEn == null)
                .OrderByDescending(v => v.FechaHoraInicio)
                .Take(20)
                .Select(v => new
                {
                    tipo = "visita",
                    id = v.Id,
                    descripcion = $"Visita a {v.Cliente!.Nombre}",
                    monto = (decimal?)null,
                    estado = v.FechaHoraFin != null ? "completada" : "en_curso",
                    fecha = v.FechaHoraInicio,
                    usuarioId = v.UsuarioId
                })
                .ToListAsync();

            // Recent cobros today
            var cobrosRecientes = await db.Cobros
                .AsNoTracking()
                .Include(c => c.Cliente)
                .Where(c => allIds.Contains(c.UsuarioId)
                         && c.TenantId == tenant.TenantId
                         && c.FechaCobro >= hoyStartUtc && c.FechaCobro < hoyEndUtc
                         && c.Activo)
                .OrderByDescending(c => c.CreadoEn)
                .Take(10)
                .Select(c => new
                {
                    tipo = "cobro",
                    id = c.Id,
                    descripcion = $"Cobro de {c.Cliente!.Nombre}",
                    monto = (decimal?)c.Monto,
                    estado = "registrado",
                    fecha = c.CreadoEn,
                    usuarioId = c.UsuarioId
                })
                .ToListAsync();

            // Merge and sort by date
            var actividad = pedidosRecientes
                .Cast<object>()
                .Concat(visitasRecientes.Cast<object>())
                .Concat(cobrosRecientes.Cast<object>())
                .ToList();

            // Get user names for mapping
            var nombresUsuarios = await db.Usuarios
                .AsNoTracking()
                .Where(u => allIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Nombre })
                .ToDictionaryAsync(u => u.Id, u => u.Nombre);

            return Results.Ok(new { success = true, data = actividad, usuarios = nombresUsuarios, count = actividad.Count });
        })
        .WithSummary("Actividad del equipo")
        .WithDescription("Feed de actividad reciente del equipo hoy: pedidos, visitas, cobros.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/supervisor/vendedor/{id}/resumen?fecha=YYYY-MM-DD&rango=7d
        // - Sin params → resumen del día actual (TZ tenant)
        // - ?fecha=YYYY-MM-DD → resumen de ese día específico (TZ tenant)
        // - ?rango=7d → array `dias[]` con desglose de últimos 7 días
        group.MapGet("/vendedor/{id:int}/resumen", async (
            int id,
            string? fecha,
            string? rango,
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);

            // Resolver TZ del tenant (Mazatlan, CDMX, etc.) — Reportado prod
            // 2026-05-02 admin@jeyma.com: filtros UTC excluían pedidos del día
            // local en TZ negativa.
            var tenantTz = await db.CompanySettings
                .AsNoTracking()
                .Where(cs => cs.TenantId == tenant.TenantId)
                .Select(cs => cs.Timezone)
                .FirstOrDefaultAsync() ?? "America/Mexico_City";

            TimeZoneInfo tzInfo;
            try { tzInfo = TimeZoneInfo.FindSystemTimeZoneById(tenantTz); }
            catch { tzInfo = TimeZoneInfo.Utc; }

            // Helper: dado un día local (sin hora), retorna (startUtc, endUtc)
            // del rango [día 00:00 local, día siguiente 00:00 local).
            (DateTime, DateTime) RangoUtcDeDiaLocal(DateTime localDay)
            {
                var localDayStart = DateTime.SpecifyKind(localDay.Date, DateTimeKind.Unspecified);
                var localDayEnd = localDayStart.AddDays(1);
                var sUtc = TimeZoneInfo.ConvertTimeToUtc(localDayStart, tzInfo);
                var eUtc = TimeZoneInfo.ConvertTimeToUtc(localDayEnd, tzInfo);
                return (sUtc, eUtc);
            }

            // ADMIN/SUPER_ADMIN ven a cualquier vendedor del tenant; SUPERVISOR solo a sus subordinados.
            var vendedorQuery = db.Usuarios
                .AsNoTracking()
                .Where(u => u.Id == id
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null);
            if (!tenant.IsAdmin && !tenant.IsSuperAdmin)
                vendedorQuery = vendedorQuery.Where(u => u.SupervisorId == supervisorId);

            var vendedorBase = await vendedorQuery
                .Select(u => new { u.Id, u.Nombre, u.Email, u.AvatarUrl, u.Activo })
                .FirstOrDefaultAsync();

            if (vendedorBase == null)
                return Results.NotFound(new { success = false, message = "Vendedor no encontrado o no pertenece a tu equipo" });

            // Calcular IsOnline real (último GPS ping en últimos 15 min) — mismo
            // patrón que mis-vendedores. Reportado por admin@jeyma.com 2026-05-04:
            // el badge en vendor detail mostraba "Activo" siempre, debe mostrar
            // "En línea"/"Desconectado" según GPS real.
            var onlineThreshold = DateTime.UtcNow.AddMinutes(-15);
            var lastPing = await db.UbicacionesVendedor
                .AsNoTracking()
                .Where(p => p.TenantId == tenant.TenantId && p.UsuarioId == id)
                .OrderByDescending(p => p.CapturadoEn)
                .Select(p => (DateTime?)p.CapturadoEn)
                .FirstOrDefaultAsync();

            var vendedor = new
            {
                vendedorBase.Id,
                vendedorBase.Nombre,
                vendedorBase.Email,
                vendedorBase.AvatarUrl,
                vendedorBase.Activo,
                IsOnline = lastPing.HasValue && lastPing.Value >= onlineThreshold,
                UltimoPing = lastPing
            };

            var totalClientes = await db.Clientes
                .AsNoTracking()
                .Where(c => c.VendedorId == id
                         && c.TenantId == tenant.TenantId
                         && c.EliminadoEn == null)
                .CountAsync();

            // Última ubicación: leer de UbicacionesVendedor (GPS pings reales,
            // capturados cada acción + heartbeat 15min). Antes leía de
            // ClienteVisitas que solo se popula cuando vendedor hace check-in
            // explícito de visita — y no todos los movimientos son visitas.
            // Reportado prod 2026-05-04: vendedor1 trabajó días anteriores pero
            // "ÚLTIMA UBICACIÓN" decía vacío.
            // Fallback a ClienteVisitas si no hay pings (tenant sin tracking).
            var ultimaUbicacionPing = await db.UbicacionesVendedor
                .AsNoTracking()
                .Where(p => p.UsuarioId == id && p.TenantId == tenant.TenantId)
                .OrderByDescending(p => p.CapturadoEn)
                .Select(p => new
                {
                    latitud = p.Latitud,
                    longitud = p.Longitud,
                    fecha = (DateTime?)p.CapturadoEn,
                    clienteNombre = (string?)null
                })
                .FirstOrDefaultAsync();

            object? ultimaUbicacion = ultimaUbicacionPing;
            if (ultimaUbicacion == null)
            {
                var fallbackVisita = await db.ClienteVisitas
                    .AsNoTracking()
                    .Include(v => v.Cliente)
                    .Where(v => v.UsuarioId == id
                             && v.TenantId == tenant.TenantId
                             && v.LatitudInicio != null
                             && v.LongitudInicio != null)
                    .OrderByDescending(v => v.FechaHoraInicio)
                    .Select(v => new
                    {
                        latitud = (decimal)v.LatitudInicio!.Value,
                        longitud = (decimal)v.LongitudInicio!.Value,
                        fecha = v.FechaHoraInicio,
                        clienteNombre = v.Cliente!.Nombre
                    })
                    .FirstOrDefaultAsync();
                ultimaUbicacion = fallbackVisita;
            }

            // ── Modo `?rango=7d`: array de últimos 7 días ──
            if (rango == "7d")
            {
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo);
                var hoyLocal = localNow.Date;

                // Calcular ventana de 7 días [hoy-6, hoy+1) en UTC
                var (rangoStartUtc, _) = RangoUtcDeDiaLocal(hoyLocal.AddDays(-6));
                var (_, rangoEndUtc) = RangoUtcDeDiaLocal(hoyLocal);

                // Pull de pedidos / cobros / visitas del rango completo
                var pedidosRango = await db.Pedidos.AsNoTracking()
                    .Where(p => p.UsuarioId == id && p.TenantId == tenant.TenantId
                             && p.FechaPedido >= rangoStartUtc && p.FechaPedido < rangoEndUtc
                             && p.Activo)
                    .Select(p => new { p.FechaPedido, p.Total })
                    .ToListAsync();
                var cobrosRango = await db.Cobros.AsNoTracking()
                    .Where(c => c.UsuarioId == id && c.TenantId == tenant.TenantId
                             && c.FechaCobro >= rangoStartUtc && c.FechaCobro < rangoEndUtc
                             && c.Activo)
                    .Select(c => new { c.FechaCobro, c.Monto })
                    .ToListAsync();
                var visitasRango = await db.ClienteVisitas.AsNoTracking()
                    .Where(v => v.UsuarioId == id && v.TenantId == tenant.TenantId
                             && v.FechaHoraInicio != null
                             && v.FechaHoraInicio >= rangoStartUtc && v.FechaHoraInicio < rangoEndUtc
                             && v.EliminadoEn == null)
                    .Select(v => new { v.FechaHoraInicio, v.FechaHoraFin })
                    .ToListAsync();

                // Agrupar por día local del tenant
                var dias = new List<object>();
                for (int i = 0; i < 7; i++)
                {
                    var dia = hoyLocal.AddDays(-i);
                    var (dStart, dEnd) = RangoUtcDeDiaLocal(dia);
                    var pedidosDia = pedidosRango.Where(p => p.FechaPedido >= dStart && p.FechaPedido < dEnd).ToList();
                    var cobrosDia = cobrosRango.Where(c => c.FechaCobro >= dStart && c.FechaCobro < dEnd).ToList();
                    var visitasDia = visitasRango.Where(v => v.FechaHoraInicio >= dStart && v.FechaHoraInicio < dEnd).ToList();
                    dias.Add(new
                    {
                        fecha = dia.ToString("yyyy-MM-dd"),
                        pedidos = pedidosDia.Count,
                        ventas = pedidosDia.Sum(p => p.Total),
                        cobros = cobrosDia.Sum(c => c.Monto),
                        visitas = visitasDia.Count,
                        visitasCompletadas = visitasDia.Count(v => v.FechaHoraFin != null)
                    });
                }

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        vendedor,
                        rango = "7d",
                        hoy = (object?)null,
                        dias,
                        totalClientes,
                        ultimaUbicacion
                    }
                });
            }

            // ── Modo single-day (default = hoy, o ?fecha=YYYY-MM-DD) ──
            DateTime diaLocal;
            if (!string.IsNullOrEmpty(fecha) && DateTime.TryParseExact(fecha, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var fParsed))
            {
                diaLocal = fParsed;
            }
            else
            {
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo);
                diaLocal = localNow.Date;
            }

            var (startUtc, endUtc) = RangoUtcDeDiaLocal(diaLocal);

            var pedidosCount = await db.Pedidos
                .AsNoTracking()
                .Where(p => p.UsuarioId == id
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= startUtc && p.FechaPedido < endUtc
                         && p.Activo)
                .CountAsync();

            var ventasTotal = await db.Pedidos
                .AsNoTracking()
                .Where(p => p.UsuarioId == id
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= startUtc && p.FechaPedido < endUtc
                         && p.Activo)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var visitasCount = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => v.UsuarioId == id
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null
                         && v.FechaHoraInicio >= startUtc && v.FechaHoraInicio < endUtc
                         && v.EliminadoEn == null)
                .CountAsync();

            var visitasCompletadas = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => v.UsuarioId == id
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null
                         && v.FechaHoraInicio >= startUtc && v.FechaHoraInicio < endUtc
                         && v.FechaHoraFin != null
                         && v.EliminadoEn == null)
                .CountAsync();

            var cobrosTotal = await db.Cobros
                .AsNoTracking()
                .Where(c => c.UsuarioId == id
                         && c.TenantId == tenant.TenantId
                         && c.FechaCobro >= startUtc && c.FechaCobro < endUtc
                         && c.Activo)
                .SumAsync(c => (decimal?)c.Monto) ?? 0;

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    vendedor,
                    rango = "dia",
                    fecha = diaLocal.ToString("yyyy-MM-dd"),
                    hoy = new
                    {
                        pedidos = pedidosCount,
                        ventas = ventasTotal,
                        visitas = visitasCount,
                        visitasCompletadas,
                        cobros = cobrosTotal
                    },
                    dias = (object?)null,
                    totalClientes,
                    ultimaUbicacion
                }
            });
        })
        .WithSummary("Resumen de vendedor")
        .WithDescription("KPIs del día y última ubicación de un vendedor específico del equipo.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // GET /api/mobile/supervisor/resumen-tenant — agregados de TODO el tenant
        // para admins. Permite a ADMIN/SUPER_ADMIN ver "lo que se vendió hoy" sin
        // tener que sincronizar la data de todos los vendedores en WatermelonDB.
        // Reportado prod 2026-05-02 por admin@jeyma.com: solo veía sus propias
        // ventas (que eran 0) en vez del agregado del tenant (17 pedidos hoy).
        group.MapGet("/resumen-tenant", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            // Calcular ventana UTC del día local del tenant (TZ-aware).
            var tenantTz = await db.CompanySettings
                .AsNoTracking()
                .Where(cs => cs.TenantId == tenant.TenantId)
                .Select(cs => cs.Timezone)
                .FirstOrDefaultAsync() ?? "America/Mexico_City";
            DateTime startUtc, endUtc;
            try
            {
                var tzInfo = TimeZoneInfo.FindSystemTimeZoneById(tenantTz);
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo);
                var localDayStart = DateTime.SpecifyKind(localNow.Date, DateTimeKind.Unspecified);
                var localDayEnd = localDayStart.AddDays(1);
                startUtc = TimeZoneInfo.ConvertTimeToUtc(localDayStart, tzInfo);
                endUtc = TimeZoneInfo.ConvertTimeToUtc(localDayEnd, tzInfo);
            }
            catch
            {
                startUtc = DateTime.UtcNow.Date;
                endUtc = startUtc.AddDays(1);
            }

            var pedidosCount = await db.Pedidos.AsNoTracking()
                .CountAsync(p => p.TenantId == tenant.TenantId
                              && p.FechaPedido >= startUtc && p.FechaPedido < endUtc
                              && p.Activo);
            var pedidosTotal = await db.Pedidos.AsNoTracking()
                .Where(p => p.TenantId == tenant.TenantId
                         && p.FechaPedido >= startUtc && p.FechaPedido < endUtc
                         && p.Activo)
                .SumAsync(p => (decimal?)p.Total) ?? 0;
            var cobrosCount = await db.Cobros.AsNoTracking()
                .CountAsync(c => c.TenantId == tenant.TenantId
                              && c.FechaCobro >= startUtc && c.FechaCobro < endUtc
                              && c.Activo);
            var cobrosTotal = await db.Cobros.AsNoTracking()
                .Where(c => c.TenantId == tenant.TenantId
                         && c.FechaCobro >= startUtc && c.FechaCobro < endUtc
                         && c.Activo)
                .SumAsync(c => (decimal?)c.Monto) ?? 0;
            var visitasCount = await db.ClienteVisitas.AsNoTracking()
                .CountAsync(v => v.TenantId == tenant.TenantId
                              && v.FechaHoraInicio != null
                              && v.FechaHoraInicio >= startUtc && v.FechaHoraInicio < endUtc
                              && v.EliminadoEn == null);

            // # vendedores con al menos 1 ping en el día (vendedores "trabajando hoy")
            var vendedoresActivos = await db.UbicacionesVendedor.AsNoTracking()
                .Where(u => u.TenantId == tenant.TenantId
                         && u.CapturadoEn >= startUtc && u.CapturadoEn < endUtc)
                .Select(u => u.UsuarioId)
                .Distinct()
                .CountAsync();

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    pedidosCount,
                    pedidosTotal,
                    cobrosCount,
                    cobrosTotal,
                    visitasCount,
                    vendedoresActivos
                }
            });
        })
        .WithSummary("Resumen tenant del día")
        .WithDescription("Agregados (count + total) de todo el tenant para admins. Calcula 'hoy' en TZ del tenant.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status403Forbidden);

        // GET /api/mobile/supervisor/pedidos?dia=YYYY-MM-DD&rango=7d|30d&page=1&pageSize=20
        // Lista paginada de TODOS los pedidos del tenant (admin/super_admin) o
        // del equipo del supervisor. Incluye nombre del vendedor que lo creó.
        // - sin params: hoy (default)
        // - ?dia=YYYY-MM-DD: día específico (ej. "ayer")
        // - ?rango=7d: últimos 7 días (incluye hoy)
        // - ?rango=30d: últimos 30 días
        // Reportado por admin@jeyma.com 2026-05-04: tab Vender vacío para admin
        // porque WatermelonDB local solo sincroniza pedidos del usuario actual.
        group.MapGet("/pedidos", async (
            string? dia,
            string? rango,
            int? page,
            int? pageSize,
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            var p = Math.Max(1, page ?? 1);
            var ps = Math.Clamp(pageSize ?? 20, 1, 100);

            var tenantTz = await db.CompanySettings
                .AsNoTracking()
                .Where(cs => cs.TenantId == tenant.TenantId)
                .Select(cs => cs.Timezone)
                .FirstOrDefaultAsync() ?? "America/Mexico_City";

            TimeZoneInfo tzInfo;
            try { tzInfo = TimeZoneInfo.FindSystemTimeZoneById(tenantTz); }
            catch { tzInfo = TimeZoneInfo.Utc; }

            // Calcular [startUtc, endUtc) según preset:
            // - rango=7d: [hoy-6, hoy+1)
            // - rango=30d: [hoy-29, hoy+1)
            // - dia=YYYY-MM-DD: [dia, dia+1)
            // - default: [hoy, hoy+1)
            DateTime startUtc, endUtc;
            var hoyLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo).Date;
            if (rango == "7d" || rango == "30d")
            {
                var diasBack = rango == "30d" ? 29 : 6;
                var rangeStart = DateTime.SpecifyKind(hoyLocal.AddDays(-diasBack), DateTimeKind.Unspecified);
                var rangeEnd = DateTime.SpecifyKind(hoyLocal.AddDays(1), DateTimeKind.Unspecified);
                startUtc = TimeZoneInfo.ConvertTimeToUtc(rangeStart, tzInfo);
                endUtc = TimeZoneInfo.ConvertTimeToUtc(rangeEnd, tzInfo);
            }
            else
            {
                DateTime diaLocal;
                if (!string.IsNullOrEmpty(dia) && DateTime.TryParseExact(dia, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var fParsed))
                    diaLocal = fParsed;
                else
                    diaLocal = hoyLocal;
                var localStart = DateTime.SpecifyKind(diaLocal, DateTimeKind.Unspecified);
                startUtc = TimeZoneInfo.ConvertTimeToUtc(localStart, tzInfo);
                endUtc = TimeZoneInfo.ConvertTimeToUtc(localStart.AddDays(1), tzInfo);
            }

            // Para SUPERVISOR: limitar a sus subordinados; ADMIN/SUPER_ADMIN: tenant-wide.
            var pedidosQuery = db.Pedidos.AsNoTracking()
                .Where(pe => pe.TenantId == tenant.TenantId
                          && pe.FechaPedido >= startUtc && pe.FechaPedido < endUtc
                          && pe.Activo);

            if (!tenant.IsAdmin && !tenant.IsSuperAdmin)
            {
                var subordinadosIds = await db.Usuarios.AsNoTracking()
                    .Where(u => u.SupervisorId == supervisorId && u.TenantId == tenant.TenantId && u.EliminadoEn == null)
                    .Select(u => u.Id).ToListAsync();
                subordinadosIds.Add(supervisorId);
                pedidosQuery = pedidosQuery.Where(pe => subordinadosIds.Contains(pe.UsuarioId));
            }

            var total = await pedidosQuery.CountAsync();
            var pedidos = await pedidosQuery
                .OrderByDescending(pe => pe.FechaPedido)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(pe => new
                {
                    id = pe.Id,
                    clienteId = pe.ClienteId,
                    clienteNombre = pe.Cliente!.Nombre,
                    monto = pe.Total,
                    fecha = pe.FechaPedido,
                    usuarioId = pe.UsuarioId,
                    usuarioNombre = pe.Usuario!.Nombre,
                    estado = pe.Estado.ToString()
                })
                .ToListAsync();

            return Results.Ok(new
            {
                success = true,
                data = pedidos,
                total,
                page = p,
                pageSize = ps,
                hasMore = p * ps < total
            });
        })
        .WithSummary("Lista de pedidos del tenant (admin/supervisor)")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status403Forbidden);

        // GET /api/mobile/supervisor/cobros?dia=YYYY-MM-DD&rango=7d|30d&page=1&pageSize=20
        // Misma lógica que /pedidos pero para cobros.
        group.MapGet("/cobros", async (
            string? dia,
            string? rango,
            int? page,
            int? pageSize,
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor && !tenant.IsAdmin && !tenant.IsSuperAdmin)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            var p = Math.Max(1, page ?? 1);
            var ps = Math.Clamp(pageSize ?? 20, 1, 100);

            var tenantTz = await db.CompanySettings
                .AsNoTracking()
                .Where(cs => cs.TenantId == tenant.TenantId)
                .Select(cs => cs.Timezone)
                .FirstOrDefaultAsync() ?? "America/Mexico_City";

            TimeZoneInfo tzInfo;
            try { tzInfo = TimeZoneInfo.FindSystemTimeZoneById(tenantTz); }
            catch { tzInfo = TimeZoneInfo.Utc; }

            DateTime startUtc, endUtc;
            var hoyLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo).Date;
            if (rango == "7d" || rango == "30d")
            {
                var diasBack = rango == "30d" ? 29 : 6;
                var rangeStart = DateTime.SpecifyKind(hoyLocal.AddDays(-diasBack), DateTimeKind.Unspecified);
                var rangeEnd = DateTime.SpecifyKind(hoyLocal.AddDays(1), DateTimeKind.Unspecified);
                startUtc = TimeZoneInfo.ConvertTimeToUtc(rangeStart, tzInfo);
                endUtc = TimeZoneInfo.ConvertTimeToUtc(rangeEnd, tzInfo);
            }
            else
            {
                DateTime diaLocal;
                if (!string.IsNullOrEmpty(dia) && DateTime.TryParseExact(dia, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var fParsed))
                    diaLocal = fParsed;
                else
                    diaLocal = hoyLocal;
                var localStart = DateTime.SpecifyKind(diaLocal, DateTimeKind.Unspecified);
                startUtc = TimeZoneInfo.ConvertTimeToUtc(localStart, tzInfo);
                endUtc = TimeZoneInfo.ConvertTimeToUtc(localStart.AddDays(1), tzInfo);
            }

            var cobrosQuery = db.Cobros.AsNoTracking()
                .Where(co => co.TenantId == tenant.TenantId
                          && co.FechaCobro >= startUtc && co.FechaCobro < endUtc
                          && co.Activo);

            if (!tenant.IsAdmin && !tenant.IsSuperAdmin)
            {
                var subordinadosIds = await db.Usuarios.AsNoTracking()
                    .Where(u => u.SupervisorId == supervisorId && u.TenantId == tenant.TenantId && u.EliminadoEn == null)
                    .Select(u => u.Id).ToListAsync();
                subordinadosIds.Add(supervisorId);
                cobrosQuery = cobrosQuery.Where(co => subordinadosIds.Contains(co.UsuarioId));
            }

            var total = await cobrosQuery.CountAsync();
            var cobros = await cobrosQuery
                .OrderByDescending(co => co.FechaCobro)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(co => new
                {
                    id = co.Id,
                    clienteId = co.ClienteId,
                    clienteNombre = co.Cliente!.Nombre,
                    monto = co.Monto,
                    fecha = co.FechaCobro,
                    usuarioId = co.UsuarioId,
                    usuarioNombre = co.Usuario!.Nombre,
                    metodoPago = co.MetodoPago.ToString()
                })
                .ToListAsync();

            return Results.Ok(new
            {
                success = true,
                data = cobros,
                total,
                page = p,
                pageSize = ps,
                hasMore = p * ps < total
            });
        })
        .WithSummary("Lista de cobros del tenant (admin/supervisor)")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status403Forbidden);
    }
}
