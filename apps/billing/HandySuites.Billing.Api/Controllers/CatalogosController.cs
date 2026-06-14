using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace HandySuites.Billing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogosController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<CatalogosController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ITenantEncryptionService _encryptionService;
    private readonly IRegistrationService _registrationService;
    private readonly ITenantInfoService _tenantInfo;
    private readonly IBillingEmailService _emailService;

    public CatalogosController(
        BillingDbContext context,
        ILogger<CatalogosController> logger,
        IConfiguration configuration,
        ITenantEncryptionService encryptionService,
        IRegistrationService registrationService,
        ITenantInfoService tenantInfo,
        IBillingEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _encryptionService = encryptionService;
        _registrationService = registrationService;
        _tenantInfo = tenantInfo;
        _emailService = emailService;
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
                // BILL-1: status del registro en Finkok como emisor
                c.FinkokEmisorRegistrado,
                c.FinkokRegistradoEn,
                c.FinkokStatus,
                c.FinkokTypeUser,
                c.FinkokCreditosRestantes,
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

        _logger.LogInformation("Configuración fiscal creada para tenant {TenantId}", tenantId);

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

        _logger.LogInformation("Configuración fiscal actualizada para tenant {TenantId}", tenantId);

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

            // Encrypt private key and password using per-tenant envelope encryption
            var keyResult = await _encryptionService.EncryptAsync(tenantId, keyBytes);
            config.LlavePrivada = Convert.ToBase64String(keyResult.Ciphertext);
            config.EncryptedDek = keyResult.EncryptedDek;
            config.EncryptionVersion = string.IsNullOrEmpty(keyResult.EncryptedDek) ? (short)1 : (short)2;

            var pwdResult = await _encryptionService.EncryptAsync(tenantId, passwordBytes);
            config.PasswordCertificado = Convert.ToBase64String(pwdResult.Ciphertext);

            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation("CSD_AUDIT: Certificate uploaded for tenant {TenantId} by user {UserId}", tenantId, userId);

            // ─── BILL-1 (2026-05-26): Registrar RFC en Finkok como emisor ─────────
            // Antes solo guardábamos CSD local. Sin este paso, Finkok rechaza el
            // timbrado porque no reconoce el RFC bajo nuestra cuenta partner.
            //
            // Política de cobro: por defecto prepago ("P"). Ilimitado ("O") se
            // activa manualmente en BD para tenants de plan PRO/BUSINESS.
            // Decision: mixto según plan no se implementa aquí (sin acceso a
            // PlanCodigo cross-API en este request); se queda para follow-up.
            if (!string.IsNullOrEmpty(config.Rfc))
            {
                var typeUser = config.FinkokTypeUser ?? 'P';
                var regResult = !config.FinkokEmisorRegistrado
                    ? await _registrationService.RegisterEmitterAsync(
                        new DTOs.RegisterEmitterRequest(config.Rfc, cerBytes, keyBytes, request.Password, typeUser))
                    : await _registrationService.UpdateEmitterAsync(
                        new DTOs.UpdateEmitterRequest(config.Rfc, "active", cerBytes, keyBytes, request.Password));

                if (regResult.Success)
                {
                    config.FinkokEmisorRegistrado = true;
                    config.FinkokRegistradoEn = config.FinkokRegistradoEn ?? DateTime.UtcNow;
                    config.FinkokStatus = "active";
                    config.FinkokTypeUser = typeUser;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("FINKOK_AUDIT: Emisor {Rfc} registrado/actualizado en Finkok (typeUser={Type})", config.Rfc, typeUser);

                    // Email best-effort a TODOS los admins del tenant — fire-and-forget
                    _ = NotifyAdminsFinkokSuccess(tenantId, config.Rfc, config.RazonSocial, typeUser);

                    return Ok(new { message = "Certificado cargado y RFC habilitado para facturar.", finkokRegistrado = true });
                }
                else if (regResult.AlreadyExists)
                {
                    // RFC ya está en Finkok bajo otra config — intentar edit
                    var editResult = await _registrationService.UpdateEmitterAsync(
                        new DTOs.UpdateEmitterRequest(config.Rfc, "active", cerBytes, keyBytes, request.Password));
                    if (editResult.Success)
                    {
                        config.FinkokEmisorRegistrado = true;
                        config.FinkokRegistradoEn = config.FinkokRegistradoEn ?? DateTime.UtcNow;
                        config.FinkokStatus = "active";
                        config.FinkokTypeUser = typeUser;
                        await _context.SaveChangesAsync();
                        _ = NotifyAdminsFinkokSuccess(tenantId, config.Rfc, config.RazonSocial, typeUser);
                        return Ok(new { message = "Certificado actualizado y RFC reactivado en Finkok.", finkokRegistrado = true });
                    }
                }

                // Finkok rechazó: CSD se queda guardado local pero NO se marca como activo en Finkok
                _logger.LogWarning("FINKOK_AUDIT: Finkok rechazó registro de {Rfc}: {Message}", config.Rfc, regResult.Message);
                _ = NotifyAdminsFinkokFailure(tenantId, config.Rfc, regResult.Message ?? "Error desconocido");

                return Ok(new
                {
                    message = "Certificado guardado, pero no se pudo registrar el RFC en Finkok.",
                    finkokRegistrado = false,
                    finkokError = regResult.Message,
                });
            }

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

    /// <summary>
    /// BILL-1 retry: si el upload inicial guardó CSD pero el registro Finkok falló,
    /// este endpoint reintenta el registro reusando el CSD ya guardado (descifrado).
    /// Útil cuando red caída, Finkok temporalmente fuera, password mal entonces corregido vía PUT.
    /// </summary>
    [HttpPost("configuracion-fiscal/{id}/retry-finkok-registration")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult> RetryFinkokRegistration(int id)
    {
        var tenantId = GetTenantId();

        var config = await _context.ConfiguracionesFiscales
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (config == null)
            return NotFound();

        if (string.IsNullOrEmpty(config.Rfc))
            return BadRequest(new { error = "El RFC no está configurado. Completa los datos fiscales primero." });

        if (string.IsNullOrEmpty(config.CertificadoSat) || string.IsNullOrEmpty(config.LlavePrivada) || string.IsNullOrEmpty(config.PasswordCertificado))
            return BadRequest(new { error = "Falta el CSD. Sube los archivos .cer y .key con el password primero." });

        byte[]? keyBytes = null;
        byte[]? passwordBytes = null;
        try
        {
            // Descifrar CSD almacenado
            var cerBytes = Convert.FromBase64String(config.CertificadoSat);
            var encryptedKeyBytes = Convert.FromBase64String(config.LlavePrivada);
            keyBytes = await _encryptionService.DecryptAsync(tenantId, encryptedKeyBytes, config.EncryptedDek, config.EncryptionVersion);
            var encryptedPwdBytes = Convert.FromBase64String(config.PasswordCertificado);
            passwordBytes = await _encryptionService.DecryptAsync(tenantId, encryptedPwdBytes, config.EncryptedDek, config.EncryptionVersion);
            var password = Encoding.UTF8.GetString(passwordBytes);

            var typeUser = config.FinkokTypeUser ?? 'P';

            // Si nunca se registró → add. Si está registrado pero suspendido o fallido prior → edit (reactiva).
            var regResult = !config.FinkokEmisorRegistrado
                ? await _registrationService.RegisterEmitterAsync(
                    new DTOs.RegisterEmitterRequest(config.Rfc, cerBytes, keyBytes, password, typeUser))
                : await _registrationService.UpdateEmitterAsync(
                    new DTOs.UpdateEmitterRequest(config.Rfc, "active", cerBytes, keyBytes, password));

            if (regResult.Success)
            {
                config.FinkokEmisorRegistrado = true;
                config.FinkokRegistradoEn = config.FinkokRegistradoEn ?? DateTime.UtcNow;
                config.FinkokStatus = "active";
                config.FinkokTypeUser = typeUser;
                config.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("FINKOK_RETRY_AUDIT: Emisor {Rfc} registrado tras retry (typeUser={Type})", config.Rfc, typeUser);
                _ = NotifyAdminsFinkokSuccess(tenantId, config.Rfc, config.RazonSocial, typeUser);
                return Ok(new { message = "RFC habilitado para facturar en Finkok.", finkokRegistrado = true });
            }

            if (regResult.AlreadyExists)
            {
                // RFC ya existe pero no estaba marcado en nuestra BD — intentar edit para sincronizar.
                var editResult = await _registrationService.UpdateEmitterAsync(
                    new DTOs.UpdateEmitterRequest(config.Rfc, "active", cerBytes, keyBytes, password));
                if (editResult.Success)
                {
                    config.FinkokEmisorRegistrado = true;
                    config.FinkokRegistradoEn = config.FinkokRegistradoEn ?? DateTime.UtcNow;
                    config.FinkokStatus = "active";
                    config.FinkokTypeUser = typeUser;
                    config.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _ = NotifyAdminsFinkokSuccess(tenantId, config.Rfc, config.RazonSocial, typeUser);
                    return Ok(new { message = "RFC reactivado en Finkok.", finkokRegistrado = true });
                }
            }

            // Falló: log + email + 400 con detalle
            _logger.LogWarning("FINKOK_RETRY_AUDIT: Finkok rechazó retry para {Rfc}: {Message}", config.Rfc, regResult.Message);
            _ = NotifyAdminsFinkokFailure(tenantId, config.Rfc, regResult.Message ?? "Error desconocido");

            return BadRequest(new
            {
                error = regResult.Message ?? "Finkok rechazó el registro",
                finkokRegistrado = false,
                finkokError = regResult.Message,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FINKOK_RETRY_AUDIT: Error en retry de Finkok para tenant {Tenant}", tenantId);
            return StatusCode(500, new { error = "Error al reintentar registro en Finkok." });
        }
        finally
        {
            if (keyBytes != null) Array.Clear(keyBytes);
            if (passwordBytes != null) Array.Clear(passwordBytes);
        }
    }

    /// <summary>
    /// Elimina/cancela el CSD del tenant: borra el certificado guardado localmente y,
    /// si el emisor estaba registrado en Finkok, lo suspende (best-effort) para detener
    /// el timbrado/cobro bajo la cuenta partner. El tenant queda sin poder facturar hasta
    /// volver a subir un CSD. Operacion del propio tenant (ADMIN/SUPER_ADMIN, tenant-scoped).
    /// </summary>
    [HttpDelete("configuracion-fiscal/{id}/certificado")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult> DeleteCertificado(int id)
    {
        var tenantId = GetTenantId();

        var config = await _context.ConfiguracionesFiscales
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (config == null)
            return NotFound();

        if (string.IsNullOrEmpty(config.CertificadoSat) && string.IsNullOrEmpty(config.LlavePrivada))
            return BadRequest(new { error = "No hay un CSD cargado para eliminar." });

        // 1) Suspender el emisor en Finkok (best-effort). El borrado local es la fuente de
        //    verdad: si Finkok falla, igual borramos local y avisamos.
        var finkokSuspendido = false;
        string? finkokError = null;
        if (config.FinkokEmisorRegistrado && !string.IsNullOrEmpty(config.Rfc))
        {
            try
            {
                var suspendResult = await _registrationService.UpdateEmitterAsync(
                    new DTOs.UpdateEmitterRequest(config.Rfc, "suspended", null, null, null));
                finkokSuspendido = suspendResult.Success;
                if (!suspendResult.Success)
                {
                    finkokError = suspendResult.Message;
                    _logger.LogWarning("CSD_AUDIT: Finkok no suspendio el emisor {Rfc} al eliminar CSD: {Message}",
                        config.Rfc, suspendResult.Message);
                }
            }
            catch (Exception ex)
            {
                finkokError = "No se pudo contactar a Finkok.";
                _logger.LogWarning(ex, "CSD_AUDIT: Excepcion al suspender {Rfc} en Finkok durante delete CSD", config.Rfc);
            }
        }

        // 2) Borrar el CSD local (la .key estaba cifrada; el .cer es publico).
        config.CertificadoSat = null;
        config.LlavePrivada = null;
        config.PasswordCertificado = null;
        config.EncryptedDek = null;
        config.EncryptionVersion = (short)0;

        // 3) El emisor ya no esta habilitado para facturar.
        config.FinkokEmisorRegistrado = false;
        config.FinkokStatus = "suspended";
        config.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        _logger.LogInformation("CSD_AUDIT: Certificado eliminado para tenant {TenantId} por usuario {UserId} (finkokSuspendido={Suspendido})",
            tenantId, userId, finkokSuspendido);

        return Ok(new
        {
            message = "Certificado eliminado. Tu emisor quedo deshabilitado para facturar hasta que subas un CSD nuevo.",
            finkokSuspendido,
            finkokError,
        });
    }

    [HttpGet("numeracion")]
    public async Task<ActionResult<IEnumerable<NumeracionDocumento>>> GetNumeracion([FromQuery] bool incluirInactivos = false)
    {
        var tenantId = GetTenantId();

        var query = _context.NumeracionDocumentos
            .Where(n => n.TenantId == tenantId);

        if (!incluirInactivos)
            query = query.Where(n => n.Activo);

        var numeraciones = await query
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

    [HttpPatch("numeracion/{id}/activo")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult> ToggleNumeracion(int id, [FromBody] ToggleActivoRequest request)
    {
        var tenantId = GetTenantId();
        var numeracion = await _context.NumeracionDocumentos
            .Where(n => n.Id == id && n.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (numeracion == null) return NotFound();

        numeracion.Activo = request.Activo;
        await _context.SaveChangesAsync();
        return Ok(numeracion);
    }

    [HttpDelete("numeracion/{id}")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult> DeleteNumeracion(int id)
    {
        var tenantId = GetTenantId();
        var numeracion = await _context.NumeracionDocumentos
            .Where(n => n.Id == id && n.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (numeracion == null) return NotFound();

        // No permitir eliminar series con facturas existentes
        var tieneFacturas = await _context.Facturas
            .AnyAsync(f => f.TenantId == tenantId && f.Serie == numeracion.Serie && f.Estado != "CANCELADA");

        if (tieneFacturas)
            return BadRequest($"No se puede eliminar la serie '{numeracion.Serie}' porque tiene facturas asociadas.");

        numeracion.Activo = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Legacy EncryptPassword/DecryptPassword removed — use ICertificateEncryptionService

    // ─── BILL-1 (2026-05-26): notificación email a admins del tenant ──────────
    // Fire-and-forget: si SMTP/SendGrid falla, queda log Serilog pero NO bloquea
    // el flujo de upload CSD. Email es canal secundario, el toast UI + el campo
    // FinkokEmisorRegistrado en BD son los canales primarios de feedback.

    private async Task NotifyAdminsFinkokSuccess(string tenantId, string rfc, string? razonSocial, char typeUser)
    {
        if (!int.TryParse(tenantId, out var tenantIdInt)) return;
        try
        {
            var emails = await _tenantInfo.GetAdminEmailsAsync(tenantIdInt);
            foreach (var email in emails)
            {
                _ = _emailService.SendFinkokRegistrationSuccessAsync(email, rfc, razonSocial, typeUser, lang: "es");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FINKOK_EMAIL_AUDIT: Error enviando notificación success a admins de tenant {Tenant}", tenantId);
        }
    }

    private async Task NotifyAdminsFinkokFailure(string tenantId, string rfc, string finkokErrorMessage)
    {
        if (!int.TryParse(tenantId, out var tenantIdInt)) return;
        try
        {
            var emails = await _tenantInfo.GetAdminEmailsAsync(tenantIdInt);
            foreach (var email in emails)
            {
                _ = _emailService.SendFinkokRegistrationFailureAsync(email, rfc, finkokErrorMessage, lang: "es");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FINKOK_EMAIL_AUDIT: Error enviando notificación failure a admins de tenant {Tenant}", tenantId);
        }
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

public class ToggleActivoRequest
{
    public bool Activo { get; set; }
}