using HandySales.Application.Usuarios.DTOs;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Mobile.Api.Endpoints;

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
            HandySalesDbContext db) =>
        {
            if (!tenant.IsSupervisor)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);

            var vendedores = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Email,
                    Rol = u.RolExplicito ?? (u.EsSuperAdmin ? "SUPER_ADMIN" : u.EsAdmin ? "ADMIN" : "VENDEDOR"),
                    u.Activo,
                    u.AvatarUrl
                })
                .ToListAsync();

            return Results.Ok(new { success = true, data = vendedores, count = vendedores.Count });
        })
        .WithSummary("Mis vendedores")
        .WithDescription("Obtiene los vendedores asignados al supervisor autenticado.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/supervisor/dashboard
        group.MapGet("/dashboard", async (
            ICurrentTenant tenant,
            HandySalesDbContext db) =>
        {
            if (!tenant.IsSupervisor)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            var hoy = DateTime.UtcNow.Date;

            var subordinadoIds = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => u.Id)
                .ToListAsync();

            var allIds = new List<int>(subordinadoIds) { supervisorId };

            var pedidosHoy = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido.Date == hoy
                         && p.Activo)
                .CountAsync();

            var pedidosMes = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido.Month == hoy.Month
                         && p.FechaPedido.Year == hoy.Year
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
                         && p.FechaPedido.Month == hoy.Month
                         && p.FechaPedido.Year == hoy.Year
                         && p.Activo)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var visitasHoy = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => allIds.Contains(v.UsuarioId)
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == hoy
                         && v.EliminadoEn == null)
                .CountAsync();

            var visitasCompletadasHoy = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => allIds.Contains(v.UsuarioId)
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == hoy
                         && v.FechaHoraFin != null
                         && v.EliminadoEn == null)
                .CountAsync();

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    totalVendedores = subordinadoIds.Count,
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
            HandySalesDbContext db) =>
        {
            if (!tenant.IsSupervisor)
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
            HandySalesDbContext db) =>
        {
            if (!tenant.IsSupervisor)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            var hoy = DateTime.UtcNow.Date;

            var subordinadoIds = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => u.Id)
                .ToListAsync();

            var allIds = new List<int>(subordinadoIds) { supervisorId };

            // Recent orders today
            var pedidosRecientes = await db.Pedidos
                .AsNoTracking()
                .Include(p => p.Cliente)
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido.Date == hoy
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
                         && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == hoy
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
                         && c.FechaCobro.Date == hoy
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

        // GET /api/mobile/supervisor/vendedor/{id}/resumen
        group.MapGet("/vendedor/{id:int}/resumen", async (
            int id,
            ICurrentTenant tenant,
            HandySalesDbContext db) =>
        {
            if (!tenant.IsSupervisor)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            var hoy = DateTime.UtcNow.Date;

            // Verify this vendedor belongs to this supervisor
            var vendedor = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.Id == id
                         && u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => new { u.Id, u.Nombre, u.Email, u.AvatarUrl, u.Activo })
                .FirstOrDefaultAsync();

            if (vendedor == null)
                return Results.NotFound(new { success = false, message = "Vendedor no encontrado o no pertenece a tu equipo" });

            var pedidosHoy = await db.Pedidos
                .AsNoTracking()
                .Where(p => p.UsuarioId == id
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido.Date == hoy
                         && p.Activo)
                .CountAsync();

            var ventasHoy = await db.Pedidos
                .AsNoTracking()
                .Where(p => p.UsuarioId == id
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido.Date == hoy
                         && p.Activo)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var visitasHoy = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => v.UsuarioId == id
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == hoy
                         && v.EliminadoEn == null)
                .CountAsync();

            var visitasCompletadas = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => v.UsuarioId == id
                         && v.TenantId == tenant.TenantId
                         && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == hoy
                         && v.FechaHoraFin != null
                         && v.EliminadoEn == null)
                .CountAsync();

            var cobrosHoy = await db.Cobros
                .AsNoTracking()
                .Where(c => c.UsuarioId == id
                         && c.TenantId == tenant.TenantId
                         && c.FechaCobro.Date == hoy
                         && c.Activo)
                .SumAsync(c => (decimal?)c.Monto) ?? 0;

            var totalClientes = await db.Clientes
                .AsNoTracking()
                .Where(c => c.VendedorId == id
                         && c.TenantId == tenant.TenantId
                         && c.EliminadoEn == null)
                .CountAsync();

            // Last known location
            var ultimaUbicacion = await db.ClienteVisitas
                .AsNoTracking()
                .Include(v => v.Cliente)
                .Where(v => v.UsuarioId == id
                         && v.TenantId == tenant.TenantId
                         && v.LatitudInicio != null
                         && v.LongitudInicio != null)
                .OrderByDescending(v => v.FechaHoraInicio)
                .Select(v => new
                {
                    latitud = v.LatitudInicio!.Value,
                    longitud = v.LongitudInicio!.Value,
                    fecha = v.FechaHoraInicio,
                    clienteNombre = v.Cliente!.Nombre
                })
                .FirstOrDefaultAsync();

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    vendedor,
                    hoy = new
                    {
                        pedidos = pedidosHoy,
                        ventas = ventasHoy,
                        visitas = visitasHoy,
                        visitasCompletadas,
                        cobros = cobrosHoy
                    },
                    totalClientes,
                    ultimaUbicacion
                }
            });
        })
        .WithSummary("Resumen de vendedor")
        .WithDescription("KPIs del día y última ubicación de un vendedor específico del equipo.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);
    }
}
