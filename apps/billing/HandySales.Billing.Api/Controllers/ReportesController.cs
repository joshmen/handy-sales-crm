using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySales.Billing.Api.Data;

namespace HandySales.Billing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<ReportesController> _logger;

    public ReportesController(BillingDbContext context, ILogger<ReportesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private string GetTenantId() => User.FindFirst("TenantId")?.Value ?? "00000000-0000-0000-0000-000000000001";

    [HttpGet("dashboard")]
    public async Task<ActionResult<BillingDashboardDto>> GetDashboard(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin)
    {
        var tenantId = GetTenantId();
        var inicio = fechaInicio ?? DateTime.UtcNow.AddDays(-30);
        var fin = fechaFin ?? DateTime.UtcNow;

        var facturas = await _context.Facturas
            .Where(f => f.TenantId == tenantId 
                && f.FechaEmision >= inicio 
                && f.FechaEmision <= fin)
            .ToListAsync();

        var dashboard = new BillingDashboardDto
        {
            TotalFacturas = facturas.Count,
            FacturasTimbradas = facturas.Count(f => f.Estado == "TIMBRADA"),
            FacturasPendientes = facturas.Count(f => f.Estado == "PENDIENTE"),
            FacturasCanceladas = facturas.Count(f => f.Estado == "CANCELADA"),
            
            MontoTotal = facturas.Where(f => f.Estado == "TIMBRADA").Sum(f => f.Total),
            MontoSubtotal = facturas.Where(f => f.Estado == "TIMBRADA").Sum(f => f.Subtotal),
            MontoIva = facturas.Where(f => f.Estado == "TIMBRADA").Sum(f => f.TotalImpuestosTrasladados),
            
            FacturasPorDia = facturas
                .Where(f => f.Estado == "TIMBRADA")
                .GroupBy(f => f.FechaEmision.Date)
                .Select(g => new FacturasPorDiaDto
                {
                    Fecha = g.Key,
                    Cantidad = g.Count(),
                    Monto = g.Sum(f => f.Total)
                })
                .OrderBy(x => x.Fecha)
                .ToList(),
                
            TopClientes = facturas
                .Where(f => f.Estado == "TIMBRADA")
                .GroupBy(f => new { f.ReceptorRfc, f.ReceptorNombre })
                .Select(g => new ClienteFacturacionDto
                {
                    Rfc = g.Key.ReceptorRfc,
                    Nombre = g.Key.ReceptorNombre,
                    TotalFacturas = g.Count(),
                    MontoTotal = g.Sum(f => f.Total)
                })
                .OrderByDescending(x => x.MontoTotal)
                .Take(10)
                .ToList()
        };

        return Ok(dashboard);
    }

    [HttpGet("ventas-por-periodo")]
    public async Task<ActionResult<IEnumerable<VentasPorPeriodoDto>>> GetVentasPorPeriodo(
        [FromQuery] DateTime fechaInicio,
        [FromQuery] DateTime fechaFin,
        [FromQuery] string agrupacion = "dia") // dia, semana, mes
    {
        var tenantId = GetTenantId();

        var facturas = await _context.Facturas
            .Where(f => f.TenantId == tenantId 
                && f.Estado == "TIMBRADA"
                && f.FechaEmision >= fechaInicio 
                && f.FechaEmision <= fechaFin)
            .ToListAsync();

        IEnumerable<VentasPorPeriodoDto> ventas = agrupacion.ToLower() switch
        {
            "semana" => facturas
                .GroupBy(f => GetWeekStart(f.FechaEmision))
                .Select(g => new VentasPorPeriodoDto
                {
                    Periodo = g.Key.ToString("yyyy-MM-dd"),
                    Cantidad = g.Count(),
                    Subtotal = g.Sum(f => f.Subtotal),
                    Impuestos = g.Sum(f => f.TotalImpuestosTrasladados),
                    Total = g.Sum(f => f.Total)
                }),
            "mes" => facturas
                .GroupBy(f => new DateTime(f.FechaEmision.Year, f.FechaEmision.Month, 1))
                .Select(g => new VentasPorPeriodoDto
                {
                    Periodo = g.Key.ToString("yyyy-MM"),
                    Cantidad = g.Count(),
                    Subtotal = g.Sum(f => f.Subtotal),
                    Impuestos = g.Sum(f => f.TotalImpuestosTrasladados),
                    Total = g.Sum(f => f.Total)
                }),
            _ => facturas
                .GroupBy(f => f.FechaEmision.Date)
                .Select(g => new VentasPorPeriodoDto
                {
                    Periodo = g.Key.ToString("yyyy-MM-dd"),
                    Cantidad = g.Count(),
                    Subtotal = g.Sum(f => f.Subtotal),
                    Impuestos = g.Sum(f => f.TotalImpuestosTrasladados),
                    Total = g.Sum(f => f.Total)
                })
        };

        return Ok(ventas.OrderBy(v => v.Periodo));
    }

    [HttpGet("clientes-facturacion")]
    public async Task<ActionResult<IEnumerable<ClienteFacturacionDto>>> GetClientesFacturacion(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin,
        [FromQuery] int top = 50)
    {
        var tenantId = GetTenantId();
        var inicio = fechaInicio ?? DateTime.UtcNow.AddDays(-90);
        var fin = fechaFin ?? DateTime.UtcNow;

        var clientes = await _context.Facturas
            .Where(f => f.TenantId == tenantId 
                && f.Estado == "TIMBRADA"
                && f.FechaEmision >= inicio 
                && f.FechaEmision <= fin)
            .GroupBy(f => new { f.ReceptorRfc, f.ReceptorNombre })
            .Select(g => new ClienteFacturacionDto
            {
                Rfc = g.Key.ReceptorRfc,
                Nombre = g.Key.ReceptorNombre,
                TotalFacturas = g.Count(),
                MontoTotal = g.Sum(f => f.Total),
                UltimaFactura = g.Max(f => f.FechaEmision)
            })
            .OrderByDescending(c => c.MontoTotal)
            .Take(top)
            .ToListAsync();

        return Ok(clientes);
    }

    [HttpGet("estados-factura")]
    public async Task<ActionResult<IEnumerable<EstadoFacturaDto>>> GetEstadosFactura(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin)
    {
        var tenantId = GetTenantId();
        var inicio = fechaInicio ?? DateTime.UtcNow.AddDays(-30);
        var fin = fechaFin ?? DateTime.UtcNow;

        var estados = await _context.Facturas
            .Where(f => f.TenantId == tenantId 
                && f.FechaEmision >= inicio 
                && f.FechaEmision <= fin)
            .GroupBy(f => f.Estado)
            .Select(g => new EstadoFacturaDto
            {
                Estado = g.Key,
                Cantidad = g.Count(),
                MontoTotal = g.Sum(f => f.Total)
            })
            .ToListAsync();

        return Ok(estados);
    }

    [HttpGet("auditoria")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<IEnumerable<AuditoriaDto>>> GetAuditoria(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin,
        [FromQuery] string? accion,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var tenantId = GetTenantId();
        var inicio = fechaInicio ?? DateTime.UtcNow.AddDays(-7);
        var fin = fechaFin ?? DateTime.UtcNow;

        var query = _context.AuditoriaFacturacion
            .Where(a => a.TenantId == tenantId 
                && a.CreatedAt >= inicio 
                && a.CreatedAt <= fin);

        if (!string.IsNullOrEmpty(accion))
            query = query.Where(a => a.Accion == accion);

        var total = await query.CountAsync();

        var auditoria = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditoriaDto
            {
                Id = a.Id,
                FacturaId = a.FacturaId,
                Accion = a.Accion,
                Descripcion = a.Descripcion,
                UsuarioId = a.UsuarioId,
                IpAddress = a.IpAddress,
                FechaHora = a.CreatedAt
            })
            .ToListAsync();

        Response.Headers.Append("X-Total-Count", total.ToString());

        return Ok(auditoria);
    }

    private DateTime GetWeekStart(DateTime date)
    {
        int diff = date.DayOfWeek - DayOfWeek.Monday;
        if (diff < 0) diff += 7;
        return date.AddDays(-1 * diff).Date;
    }
}

