using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.Models;
using HandySales.Billing.Api.DTOs;
using System.Security.Claims;

namespace HandySales.Billing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FacturasController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<FacturasController> _logger;

    public FacturasController(BillingDbContext context, ILogger<FacturasController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private string GetTenantId() => User.FindFirst("TenantId")?.Value ?? "00000000-0000-0000-0000-000000000001";
    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FacturaListDto>>> GetFacturas(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin,
        [FromQuery] string? estado,
        [FromQuery] string? clienteRfc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var tenantId = GetTenantId();
        var query = _context.Facturas
            .Where(f => f.TenantId == tenantId)
            .AsQueryable();

        if (fechaInicio.HasValue)
            query = query.Where(f => f.FechaEmision >= fechaInicio.Value);

        if (fechaFin.HasValue)
            query = query.Where(f => f.FechaEmision <= fechaFin.Value);

        if (!string.IsNullOrEmpty(estado))
            query = query.Where(f => f.Estado == estado);

        if (!string.IsNullOrEmpty(clienteRfc))
            query = query.Where(f => f.ReceptorRfc.Contains(clienteRfc));

        var total = await query.CountAsync();

        var facturas = await query
            .OrderByDescending(f => f.FechaEmision)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new FacturaListDto
            {
                Id = f.Id,
                Uuid = f.Uuid,
                Serie = f.Serie,
                Folio = f.Folio,
                FechaEmision = f.FechaEmision,
                ReceptorRfc = f.ReceptorRfc,
                ReceptorNombre = f.ReceptorNombre,
                Total = f.Total,
                Estado = f.Estado,
                TipoComprobante = f.TipoComprobante
            })
            .ToListAsync();

        Response.Headers.Append("X-Total-Count", total.ToString());
        Response.Headers.Append("X-Page", page.ToString());
        Response.Headers.Append("X-Page-Size", pageSize.ToString());

        return Ok(facturas);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FacturaDto>> GetFactura(long id)
    {
        var tenantId = GetTenantId();
        
        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Include(f => f.Impuestos)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        return Ok(MapToDto(factura));
    }

    [HttpPost]
    public async Task<ActionResult<FacturaDto>> CreateFactura(CreateFacturaRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        // Obtener siguiente folio
        var folio = await GetNextFolio(tenantId, request.Serie ?? "A");

        var factura = new Factura
        {
            TenantId = tenantId,
            Serie = request.Serie ?? "A",
            Folio = folio,
            FechaEmision = request.FechaEmision ?? DateTime.UtcNow,
            TipoComprobante = request.TipoComprobante,
            MetodoPago = request.MetodoPago,
            FormaPago = request.FormaPago,
            UsoCfdi = request.UsoCfdi,
            EmisorRfc = request.EmisorRfc,
            EmisorNombre = request.EmisorNombre,
            EmisorRegimenFiscal = request.EmisorRegimenFiscal,
            ReceptorRfc = request.ReceptorRfc,
            ReceptorNombre = request.ReceptorNombre,
            ReceptorUsoCfdi = request.ReceptorUsoCfdi,
            ReceptorDomicilioFiscal = request.ReceptorDomicilioFiscal,
            Subtotal = request.Subtotal,
            Descuento = request.Descuento,
            TotalImpuestosTrasladados = request.TotalImpuestosTrasladados,
            TotalImpuestosRetenidos = request.TotalImpuestosRetenidos,
            Total = request.Total,
            Moneda = request.Moneda ?? "MXN",
            TipoCambio = request.TipoCambio ?? 1,
            ClienteId = request.ClienteId,
            VendedorId = request.VendedorId,
            PedidoId = request.PedidoId,
            Observaciones = request.Observaciones,
            CreatedBy = userId,
            Estado = "PENDIENTE"
        };

        // Agregar detalles
        if (request.Detalles != null)
        {
            foreach (var detalle in request.Detalles)
            {
                factura.Detalles.Add(new DetalleFactura
                {
                    NumeroLinea = detalle.NumeroLinea,
                    ClaveProdServ = detalle.ClaveProdServ,
                    NoIdentificacion = detalle.NoIdentificacion,
                    Descripcion = detalle.Descripcion,
                    Unidad = detalle.Unidad,
                    ClaveUnidad = detalle.ClaveUnidad,
                    Cantidad = detalle.Cantidad,
                    ValorUnitario = detalle.ValorUnitario,
                    Importe = detalle.Importe,
                    Descuento = detalle.Descuento,
                    ProductoId = detalle.ProductoId
                });
            }
        }

        _context.Facturas.Add(factura);

        // Registrar en auditoría
        RegistrarAuditoria(tenantId, factura.Id, "CREAR", "Factura creada", userId);

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFactura), new { id = factura.Id }, MapToDto(factura));
    }

    [HttpPost("{id}/timbrar")]
    public async Task<ActionResult<FacturaDto>> TimbrarFactura(long id)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        if (factura.Estado != "PENDIENTE")
            return BadRequest($"La factura no puede ser timbrada. Estado actual: {factura.Estado}");

        try
        {
            // TODO: Implementar timbrado con PAC (Proveedor Autorizado de Certificación)
            // Por ahora solo simulamos el timbrado
            
            factura.Uuid = Guid.NewGuid().ToString();
            factura.FechaTimbrado = DateTime.UtcNow;
            factura.Estado = "TIMBRADA";
            factura.CertificadoSat = "00001000000412345678";
            factura.FechaCertificacion = DateTime.UtcNow;

            RegistrarAuditoria(tenantId, factura.Id, "TIMBRAR", "Factura timbrada exitosamente", userId);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Factura {factura.Serie}-{factura.Folio} timbrada exitosamente");

            return Ok(MapToDto(factura));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error al timbrar factura {id}");
            factura.Estado = "ERROR";
            await _context.SaveChangesAsync();
            
            return StatusCode(500, new { error = "Error al timbrar la factura", details = ex.Message });
        }
    }

    [HttpPost("{id}/cancelar")]
    public async Task<ActionResult> CancelarFactura(long id, [FromBody] CancelarFacturaRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var factura = await _context.Facturas
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        if (factura.Estado != "TIMBRADA")
            return BadRequest("Solo se pueden cancelar facturas timbradas");

        factura.Estado = "CANCELADA";
        factura.EstadoCancelacion = "CANCELADA";
        factura.FechaCancelacion = DateTime.UtcNow;
        factura.MotivoCancelacion = request.MotivoCancelacion;
        factura.FolioSustitucion = request.FolioSustitucion;

        RegistrarAuditoria(tenantId, factura.Id, "CANCELAR", $"Factura cancelada: {request.MotivoCancelacion}", userId);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/pdf")]
    public async Task<ActionResult> GetPdf(long id)
    {
        var tenantId = GetTenantId();
        
        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        // TODO: Generar PDF real
        // Por ahora retornamos un placeholder
        return Ok(new { message = "PDF generation not implemented yet", facturaId = id });
    }

    [HttpGet("{id}/xml")]
    public async Task<ActionResult> GetXml(long id)
    {
        var tenantId = GetTenantId();
        
        var factura = await _context.Facturas
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        if (string.IsNullOrEmpty(factura.XmlContent))
            return NotFound("XML no disponible");

        return Content(factura.XmlContent, "application/xml");
    }

    [HttpPost("{id}/enviar")]
    public async Task<ActionResult> EnviarPorCorreo(long id, [FromBody] EnviarFacturaRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var factura = await _context.Facturas
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        if (factura.Estado != "TIMBRADA")
            return BadRequest("Solo se pueden enviar facturas timbradas");

        // TODO: Implementar envío por correo
        RegistrarAuditoria(tenantId, factura.Id, "ENVIAR", $"Factura enviada a: {request.Email}", userId);

        return Ok(new { message = $"Factura enviada a {request.Email}" });
    }

    private async Task<int> GetNextFolio(string tenantId, string serie)
    {
        var numeracion = await _context.NumeracionDocumentos
            .Where(n => n.TenantId == tenantId && n.TipoDocumento == "FACTURA" && n.Serie == serie)
            .FirstOrDefaultAsync();

        if (numeracion == null)
        {
            numeracion = new NumeracionDocumento
            {
                TenantId = tenantId,
                TipoDocumento = "FACTURA",
                Serie = serie,
                FolioInicial = 1,
                FolioActual = 1,
                Activo = true
            };
            _context.NumeracionDocumentos.Add(numeracion);
        }
        else
        {
            numeracion.FolioActual++;
        }

        await _context.SaveChangesAsync();
        return numeracion.FolioActual;
    }

    private void RegistrarAuditoria(string tenantId, long? facturaId, string accion, string descripcion, int usuarioId)
    {
        var auditoria = new AuditoriaFacturacion
        {
            TenantId = tenantId,
            FacturaId = facturaId,
            Accion = accion,
            Descripcion = descripcion,
            UsuarioId = usuarioId,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers["User-Agent"].ToString()
        };

        _context.AuditoriaFacturacion.Add(auditoria);
    }

    private FacturaDto MapToDto(Factura factura)
    {
        return new FacturaDto
        {
            Id = factura.Id,
            Uuid = factura.Uuid,
            Serie = factura.Serie,
            Folio = factura.Folio,
            FechaEmision = factura.FechaEmision,
            FechaTimbrado = factura.FechaTimbrado,
            TipoComprobante = factura.TipoComprobante,
            MetodoPago = factura.MetodoPago,
            FormaPago = factura.FormaPago,
            UsoCfdi = factura.UsoCfdi,
            EmisorRfc = factura.EmisorRfc,
            EmisorNombre = factura.EmisorNombre,
            EmisorRegimenFiscal = factura.EmisorRegimenFiscal,
            ReceptorRfc = factura.ReceptorRfc,
            ReceptorNombre = factura.ReceptorNombre,
            ReceptorUsoCfdi = factura.ReceptorUsoCfdi,
            Subtotal = factura.Subtotal,
            Descuento = factura.Descuento,
            TotalImpuestosTrasladados = factura.TotalImpuestosTrasladados,
            TotalImpuestosRetenidos = factura.TotalImpuestosRetenidos,
            Total = factura.Total,
            Moneda = factura.Moneda,
            TipoCambio = factura.TipoCambio,
            Estado = factura.Estado,
            Detalles = factura.Detalles?.Select(d => new DetalleFacturaDto
            {
                Id = d.Id,
                NumeroLinea = d.NumeroLinea,
                ClaveProdServ = d.ClaveProdServ,
                NoIdentificacion = d.NoIdentificacion,
                Descripcion = d.Descripcion,
                Unidad = d.Unidad,
                ClaveUnidad = d.ClaveUnidad,
                Cantidad = d.Cantidad,
                ValorUnitario = d.ValorUnitario,
                Importe = d.Importe,
                Descuento = d.Descuento
            }).ToList()
        };
    }
}