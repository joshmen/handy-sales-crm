using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogosController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<CatalogosController> _logger;

    public CatalogosController(BillingDbContext context, ILogger<CatalogosController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private string GetTenantId() => User.FindFirst("TenantId")?.Value ?? "00000000-0000-0000-0000-000000000001";

    [HttpGet("tipos-comprobante")]
    public async Task<ActionResult<IEnumerable<TipoComprobante>>> GetTiposComprobante()
    {
        var tipos = await _context.TiposComprobante
            .Where(t => t.Activo)
            .OrderBy(t => t.Codigo)
            .ToListAsync();

        return Ok(tipos);
    }

    [HttpGet("metodos-pago")]
    public async Task<ActionResult<IEnumerable<MetodoPago>>> GetMetodosPago()
    {
        var metodos = await _context.MetodosPago
            .Where(m => m.Activo)
            .OrderBy(m => m.Codigo)
            .ToListAsync();

        return Ok(metodos);
    }

    [HttpGet("formas-pago")]
    public async Task<ActionResult<IEnumerable<FormaPago>>> GetFormasPago()
    {
        var formas = await _context.FormasPago
            .Where(f => f.Activo)
            .OrderBy(f => f.Codigo)
            .ToListAsync();

        return Ok(formas);
    }

    [HttpGet("usos-cfdi")]
    public async Task<ActionResult<IEnumerable<UsoCfdi>>> GetUsosCfdi(
        [FromQuery] bool? personaFisica,
        [FromQuery] bool? personaMoral)
    {
        var query = _context.UsosCfdi.Where(u => u.Activo);

        if (personaFisica.HasValue && personaFisica.Value)
            query = query.Where(u => u.AplicaPersonaFisica);

        if (personaMoral.HasValue && personaMoral.Value)
            query = query.Where(u => u.AplicaPersonaMoral);

        var usos = await query
            .OrderBy(u => u.Codigo)
            .ToListAsync();

        return Ok(usos);
    }

    [HttpGet("configuracion-fiscal")]
    public async Task<ActionResult<ConfiguracionFiscal>> GetConfiguracionFiscal()
    {
        var tenantId = GetTenantId();
        
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        if (config == null)
            return NotFound("No se ha configurado la información fiscal");

        // No devolver información sensible
        config.CertificadoSat = null;
        config.LlavePrivada = null;
        config.PasswordCertificado = null;

        return Ok(config);
    }

    [HttpPost("configuracion-fiscal")]
    public async Task<ActionResult<ConfiguracionFiscal>> CreateConfiguracionFiscal(
        [FromBody] CreateConfiguracionFiscalRequest request)
    {
        var tenantId = GetTenantId();

        // Verificar si ya existe una configuración
        var existente = await _context.ConfiguracionesFiscales
            .AnyAsync(c => c.TenantId == tenantId && c.EmpresaId == request.EmpresaId);

        if (existente)
            return BadRequest("Ya existe una configuración fiscal para esta empresa");

        var config = new ConfiguracionFiscal
        {
            TenantId = tenantId,
            EmpresaId = request.EmpresaId,
            RegimenFiscal = request.RegimenFiscal,
            Rfc = request.Rfc,
            RazonSocial = request.RazonSocial,
            DireccionFiscal = request.DireccionFiscal,
            CodigoPostal = request.CodigoPostal,
            Pais = request.Pais ?? "México",
            Moneda = request.Moneda ?? "MXN",
            SerieFactura = request.SerieFactura ?? "A",
            FolioActual = 1,
            LogoUrl = request.LogoUrl,
            Activo = true
        };

        _context.ConfiguracionesFiscales.Add(config);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Configuración fiscal creada para tenant {tenantId}");

        return CreatedAtAction(nameof(GetConfiguracionFiscal), config);
    }

    [HttpPut("configuracion-fiscal/{id}")]
    public async Task<ActionResult> UpdateConfiguracionFiscal(
        int id,
        [FromBody] UpdateConfiguracionFiscalRequest request)
    {
        var tenantId = GetTenantId();
        
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (config == null)
            return NotFound();

        config.RegimenFiscal = request.RegimenFiscal ?? config.RegimenFiscal;
        config.Rfc = request.Rfc ?? config.Rfc;
        config.RazonSocial = request.RazonSocial ?? config.RazonSocial;
        config.DireccionFiscal = request.DireccionFiscal ?? config.DireccionFiscal;
        config.CodigoPostal = request.CodigoPostal ?? config.CodigoPostal;
        config.Pais = request.Pais ?? config.Pais;
        config.Moneda = request.Moneda ?? config.Moneda;
        config.SerieFactura = request.SerieFactura ?? config.SerieFactura;
        config.LogoUrl = request.LogoUrl ?? config.LogoUrl;
        config.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation($"Configuración fiscal actualizada para tenant {tenantId}");

        return NoContent();
    }

    [HttpPost("configuracion-fiscal/{id}/certificado")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult> UploadCertificado(
        int id,
        [FromForm] IFormFile certificado,
        [FromForm] IFormFile llavePrivada,
        [FromForm] string password)
    {
        var tenantId = GetTenantId();
        
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (config == null)
            return NotFound();

        try
        {
            // TODO: Validar certificado con el SAT
            // Por ahora solo guardamos los archivos como base64
            
            using var msCert = new MemoryStream();
            await certificado.CopyToAsync(msCert);
            config.CertificadoSat = Convert.ToBase64String(msCert.ToArray());

            using var msKey = new MemoryStream();
            await llavePrivada.CopyToAsync(msKey);
            config.LlavePrivada = Convert.ToBase64String(msKey.ToArray());

            // TODO: Encriptar password antes de guardar
            config.PasswordCertificado = password;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Certificado SAT actualizado para tenant {tenantId}");

            return Ok(new { message = "Certificado cargado exitosamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al cargar certificado SAT");
            return StatusCode(500, new { error = "Error al procesar el certificado" });
        }
    }

    [HttpGet("numeracion")]
    public async Task<ActionResult<IEnumerable<NumeracionDocumento>>> GetNumeracion()
    {
        var tenantId = GetTenantId();
        
        var numeraciones = await _context.NumeracionDocumentos
            .Where(n => n.TenantId == tenantId && n.Activo)
            .OrderBy(n => n.TipoDocumento)
            .ThenBy(n => n.Serie)
            .ToListAsync();

        return Ok(numeraciones);
    }

    [HttpPost("numeracion")]
    public async Task<ActionResult<NumeracionDocumento>> CreateNumeracion(
        [FromBody] CreateNumeracionRequest request)
    {
        var tenantId = GetTenantId();

        // Verificar si ya existe
        var existente = await _context.NumeracionDocumentos
            .AnyAsync(n => n.TenantId == tenantId 
                && n.TipoDocumento == request.TipoDocumento 
                && n.Serie == request.Serie);

        if (existente)
            return BadRequest("Ya existe una numeración para este tipo de documento y serie");

        var numeracion = new NumeracionDocumento
        {
            TenantId = tenantId,
            TipoDocumento = request.TipoDocumento,
            Serie = request.Serie,
            FolioInicial = request.FolioInicial,
            FolioActual = request.FolioInicial,
            FolioFinal = request.FolioFinal,
            Activo = true
        };

        _context.NumeracionDocumentos.Add(numeracion);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetNumeracion), numeracion);
    }
}

// DTOs para Catálogos
public class CreateConfiguracionFiscalRequest
{
    public int EmpresaId { get; set; }
    public string? RegimenFiscal { get; set; }
    public string? Rfc { get; set; }
    public string? RazonSocial { get; set; }
    public string? DireccionFiscal { get; set; }
    public string? CodigoPostal { get; set; }
    public string? Pais { get; set; }
    public string? Moneda { get; set; }
    public string? SerieFactura { get; set; }
    public string? LogoUrl { get; set; }
}

public class UpdateConfiguracionFiscalRequest
{
    public string? RegimenFiscal { get; set; }
    public string? Rfc { get; set; }
    public string? RazonSocial { get; set; }
    public string? DireccionFiscal { get; set; }
    public string? CodigoPostal { get; set; }
    public string? Pais { get; set; }
    public string? Moneda { get; set; }
    public string? SerieFactura { get; set; }
    public string? LogoUrl { get; set; }
}

public class CreateNumeracionRequest
{
    public string TipoDocumento { get; set; } = default!;
    public string? Serie { get; set; }
    public int FolioInicial { get; set; } = 1;
    public int? FolioFinal { get; set; }
}