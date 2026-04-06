using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.Models;
using HandySales.Billing.Api.Services;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace HandySales.Billing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogosController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<CatalogosController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ICertificateEncryptionService _encryptionService;

    public CatalogosController(
        BillingDbContext context,
        ILogger<CatalogosController> logger,
        IConfiguration configuration,
        ICertificateEncryptionService encryptionService)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _encryptionService = encryptionService;
    }

    private string GetTenantId() => User.FindFirst("tenant_id")?.Value
        ?? throw new UnauthorizedAccessException("Token missing tenant_id claim");

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
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo)
            .Select(c => new
            {
                c.Id,
                c.TenantId,
                c.EmpresaId,
                c.RegimenFiscal,
                c.Rfc,
                c.RazonSocial,
                c.DireccionFiscal,
                c.CodigoPostal,
                c.Pais,
                c.Moneda,
                c.SerieFactura,
                c.FolioActual,
                c.LogoUrl,
                c.Activo,
                // PAC credentials managed via env vars — don't expose to frontend
                c.PacAmbiente,
                HasCertificado = c.CertificadoSat != null,
                HasLlavePrivada = c.LlavePrivada != null,
                HasPassword = c.PasswordCertificado != null,
                c.CreatedAt,
                c.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (config == null)
            return NotFound("No se ha configurado la información fiscal");

        return Ok(config);
    }

    [HttpPost("configuracion-fiscal")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
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
            // PAC credentials are managed via env vars (FINKOK_USUARIO/FINKOK_PASSWORD/FINKOK_AMBIENTE)
            // Ignore PacUsuario/PacPassword/PacAmbiente from frontend requests
            Activo = true
        };

        _context.ConfiguracionesFiscales.Add(config);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Configuración fiscal creada para tenant {tenantId}");

        return CreatedAtAction(nameof(GetConfiguracionFiscal), new { config.Id, config.TenantId, message = "Configuración fiscal creada" });
    }

    [HttpPut("configuracion-fiscal/{id}")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
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
        // PAC credentials are managed via env vars — ignore from frontend requests

        config.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation($"Configuración fiscal actualizada para tenant {tenantId}");

        return NoContent();
    }

    [HttpPost("configuracion-fiscal/{id}/certificado")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult> UploadCertificado(
        int id,
        [FromForm] UploadCertificadoRequest request)
    {
        var tenantId = GetTenantId();

        // Validate file size and type
        const long maxCertFileSize = 50 * 1024; // 50KB — CSD certs are ~2KB
        if (request.Certificado.Length > maxCertFileSize)
            return BadRequest("El certificado excede el tamaño máximo (50KB).");
        if (request.LlavePrivada.Length > maxCertFileSize)
            return BadRequest("La llave privada excede el tamaño máximo (50KB).");

        var cerExt = Path.GetExtension(request.Certificado.FileName)?.ToLowerInvariant();
        var keyExt = Path.GetExtension(request.LlavePrivada.FileName)?.ToLowerInvariant();
        if (cerExt != ".cer")
            return BadRequest("El certificado debe ser un archivo .cer");
        if (keyExt != ".key")
            return BadRequest("La llave privada debe ser un archivo .key");

        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (config == null)
            return NotFound();

        byte[]? keyBytes = null;
        byte[]? passwordBytes = null;
        try
        {
            using var msCert = new MemoryStream();
            await request.Certificado.CopyToAsync(msCert);
            var cerBytes = msCert.ToArray();

            using var msKey = new MemoryStream();
            await request.LlavePrivada.CopyToAsync(msKey);
            keyBytes = msKey.ToArray();
            passwordBytes = Encoding.UTF8.GetBytes(request.Password);

            // Validate that the .cer is a valid X.509 certificate
            try
            {
                using var cert = X509CertificateLoader.LoadCertificate(cerBytes);
                _logger.LogInformation("CSD_AUDIT: Certificate validated. Subject={Subject}, NotAfter={NotAfter}",
                    cert.Subject, cert.NotAfter);
            }
            catch (CryptographicException)
            {
                return BadRequest("El archivo .cer no es un certificado X.509 válido.");
            }

            // Validate that the .key can be decrypted with the provided password
            try
            {
                using var rsa = RSA.Create();
                rsa.ImportEncryptedPkcs8PrivateKey(passwordBytes, keyBytes, out _);
            }
            catch (CryptographicException)
            {
                return BadRequest("La llave privada no puede descifrarse con el password proporcionado. Verifique el archivo .key y el password.");
            }

            // Store .cer as Base64 (public certificate — not sensitive)
            config.CertificadoSat = Convert.ToBase64String(cerBytes);

            // Encrypt private key and password before storing (never store plaintext)
            var encryptedKey = _encryptionService.Encrypt(keyBytes);
            config.LlavePrivada = Convert.ToBase64String(encryptedKey);

            var encryptedPassword = _encryptionService.Encrypt(passwordBytes);
            config.PasswordCertificado = Convert.ToBase64String(encryptedPassword);

            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation("CSD_AUDIT: Certificate uploaded for tenant {TenantId} by user {UserId}", tenantId, userId);

            return Ok(new { message = "Certificado cargado exitosamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CSD_AUDIT: Error uploading certificate for tenant {TenantId}", tenantId);
            return StatusCode(500, new { error = "Error al procesar el certificado" });
        }
        finally
        {
            if (keyBytes != null) Array.Clear(keyBytes);
            if (passwordBytes != null) Array.Clear(passwordBytes);
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

    // Legacy EncryptPassword/DecryptPassword removed — use ICertificateEncryptionService
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
    public string? PacUsuario { get; set; }
    public string? PacPassword { get; set; }
    public string? PacAmbiente { get; set; }
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
    public string? PacUsuario { get; set; }
    public string? PacPassword { get; set; }
    public string? PacAmbiente { get; set; }
}

public class CreateNumeracionRequest
{
    public string TipoDocumento { get; set; } = default!;
    public string? Serie { get; set; }
    public int FolioInicial { get; set; } = 1;
    public int? FolioFinal { get; set; }
}

public class UploadCertificadoRequest
{
    public IFormFile Certificado { get; set; } = default!;
    public IFormFile LlavePrivada { get; set; } = default!;
    public string Password { get; set; } = default!;
}