// DTOs para Reportes
public class BillingDashboardDto
{
    public int TotalFacturas { get; set; }
    public int FacturasTimbradas { get; set; }
    public int FacturasPendientes { get; set; }
    public int FacturasCanceladas { get; set; }
    public decimal MontoTotal { get; set; }
    public decimal MontoSubtotal { get; set; }
    public decimal MontoIva { get; set; }
    public List<FacturasPorDiaDto> FacturasPorDia { get; set; } = new();
    public List<ClienteFacturacionDto> TopClientes { get; set; } = new();
}

public class FacturasPorDiaDto
{
    public DateTime Fecha { get; set; }
    public int Cantidad { get; set; }
    public decimal Monto { get; set; }
}

public class ClienteFacturacionDto
{
    public string Rfc { get; set; } = default!;
    public string Nombre { get; set; } = default!;
    public int TotalFacturas { get; set; }
    public decimal MontoTotal { get; set; }
    public DateTime? UltimaFactura { get; set; }
}

public class VentasPorPeriodoDto
{
    public string Periodo { get; set; } = default!;
    public int Cantidad { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }
}

public class EstadoFacturaDto
{
    public string Estado { get; set; } = default!;
    public int Cantidad { get; set; }
    public decimal MontoTotal { get; set; }
}

public class AuditoriaDto
{
    public long Id { get; set; }
    public long? FacturaId { get; set; }
    public string Accion { get; set; } = default!;
    public string? Descripcion { get; set; }
    public int? UsuarioId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime FechaHora { get; set; }
}