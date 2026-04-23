using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.DTOs;
using HandySuites.Billing.Api.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

namespace HandySuites.Billing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FacturasController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<FacturasController> _logger;
    private readonly IInvoicePdfService _pdfService;
    private readonly IBillingEmailService _emailService;
    private readonly ICfdiXmlBuilder _xmlBuilder;
    private readonly ICfdiSigner _cfdiSigner;
    private readonly IPacService _pacService;
    private readonly IBlobStorageService _blobService;
    private readonly ITimbreEnforcementService _timbreService;
    private readonly ICompanyLogoService _companyLogoService;
    private readonly IOrderReaderService _orderReaderService;
    private readonly FiscalCodeResolver _fiscalCodeResolver;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ITenantEncryptionService _encryptionService;

    public FacturasController(
        BillingDbContext context,
        ILogger<FacturasController> logger,
        IInvoicePdfService pdfService,
        IBillingEmailService emailService,
        ICfdiXmlBuilder xmlBuilder,
        ICfdiSigner cfdiSigner,
        IPacService pacService,
        IBlobStorageService blobService,
        ITimbreEnforcementService timbreService,
        ICompanyLogoService companyLogoService,
        IOrderReaderService orderReaderService,
        FiscalCodeResolver fiscalCodeResolver,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ITenantEncryptionService encryptionService)
    {
        _context = context;
        _logger = logger;
        _pdfService = pdfService;
        _emailService = emailService;
        _xmlBuilder = xmlBuilder;
        _cfdiSigner = cfdiSigner;
        _pacService = pacService;
        _blobService = blobService;
        _timbreService = timbreService;
        _companyLogoService = companyLogoService;
        _orderReaderService = orderReaderService;
        _fiscalCodeResolver = fiscalCodeResolver;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _encryptionService = encryptionService;
    }

    private string GetTenantId() => User.FindFirst("tenant_id")?.Value
        ?? throw new UnauthorizedAccessException("Token missing tenant_id claim");
    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private async Task<byte[]?> DownloadLogoAsync(string? logoUrl)
    {
        if (string.IsNullOrEmpty(logoUrl)) return null;
        if (!Uri.TryCreate(logoUrl, UriKind.Absolute, out var uri))
            return null;
        if (uri.Scheme != "https" && uri.Scheme != "http")
            return null;
        // Block private/internal IPs to prevent SSRF — resolve DNS first
        try
        {
            var addresses = await System.Net.Dns.GetHostAddressesAsync(uri.Host);
            foreach (var addr in addresses)
            {
                if (System.Net.IPAddress.IsLoopback(addr))
                    return null;
                var bytes = addr.GetAddressBytes();
                // 10.0.0.0/8
                if (bytes[0] == 10) return null;
                // 172.16.0.0/12
                if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return null;
                // 192.168.0.0/16
                if (bytes[0] == 192 && bytes[1] == 168) return null;
                // 169.254.0.0/16 (link-local)
                if (bytes[0] == 169 && bytes[1] == 254) return null;
                // 100.64.0.0/10 (CGN)
                if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return null;
            }

            var client = _httpClientFactory.CreateClient("LogoClient");
            return await client.GetByteArrayAsync(logoUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not download logo from {LogoUrl}", logoUrl);
            return null;
        }
    }

    private async Task<byte[]?> ResolveLogoAsync(string? configLogoUrl, string tenantId)
    {
        // 1. Try ConfiguracionFiscal.LogoUrl (billing DB)
        var logoBytes = await DownloadLogoAsync(configLogoUrl);
        if (logoBytes != null) return logoBytes;

        // 2. Fallback: company_settings.logo_url (main DB)
        var mainLogoUrl = await _companyLogoService.GetLogoUrlAsync(tenantId);
        return await DownloadLogoAsync(mainLogoUrl);
    }

    [HttpGet("invoiced-orders")]
    public async Task<ActionResult> GetInvoicedOrders()
    {
        var tenantId = GetTenantId();
        var invoiced = await _context.Facturas
            .Where(f => f.TenantId == tenantId && f.PedidoId != null && f.Estado != "CANCELADA")
            .Select(f => new { f.PedidoId, f.Id, f.Serie, f.Folio, f.Estado, f.Uuid })
            .ToListAsync();

        // Return as dictionary keyed by pedidoId for fast lookup
        var result = invoiced.ToDictionary(
            f => f.PedidoId!.Value,
            f => new { facturaId = f.Id, folio = $"{f.Serie}-{f.Folio}", estado = f.Estado, uuid = f.Uuid }
        );
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FacturaListDto>>> GetFacturas(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] string? estado,
        [FromQuery] string? receptorRfc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var tenantId = GetTenantId();
        var query = _context.Facturas
            .Where(f => f.TenantId == tenantId)
            .AsQueryable();

        if (desde.HasValue)
            query = query.Where(f => f.FechaEmision >= desde.Value);

        if (hasta.HasValue)
            query = query.Where(f => f.FechaEmision <= hasta.Value);

        if (!string.IsNullOrEmpty(estado))
            query = query.Where(f => f.Estado == estado);

        if (!string.IsNullOrEmpty(receptorRfc))
            query = query.Where(f => f.ReceptorRfc.Contains(receptorRfc));

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
                EmisorRfc = f.EmisorRfc,
                ReceptorRfc = f.ReceptorRfc,
                ReceptorNombre = f.ReceptorNombre,
                Total = f.Total,
                Estado = f.Estado,
                TipoComprobante = f.TipoComprobante
            })
            .ToListAsync();

        return Ok(new
        {
            items = facturas,
            totalCount = total,
            page,
            pageSize
        });
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

    /// <summary>
    /// Datos completos para la representación impresa 80mm del CFDI.
    /// Incluye sellos completos, cadena original, certificados y RFC del PAC
    /// — campos que el FacturaDto público omite pero que Anexo 20 4.0 exige
    /// en el ticket físico entregado al cliente.
    /// </summary>
    [HttpGet("{id}/ticket-data")]
    public async Task<ActionResult<FacturaTicketDataDto>> GetTicketData(long id)
    {
        var tenantId = GetTenantId();

        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null) return NotFound();

        if (factura.Estado != "TIMBRADA" || string.IsNullOrEmpty(factura.Uuid))
            return BadRequest(new { error = "Solo facturas TIMBRADAS pueden imprimirse como ticket." });

        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        // RfcPac: lo extraemos del TimbreFiscalDigital dentro del XML stored
        // (no está como columna en Factura). Si falla el parse, devolvemos "".
        var rfcPac = ExtractRfcPacFromXml(factura.XmlContent);

        // Número de certificado del SAT se guarda en Factura.CertificadoSat (el "NoCertificado"
        // del TFD). Lo exponemos tal cual.
        var noCertSat = factura.CertificadoSat ?? string.Empty;
        var noCertEmisor = factura.NoCertificadoEmisor ?? string.Empty;

        var dto = new FacturaTicketDataDto
        {
            EmisorRfc = factura.EmisorRfc,
            EmisorNombre = factura.EmisorNombre,
            EmisorRegimenFiscal = factura.EmisorRegimenFiscal,
            EmisorDireccion = config?.DireccionFiscal,
            LugarExpedicion = config?.CodigoPostal ?? "00000",

            ReceptorRfc = factura.ReceptorRfc,
            ReceptorNombre = factura.ReceptorNombre,
            ReceptorRegimenFiscal = factura.ReceptorRegimenFiscal,
            ReceptorUsoCfdi = factura.ReceptorUsoCfdi,
            ReceptorDomicilioFiscal = factura.ReceptorDomicilioFiscal,

            Serie = factura.Serie,
            Folio = factura.Folio,
            FechaEmision = factura.FechaEmision,
            MetodoPago = factura.MetodoPago,
            FormaPago = factura.FormaPago,
            TipoExportacion = "01", // Default Anexo 20: "No aplica" (productos/servicios internos)

            Items = factura.Detalles
                .OrderBy(d => d.NumeroLinea)
                .Select(d => new FacturaTicketItemDto
                {
                    NumeroLinea = d.NumeroLinea,
                    ClaveProdServ = d.ClaveProdServ,
                    ClaveUnidad = d.ClaveUnidad,
                    Unidad = d.Unidad,
                    Descripcion = d.Descripcion,
                    Cantidad = d.Cantidad,
                    ValorUnitario = d.ValorUnitario,
                    Importe = d.Importe,
                    Descuento = d.Descuento,
                    ObjetoImp = d.ObjetoImp,
                })
                .ToList(),

            Subtotal = factura.Subtotal,
            Descuento = factura.Descuento,
            TotalImpuestosTrasladados = factura.TotalImpuestosTrasladados,
            Total = factura.Total,
            Moneda = factura.Moneda,

            Uuid = factura.Uuid,
            FechaTimbrado = factura.FechaTimbrado ?? factura.FechaCertificacion ?? factura.FechaEmision,
            NoCertificadoEmisor = noCertEmisor,
            NoCertificadoSat = noCertSat,
            RfcPac = rfcPac,
            SelloCfdi = factura.SelloCfdi ?? string.Empty,
            SelloSat = factura.SelloSat ?? string.Empty,
            CadenaOriginalSat = factura.CadenaOriginalSat ?? string.Empty,

            Estado = factura.Estado,
        };

        return Ok(dto);
    }

    /// <summary>
    /// Extrae el atributo RfcProvCertif del elemento TimbreFiscalDigital
    /// (complemento del CFDI timbrado). Si el XML no está disponible o no
    /// tiene timbre devuelve string vacío.
    /// </summary>
    private static string ExtractRfcPacFromXml(string? xmlContent)
    {
        if (string.IsNullOrWhiteSpace(xmlContent)) return string.Empty;
        try
        {
            var doc = XDocument.Parse(xmlContent);
            var tfdNs = XNamespace.Get("http://www.sat.gob.mx/TimbreFiscalDigital");
            var tfd = doc.Descendants(tfdNs + "TimbreFiscalDigital").FirstOrDefault();
            return tfd?.Attribute("RfcProvCertif")?.Value ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    [HttpPost]
    public async Task<ActionResult<FacturaDto>> CreateFactura(CreateFacturaRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        // Validate RFC format
        if (!IsValidRfc(request.EmisorRfc))
            return BadRequest(new { error = "RFC del emisor no tiene formato válido" });
        if (!IsValidRfc(request.ReceptorRfc))
            return BadRequest(new { error = "RFC del receptor no tiene formato válido" });

        // BR-012 (Audit HIGH-8, Abril 2026): pre-validar disponibilidad de timbres
        // antes de crear el registro PENDIENTE. Evita acumular facturas que nunca
        // podrán timbrarse si el tenant no tiene cuota.
        var authHeader = Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(authHeader))
        {
            var timbreCheck = await _timbreService.CheckTimbreAvailableAsync(authHeader);
            if (!timbreCheck.Allowed)
            {
                return StatusCode(402, new
                {
                    error = timbreCheck.Message ?? "No tienes timbres disponibles.",
                    usados = timbreCheck.Usados,
                    maximo = timbreCheck.Maximo
                });
            }
        }

        // BR-010: folio + factura atómicamente (mismo patrón que CreateFacturaFromOrder).
        // Wrapped via DbContext.CreateExecutionStrategy() because the DbContext has
        // EnableRetryOnFailure — manual BeginTransactionAsync would throw at runtime.
        var strategy = _context.Database.CreateExecutionStrategy();
        var factura = await strategy.ExecuteAsync(async () =>
        {
            await using var folioTx = await _context.Database.BeginTransactionAsync();

            // Obtener siguiente folio
            var folio = await GetNextFolio(tenantId, request.Serie ?? "A");

            var f = new Factura
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
                    f.Detalles.Add(new DetalleFactura
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

            _context.Facturas.Add(f);
            await _context.SaveChangesAsync();

            RegistrarAuditoria(tenantId, f.Id, "CREAR", "Factura creada", userId);
            await _context.SaveChangesAsync();
            await folioTx.CommitAsync();
            return f;
        });

        return CreatedAtAction(nameof(GetFactura), new { id = factura.Id }, MapToDto(factura));
    }

    [HttpPost("preview-from-order")]
    public async Task<ActionResult<PreFacturaDto>> PreviewFacturaFromOrder([FromBody] CreateFacturaFromOrderRequest request)
    {
        var tenantId = GetTenantId();

        // Reuse validation logic
        var order = await _orderReaderService.GetOrderForInvoiceAsync(tenantId, request.PedidoId);
        if (order == null)
            return NotFound("Pedido no encontrado");

        if (order.Estado != 5)
            return BadRequest("Solo se pueden facturar pedidos con estado 'Entregado'");

        if (!order.ClienteFacturable)
            return BadRequest(new { error = $"El cliente '{order.ClienteNombre}' no está marcado como facturable.", clienteId = order.ClienteId });

        if (string.IsNullOrEmpty(order.ClienteRfc))
            return BadRequest(new { error = $"El cliente '{order.ClienteNombre}' no tiene RFC registrado.", clienteId = order.ClienteId });

        if (string.IsNullOrEmpty(order.ClienteRazonSocial))
            return BadRequest(new { error = $"El cliente '{order.ClienteNombre}' no tiene razón social fiscal.", clienteId = order.ClienteId });

        if (string.IsNullOrEmpty(order.ClienteRegimenFiscal))
            return BadRequest(new { error = $"El cliente '{order.ClienteNombre}' no tiene régimen fiscal.", clienteId = order.ClienteId });

        if (string.IsNullOrEmpty(order.ClienteCodigoPostalFiscal))
            return BadRequest(new { error = $"El cliente '{order.ClienteNombre}' no tiene código postal fiscal.", clienteId = order.ClienteId });

        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        if (config == null)
            return BadRequest("No hay configuración fiscal activa.");

        // Resolve fiscal codes via the chain
        var resolved = await _fiscalCodeResolver.ResolveAsync(tenantId, order.Detalles);

        var lineNum = 1;
        var detalles = new List<PreFacturaLineDto>();
        foreach (var line in order.Detalles)
        {
            var fiscal = resolved.GetValueOrDefault(line.ProductoId,
                new FiscalCodeResolver.ResolvedFiscalCode("01010101", "H87", "fallback"));

            detalles.Add(new PreFacturaLineDto
            {
                NumeroLinea = lineNum++,
                ProductoId = line.ProductoId,
                ProductoNombre = line.ProductoNombre,
                CodigoBarra = line.ProductoCodigoBarra,
                ClaveProdServ = fiscal.ClaveProdServ,
                ClaveUnidad = fiscal.ClaveUnidad,
                Unidad = line.UnidadAbreviatura ?? line.UnidadNombre,
                Cantidad = line.Cantidad,
                PrecioUnitario = line.PrecioUnitario,
                Subtotal = line.Subtotal,
                Descuento = line.Descuento,
                Total = line.Total,
                IsMapped = fiscal.Source == "mapping",
                MappingSource = fiscal.Source,
            });
        }

        var unmappedCount = detalles.Count(d => d.MappingSource == "fallback");

        return Ok(new PreFacturaDto
        {
            EmisorRfc = config.Rfc ?? "",
            EmisorNombre = config.RazonSocial ?? "",
            EmisorRegimenFiscal = config.RegimenFiscal,
            ReceptorRfc = order.ClienteRfc,
            ReceptorNombre = order.ClienteRazonSocial ?? order.ClienteNombre,
            ReceptorUsoCfdi = request.UsoCfdi ?? order.ClienteUsoCfdi ?? "G03",
            ReceptorDomicilioFiscal = order.ClienteCodigoPostalFiscal,
            ReceptorRegimenFiscal = order.ClienteRegimenFiscal,
            MetodoPago = request.MetodoPago ?? "PUE",
            FormaPago = request.FormaPago ?? "01",
            Subtotal = order.Subtotal,
            Descuento = order.Descuento,
            Impuestos = order.Impuestos,
            Total = order.Total,
            PedidoId = order.PedidoId,
            NumeroPedido = order.NumeroPedido,
            HasUnmappedProducts = unmappedCount > 0,
            UnmappedCount = unmappedCount,
            Detalles = detalles,
        });
    }

    [HttpPost("from-order")]
    public async Task<ActionResult<FacturaDto>> CreateFacturaFromOrder(CreateFacturaFromOrderRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        // 1. Check if this order was already invoiced
        var existingFactura = await _context.Facturas
            .Where(f => f.TenantId == tenantId && f.PedidoId == request.PedidoId && f.Estado != "CANCELADA")
            .FirstOrDefaultAsync();

        if (existingFactura != null)
            return BadRequest($"Este pedido ya tiene una factura ({existingFactura.Serie}-{existingFactura.Folio}, estado: {existingFactura.Estado})");

        // 2. Read order data from main DB
        var order = await _orderReaderService.GetOrderForInvoiceAsync(tenantId, request.PedidoId);
        if (order == null)
            return NotFound("Pedido no encontrado");

        // 3. Validate order state (must be Entregado = 5)
        if (order.Estado != 5)
            return BadRequest("Solo se pueden facturar pedidos con estado 'Entregado'");

        // 4. Validate client is facturable and has fiscal data
        if (!order.ClienteFacturable)
            return BadRequest($"El cliente '{order.ClienteNombre}' no está marcado como facturable. Edite el cliente y active la opción 'Facturable'.");

        if (string.IsNullOrEmpty(order.ClienteRfc))
            return BadRequest($"El cliente '{order.ClienteNombre}' no tiene RFC registrado. Edite el cliente y asigne un RFC.");

        if (string.IsNullOrEmpty(order.ClienteRazonSocial))
            return BadRequest($"El cliente '{order.ClienteNombre}' no tiene razón social fiscal. Edite el cliente y asigne la razón social.");

        if (string.IsNullOrEmpty(order.ClienteRegimenFiscal))
            return BadRequest($"El cliente '{order.ClienteNombre}' no tiene régimen fiscal. Edite el cliente y asigne un régimen fiscal del SAT.");

        if (string.IsNullOrEmpty(order.ClienteCodigoPostalFiscal))
            return BadRequest($"El cliente '{order.ClienteNombre}' no tiene código postal fiscal. Edite el cliente y asigne el C.P. de su domicilio fiscal.");

        // 5. Load fiscal config (emisor data)
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        if (config == null)
            return BadRequest("No hay configuración fiscal activa. Configure sus datos fiscales en Facturación → Configuración.");

        // 6. Build factura from order data
        // BR-010: folio reservation + factura INSERT must share a transaction so
        //         that if timbrado/save fails the folio increment rolls back and
        //         we don't leave a SAT-compliance gap in the series.
        // Wrapped via CreateExecutionStrategy() because DbContext has EnableRetryOnFailure.
        var serie = config.SerieFactura ?? "A";

        var strategy = _context.Database.CreateExecutionStrategy();
        var txResult = await strategy.ExecuteAsync<(ActionResult<FacturaDto>? ReturnResult, Factura? Factura)>(async () =>
        {
            await using var folioTx = await _context.Database.BeginTransactionAsync();

            var folio = await GetNextFolio(tenantId, serie);

            var factura = new Factura
            {
                TenantId = tenantId,
                Serie = serie,
                Folio = folio,
                FechaEmision = DateTime.UtcNow,
                TipoComprobante = "I",
                MetodoPago = request.MetodoPago ?? "PUE",
                FormaPago = request.FormaPago ?? "01",
                UsoCfdi = request.UsoCfdi ?? order.ClienteUsoCfdi ?? "G03",
                EmisorRfc = config.Rfc ?? "",
                EmisorNombre = config.RazonSocial ?? "",
                EmisorRegimenFiscal = config.RegimenFiscal,
                ReceptorRfc = order.ClienteRfc,
                ReceptorNombre = order.ClienteRazonSocial ?? order.ClienteNombre,
                ReceptorUsoCfdi = request.UsoCfdi ?? order.ClienteUsoCfdi ?? "G03",
                ReceptorDomicilioFiscal = order.ClienteCodigoPostalFiscal,
                ReceptorRegimenFiscal = order.ClienteRegimenFiscal,
                Subtotal = order.Subtotal,
                Descuento = order.Descuento,
                TotalImpuestosTrasladados = order.Impuestos,
                TotalImpuestosRetenidos = 0,
                Total = order.Total,
                Moneda = "MXN",
                TipoCambio = 1,
                ClienteId = order.ClienteId,
                VendedorId = order.VendedorId,
                PedidoId = order.PedidoId,
                Observaciones = request.Observaciones ?? $"Factura generada desde pedido {order.NumeroPedido}",
                CreatedBy = userId,
                Estado = "PENDIENTE"
            };

            // 7. Resolve fiscal codes via chain: mapping → producto → defaults → fallback
            var resolved = await _fiscalCodeResolver.ResolveAsync(tenantId, order.Detalles);

            // Apply overrides from pre-factura review (if any)
            var overrides = request.Overrides?.ToDictionary(o => o.ProductoId) ?? new();

            var lineNum = 1;
            foreach (var line in order.Detalles)
            {
                var fiscal = resolved.GetValueOrDefault(line.ProductoId,
                    new FiscalCodeResolver.ResolvedFiscalCode("01010101", "H87", "fallback"));

                // Pre-factura overrides take highest priority
                var claveProdServ = overrides.TryGetValue(line.ProductoId, out var ov) && !string.IsNullOrEmpty(ov.ClaveProdServ)
                    ? ov.ClaveProdServ : fiscal.ClaveProdServ;
                var claveUnidad = overrides.TryGetValue(line.ProductoId, out var ovU) && !string.IsNullOrEmpty(ovU.ClaveUnidad)
                    ? ovU.ClaveUnidad : fiscal.ClaveUnidad;

                factura.Detalles.Add(new DetalleFactura
                {
                    NumeroLinea = lineNum++,
                    ClaveProdServ = claveProdServ,
                    NoIdentificacion = line.ProductoCodigoBarra,
                    Descripcion = line.ProductoNombre,
                    Unidad = line.UnidadAbreviatura ?? line.UnidadNombre,
                    ClaveUnidad = claveUnidad,
                    Cantidad = line.Cantidad,
                    ValorUnitario = line.PrecioUnitario,
                    Importe = line.Subtotal,
                    Descuento = line.Descuento,
                    ProductoId = line.ProductoId,
                });
            }

            // 8. Persist factura + commit folio reservation atomically.
            //    If we're not auto-timbrando, commit immediately (factura PENDIENTE).
            if (!request.TimbrarInmediatamente)
            {
                _context.Facturas.Add(factura);
                await _context.SaveChangesAsync();
                RegistrarAuditoria(tenantId, factura.Id, "CREAR", $"Factura creada desde pedido {order.NumeroPedido}", userId);
                await _context.SaveChangesAsync();
                await folioTx.CommitAsync();

                _logger.LogInformation("Factura {Serie}-{Folio} created (pending) from order {NumeroPedido} for tenant {TenantId}",
                    factura.Serie, factura.Folio, order.NumeroPedido, tenantId);

                return (CreatedAtAction(nameof(GetFactura), new { id = factura.Id }, MapToDto(factura)), null);
            }

            // Auto-timbrar flow: save factura inside the same folio transaction so that
            // if timbrado fails BEFORE any PAC UUID is issued, we roll back BOTH the
            // factura AND the folio increment — no SAT gap.
            _context.Facturas.Add(factura);
            await _context.SaveChangesAsync();

            var timbrarResult = await TimbrarFactura(factura.Id);
            if (timbrarResult.Result is OkObjectResult okResult)
            {
                RegistrarAuditoria(tenantId, factura.Id, "CREAR", $"Factura creada y timbrada desde pedido {order.NumeroPedido}", userId);
                await _context.SaveChangesAsync();
                await folioTx.CommitAsync();

                _logger.LogInformation("Factura {Serie}-{Folio} created and timbrada from order {NumeroPedido} for tenant {TenantId}",
                    factura.Serie, factura.Folio, order.NumeroPedido, tenantId);

                return ((ActionResult<FacturaDto>)Ok(okResult.Value), null);
            }

            // Timbrado failed.
            // If factura has a UUID it's already timbrada at SAT — we CANNOT rollback the folio
            // (SAT has accepted it). Commit the factura so the record reflects SAT reality and
            // the admin can handle the cancellation flow.
            var reloaded = await _context.Facturas.FindAsync(factura.Id);
            if (reloaded != null && !string.IsNullOrEmpty(reloaded.Uuid))
            {
                await folioTx.CommitAsync();
                _logger.LogWarning("Factura {Serie}-{Folio} timbrada at SAT but post-process failed. UUID={Uuid}. Tenant {TenantId}",
                    factura.Serie, factura.Folio, reloaded.Uuid, tenantId);
                return ((ActionResult<FacturaDto>)timbrarResult.Result!, null);
            }

            // No UUID → timbrado never succeeded at SAT → safe to rollback everything,
            // including the folio increment. No gap in SAT series.
            await folioTx.RollbackAsync();
            _logger.LogInformation("Factura {Serie}-{Folio} rolled back (including folio reservation) after timbrado failure for tenant {TenantId}",
                factura.Serie, factura.Folio, tenantId);
            return ((ActionResult<FacturaDto>)timbrarResult.Result!, null);
        });

        return txResult.ReturnResult!;
    }

    /// <summary>
    /// Genera una Factura Global (CFDI InformacionGlobal) que agrupa todos los pedidos
    /// entregados en un rango de fechas para público general (RFC XAXX010101000)
    /// que aún no tienen factura. NO timbra automáticamente — el admin decide cuándo timbrar.
    /// </summary>
    [HttpPost("global")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult<FacturaDto>> GenerarFacturaGlobal([FromBody] FacturaGlobalRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        // Validate periodicidad (SAT catalog)
        var periodicidadesValidas = new[] { "01", "02", "03", "04", "05" };
        if (!periodicidadesValidas.Contains(request.Periodicidad))
            return BadRequest("Periodicidad inválida. Valores válidos: 01 (Diario), 02 (Semanal), 03 (Quincenal), 04 (Mensual), 05 (Bimestral).");

        if (request.FechaInicio >= request.FechaFin)
            return BadRequest("FechaInicio debe ser anterior a FechaFin.");

        // Load fiscal config (emisor data)
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        if (config == null)
            return BadRequest("No hay configuración fiscal activa. Configure sus datos fiscales en Facturación → Configuración.");

        // Find pedido IDs that already have a non-cancelled factura in the billing DB
        var existingPedidoIds = await _context.Facturas
            .Where(f => f.TenantId == tenantId && f.PedidoId != null && f.Estado != "CANCELADA")
            .Select(f => f.PedidoId!.Value)
            .ToListAsync();

        // Query all qualifying orders from main DB
        var orders = await _orderReaderService.GetOrdersForFacturaGlobalAsync(
            tenantId, request.FechaInicio, request.FechaFin, existingPedidoIds);

        if (orders.Count == 0)
            return BadRequest("No se encontraron pedidos entregados sin factura para público general en el rango de fechas indicado.");

        // Build the Factura Global
        var serie = config.SerieFactura ?? "A";
        var folio = await GetNextFolio(tenantId, serie);

        var subtotal = orders.Sum(o => o.Subtotal);
        var descuento = orders.Sum(o => o.Descuento);
        var impuestos = orders.Sum(o => o.Impuestos);
        var total = orders.Sum(o => o.Total);

        // Derive mes/año from the period for the Observaciones
        var mesNames = new[] { "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };
        var periodoDesc = $"{request.FechaInicio:yyyy-MM-dd} al {request.FechaFin:yyyy-MM-dd}";

        var factura = new Factura
        {
            TenantId = tenantId,
            Serie = serie,
            Folio = folio,
            FechaEmision = DateTime.UtcNow,
            TipoComprobante = "I", // Ingreso
            MetodoPago = "PUE",
            FormaPago = "01", // Efectivo (default for público general)
            UsoCfdi = "S01", // Sin efectos fiscales (público general)
            EmisorRfc = config.Rfc ?? "",
            EmisorNombre = config.RazonSocial ?? "",
            EmisorRegimenFiscal = config.RegimenFiscal,
            ReceptorRfc = "XAXX010101000",
            ReceptorNombre = "PUBLICO EN GENERAL",
            ReceptorUsoCfdi = "S01",
            ReceptorDomicilioFiscal = config.CodigoPostal,
            Subtotal = subtotal,
            Descuento = descuento,
            TotalImpuestosTrasladados = impuestos,
            TotalImpuestosRetenidos = 0,
            Total = total,
            Moneda = "MXN",
            TipoCambio = 1,
            Observaciones = $"Factura Global — Periodicidad: {request.Periodicidad}, Periodo: {periodoDesc}, Pedidos: {orders.Count}",
            CreatedBy = userId,
            Estado = "PENDIENTE"
        };

        // Add all order line items as factura detalles
        var lineNum = 1;
        foreach (var order in orders)
        {
            foreach (var line in order.Detalles)
            {
                factura.Detalles.Add(new DetalleFactura
                {
                    NumeroLinea = lineNum++,
                    ClaveProdServ = line.ProductoClaveSat ?? "01010101",
                    NoIdentificacion = line.ProductoCodigoBarra,
                    Descripcion = $"{line.ProductoNombre} (Pedido {order.NumeroPedido})",
                    Unidad = line.UnidadAbreviatura ?? line.UnidadNombre,
                    ClaveUnidad = line.UnidadClaveSat ?? "H87",
                    Cantidad = line.Cantidad,
                    ValorUnitario = line.PrecioUnitario,
                    Importe = line.Subtotal,
                    Descuento = line.Descuento,
                    ProductoId = line.ProductoId,
                });
            }
        }

        _context.Facturas.Add(factura);
        await _context.SaveChangesAsync();

        // Link all pedidos to this factura for tracking (via observaciones since PedidoId is single)
        // The PedidoId field is nullable/single — for global invoices we leave it null
        // and track the relationship in the audit log
        var pedidoIds = string.Join(", ", orders.Select(o => o.PedidoId));
        RegistrarAuditoria(tenantId, factura.Id, "CREAR",
            $"Factura Global creada. Periodicidad: {request.Periodicidad}, Periodo: {periodoDesc}, Pedidos incluidos: [{pedidoIds}]", userId);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Factura Global {Serie}-{Folio} created for tenant {TenantId}: {OrderCount} orders, total ${Total}",
            factura.Serie, factura.Folio, tenantId, orders.Count, factura.Total);

        return CreatedAtAction(nameof(GetFactura), new { id = factura.Id }, MapToDto(factura));
    }

    [HttpPost("{id}/timbrar")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult<FacturaDto>> TimbrarFactura(long id)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        // Atomic state transition to prevent concurrent double-stamps
        var updated = await _context.Facturas
            .Where(f => f.Id == id && f.TenantId == tenantId
                && (f.Estado == "PENDIENTE" || f.Estado == "ERROR"))
            .ExecuteUpdateAsync(s => s.SetProperty(f => f.Estado, "PROCESANDO"));
        if (updated == 0)
            return BadRequest(new { error = "La factura ya está siendo procesada o no puede ser timbrada." });

        // Reload the factura for the rest of the flow
        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Include(f => f.Impuestos)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        var authHeader = Request.Headers.Authorization.ToString();
        var timbreCheck = await _timbreService.CheckTimbreAvailableAsync(authHeader);
        if (!timbreCheck.Allowed)
            return BadRequest(new { error = timbreCheck.Message ?? "No tienes timbres disponibles en tu plan actual." });

        // Load fiscal configuration (CSD + PAC credentials)
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        if (config == null)
            return BadRequest("No se encontró configuración fiscal activa. Configure sus datos fiscales primero.");

        if (string.IsNullOrEmpty(config.CertificadoSat) || string.IsNullOrEmpty(config.LlavePrivada))
            return BadRequest("No se encontraron certificados CSD. Suba su certificado (.cer) y llave privada (.key).");

        // Resolve PAC credentials: env vars take priority, then DB (legacy)
        var pacUsuario = _configuration["FINKOK_USUARIO"] ?? config.PacUsuario;
        var pacAmbiente = _configuration["FINKOK_AMBIENTE"] ?? config.PacAmbiente;

        string? decryptedPacPassword = null;
        var envPacPassword = _configuration["FINKOK_PASSWORD"];
        if (!string.IsNullOrEmpty(envPacPassword))
        {
            decryptedPacPassword = envPacPassword;
        }
        else if (!string.IsNullOrEmpty(config.PacPassword))
        {
            // Legacy fallback: decrypt from DB
            var decryptedBytes = await _encryptionService.DecryptAsync(tenantId,
                Convert.FromBase64String(config.PacPassword), config.EncryptedDek, config.EncryptionVersion);
            decryptedPacPassword = Encoding.UTF8.GetString(decryptedBytes);
            Array.Clear(decryptedBytes);
        }

        if (string.IsNullOrEmpty(pacUsuario) || string.IsNullOrEmpty(decryptedPacPassword))
            return BadRequest("No se encontraron credenciales del PAC. Configure las variables de entorno FINKOK_USUARIO/FINKOK_PASSWORD o las credenciales en la base de datos.");

        // Build a detached copy with resolved credentials for PAC calls
        var pacConfig = new ConfiguracionFiscal
        {
            PacUsuario = pacUsuario,
            PacPassword = decryptedPacPassword,
            PacAmbiente = pacAmbiente,
            CertificadoSat = config.CertificadoSat,
            LlavePrivada = config.LlavePrivada,
            PasswordCertificado = config.PasswordCertificado,
            Rfc = config.Rfc,
            RazonSocial = config.RazonSocial,
            RegimenFiscal = config.RegimenFiscal,
            CodigoPostal = config.CodigoPostal
        };

        try
        {
            // 1. Build XML CFDI 4.0
            var unsignedXml = _xmlBuilder.BuildXml(factura, config);

            // 2. Sign XML with CSD (cadena original → SHA256+RSA → Sello)
            var signedXml = await _cfdiSigner.SignXmlAsync(unsignedXml, config, tenantId);
            _logger.LogDebug("CFDI XML generated for factura {FacturaId} ({Length} chars)", factura.Id, signedXml.Length);
            factura.NoCertificadoEmisor = _cfdiSigner.GetNoCertificado(Convert.FromBase64String(config.CertificadoSat));
            _logger.LogDebug("XML firmado con CSD (NoCertificado: {NoCert})", factura.NoCertificadoEmisor);

            // Lazy migration: re-encrypt CSD with KMS if still on legacy v1
            if (config.EncryptionVersion < 2 && !string.IsNullOrEmpty(_configuration["KMS_CMK_ARN"]))
            {
                try
                {
                    var legacyKey = Convert.FromBase64String(config.LlavePrivada!);
                    var legacyPwd = Convert.FromBase64String(config.PasswordCertificado!);
                    var plainKey = await _encryptionService.DecryptAsync(tenantId, legacyKey, null, 1);
                    var plainPwd = await _encryptionService.DecryptAsync(tenantId, legacyPwd, null, 1);

                    var keyResult = await _encryptionService.EncryptAsync(tenantId, plainKey);
                    var pwdResult = await _encryptionService.EncryptAsync(tenantId, plainPwd);

                    config.LlavePrivada = Convert.ToBase64String(keyResult.Ciphertext);
                    config.PasswordCertificado = Convert.ToBase64String(pwdResult.Ciphertext);
                    config.EncryptedDek = keyResult.EncryptedDek;
                    config.EncryptionVersion = 2;
                    await _context.SaveChangesAsync();

                    Array.Clear(plainKey);
                    Array.Clear(plainPwd);
                    _logger.LogInformation("CSD_AUDIT: Lazy migration to KMS v2 for tenant {TenantId}", tenantId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "CSD_AUDIT: Lazy KMS migration failed for tenant {TenantId} — continuing with v1", tenantId);
                }
            }

            // 3. Send to PAC (Finkok) for timbrado — using decrypted credentials
            var resultado = await _pacService.TimbrarAsync(signedXml, pacConfig);

            if (!resultado.Success)
            {
                factura.Estado = "ERROR";
                _logger.LogWarning("Timbrado rechazado: {Code} - {Message}", resultado.ErrorCode, resultado.ErrorMessage);
                RegistrarAuditoria(tenantId, factura.Id, "TIMBRAR_ERROR",
                    $"Error: {resultado.ErrorCode} - {resultado.ErrorMessage}", userId);
                await _context.SaveChangesAsync();

                // Enrich with user-friendly message from CFDI error catalog
                var errorHelp = await _context.CfdiErrorCatalog
                    .Where(e => e.Codigo == resultado.ErrorCode && e.Activo)
                    .FirstOrDefaultAsync();

                return BadRequest(new
                {
                    error = errorHelp != null
                        ? $"{errorHelp.MensajeUsuario} — {errorHelp.AccionSugerida}"
                        : $"Error al timbrar la factura — {resultado.ErrorMessage}",
                    code = resultado.ErrorCode,
                    details = resultado.ErrorMessage
                });
            }

            // 4. CRITICAL: Save timbrado state IMMEDIATELY after successful PAC response.
            //    If this succeeds at SAT but a later step fails, we must not lose the UUID/state.
            factura.Uuid = resultado.Uuid;
            var fechaTimbrado = EnsureUtc(resultado.FechaTimbrado ?? DateTime.UtcNow);
            factura.FechaTimbrado = fechaTimbrado;
            factura.Estado = "TIMBRADA";
            factura.SelloCfdi = ExtractSelloCfdi(resultado.XmlTimbrado);
            factura.SelloSat = resultado.SelloSat;
            factura.CadenaOriginalSat = resultado.CadenaOriginalSat;
            factura.CertificadoSat = resultado.NoCertificadoSat;
            factura.FechaCertificacion = fechaTimbrado;
            factura.XmlContent = resultado.XmlTimbrado; // Local cache as backup

            RegistrarAuditoria(tenantId, factura.Id, "TIMBRAR",
                $"Factura timbrada exitosamente. UUID: {resultado.Uuid}", userId);
            await _context.SaveChangesAsync();

            // 5. Upload timbrado XML to Azure Blob Storage (best-effort — XML is already in XmlContent)
            if (!string.IsNullOrEmpty(resultado.XmlTimbrado) && !string.IsNullOrEmpty(resultado.Uuid))
            {
                try
                {
                    factura.XmlBlobUrl = await _blobService.UploadXmlAsync(tenantId, resultado.Uuid, resultado.XmlTimbrado);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("XML timbrado subido a Blob Storage: {BlobUrl}", factura.XmlBlobUrl);
                }
                catch (Exception blobEx)
                {
                    _logger.LogWarning(blobEx, "Could not upload XML to Blob Storage for UUID {Uuid}. XML is available in XmlContent field.", resultado.Uuid);
                }
            }

            // Register timbre usage with Main API
            if (!string.IsNullOrEmpty(authHeader))
            {
                try { await _timbreService.NotifyTimbreUsedAsync(authHeader); }
                catch (Exception ex) { _logger.LogError(ex, "Error notificando uso de timbre para factura {Id}", id); }
            }

            _logger.LogInformation("Factura {Serie}-{Folio} timbrada exitosamente (UUID: {Uuid})",
                factura.Serie, factura.Folio, resultado.Uuid);

            return Ok(MapToDto(factura));
        }
        catch (CryptographicException)
        {
            _logger.LogError("CSD cryptographic error during timbrado for factura {Id}", id);
            if (string.IsNullOrEmpty(factura.Uuid))
            {
                factura.Estado = "ERROR";
                RegistrarAuditoria(tenantId, factura.Id, "TIMBRAR_ERROR", "Error en la operación de firma", userId);
                await _context.SaveChangesAsync();
            }
            return BadRequest(new { error = "Error en la operación de firma. Verifique los certificados." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al timbrar factura {Id}", id);

            // CRITICAL: If UUID was already assigned, the invoice IS stamped at SAT.
            // Do NOT set Estado=ERROR — it's already TIMBRADA and persisted.
            if (string.IsNullOrEmpty(factura.Uuid))
            {
                factura.Estado = "ERROR";
                RegistrarAuditoria(tenantId, factura.Id, "TIMBRAR_ERROR", "Error interno al timbrar", userId);
                await _context.SaveChangesAsync();
            }
            else
            {
                _logger.LogWarning("Post-timbrado error for UUID {Uuid}, but invoice is already TIMBRADA at SAT. Not changing estado.", factura.Uuid);
            }

            return StatusCode(500, new { error = "Error al timbrar la factura" });
        }
    }

    [HttpPost("{id}/cancelar")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult> CancelarFactura(long id, [FromBody] CancelarFacturaRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var factura = await _context.Facturas
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null) return NotFound();
        if (factura.Estado != "TIMBRADA")
            return BadRequest("Solo se pueden cancelar facturas timbradas.");
        if (string.IsNullOrEmpty(factura.Uuid))
            return BadRequest("La factura no tiene UUID asignado.");

        var motivosValidos = new[] { "01", "02", "03", "04" };
        if (!motivosValidos.Contains(request.MotivoCancelacion))
            return BadRequest("Motivo de cancelación inválido. Valores válidos: 01, 02, 03, 04.");
        if (request.MotivoCancelacion == "01" && string.IsNullOrEmpty(request.FolioSustitucion))
            return BadRequest("El motivo '01' requiere el UUID de la factura que la sustituye.");

        // Load PAC credentials
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();
        if (config == null)
            return BadRequest("No se encontró configuración fiscal activa.");

        var pacUsuario = _configuration["FINKOK_USUARIO"] ?? config.PacUsuario;
        var pacAmbiente = _configuration["FINKOK_AMBIENTE"] ?? config.PacAmbiente;
        var decryptedPacPassword = _configuration["FINKOK_PASSWORD"];

        if (string.IsNullOrEmpty(decryptedPacPassword) && !string.IsNullOrEmpty(config.PacPassword))
        {
            var decryptedBytes = await _encryptionService.DecryptAsync(tenantId,
                Convert.FromBase64String(config.PacPassword), config.EncryptedDek, config.EncryptionVersion);
            decryptedPacPassword = Encoding.UTF8.GetString(decryptedBytes);
            Array.Clear(decryptedBytes);
        }

        if (string.IsNullOrEmpty(pacUsuario) || string.IsNullOrEmpty(decryptedPacPassword))
            return BadRequest("No se encontraron credenciales del PAC. Configure FINKOK_USUARIO/FINKOK_PASSWORD.");

        var pacConfig = new ConfiguracionFiscal
        {
            PacUsuario = pacUsuario,
            PacPassword = decryptedPacPassword,
            PacAmbiente = pacAmbiente,
        };

        // ═══ FLUJO DE CANCELACIÓN (según diagrama Finkok) ═══

        _logger.LogWarning("CANCEL_FLOW [{UUID}] ═══ INICIO — Motivo={Motivo}, RFC={RFC}, Total={Total}",
            factura.Uuid, request.MotivoCancelacion, factura.EmisorRfc, factura.Total);

        // Paso 1: Consultar estatus ante el SAT
        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 1: Consultando get_sat_status...", factura.Uuid);
        var satStatus = await _pacService.GetSatStatusAsync(
            factura.Uuid, factura.EmisorRfc, factura.ReceptorRfc, factura.Total, pacConfig);

        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 1 resultado: Success={Success}, Estado={Estado}, EsCancelable={EsCancelable}, EstCancelacion={EstCancelacion}, Error={Error}",
            factura.Uuid, satStatus.Success, satStatus.Estado, satStatus.EsCancelable, satStatus.EstatusCancelacion, satStatus.ErrorMessage);

        // Paso 2: ¿Ya está cancelado?
        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 2: ¿Ya cancelado? Estado={Estado}", factura.Uuid, satStatus.Estado);
        if (satStatus.Success && satStatus.Estado == "Cancelado")
        {
            factura.Estado = "CANCELADA";
            factura.EstadoCancelacion = "CANCELADA";
            factura.FechaCancelacion = DateTime.UtcNow;
            RegistrarAuditoria(tenantId, factura.Id, "CANCELAR", "Factura ya estaba cancelada ante el SAT", userId);
            await _context.SaveChangesAsync();
            return Ok(new { estado = "CANCELADA", mensaje = "La factura ya estaba cancelada ante el SAT." });
        }

        // Paso 3: ¿En proceso de cancelación?
        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 3: ¿En proceso? EstatusCancelacion={Est}", factura.Uuid, satStatus.EstatusCancelacion);
        if (satStatus.Success && satStatus.EstatusCancelacion?.Contains("Proceso") == true)
        {
            return Ok(new { estado = "EN_PROCESO", mensaje = "La factura tiene una solicitud de cancelación en proceso. Espere a que el receptor la acepte o se cumpla el plazo de 72 horas." });
        }

        // Paso 4: ¿Es cancelable?
        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 4: ¿Es cancelable? EsCancelable={Canc}", factura.Uuid, satStatus.EsCancelable);
        if (satStatus.Success && satStatus.EsCancelable?.Contains("No cancelable") == true)
        {
            return BadRequest(new
            {
                error = "La factura no es cancelable en este momento.",
                details = "Tiene comprobantes relacionados activos. Cancele primero los CFDIs relacionados."
            });
        }

        // Paso 5: Verificar solicitud previa < 72 hrs (código 798 del PAC lo maneja)
        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 5-6: Enviando sign_cancel al PAC...", factura.Uuid);

        // Paso 6: Enviar solicitud de cancelación
        var resultado = await _pacService.CancelarAsync(
            factura.Uuid, factura.EmisorRfc,
            request.MotivoCancelacion, request.FolioSustitucion, pacConfig);

        _logger.LogWarning("CANCEL_FLOW [{UUID}] Paso 6 resultado: Success={Success}, Estado={Estado}, Code={Code}, Error={Error}",
            factura.Uuid, resultado.Success, resultado.EstadoCancelacion, resultado.ErrorCode, resultado.ErrorMessage);

        if (!resultado.Success)
        {
            _logger.LogWarning("CANCEL_FLOW [{UUID}] ═══ FALLÓ — {Code}: {Error}", factura.Uuid, resultado.ErrorCode, resultado.ErrorMessage);
            var errorHelp = !string.IsNullOrEmpty(resultado.ErrorCode)
                ? await _context.CfdiErrorCatalog
                    .Where(e => e.Codigo == resultado.ErrorCode && e.Activo)
                    .FirstOrDefaultAsync()
                : null;

            return BadRequest(new
            {
                error = errorHelp?.MensajeUsuario ?? resultado.ErrorMessage ?? "Error al cancelar la factura",
                code = resultado.ErrorCode,
                details = errorHelp?.AccionSugerida ?? resultado.ErrorMessage
            });
        }

        // Paso 7: Procesar respuesta (201=exitosa, 202=previa)
        factura.EstadoCancelacion = resultado.EstadoCancelacion;
        factura.AcuseCancelacion = resultado.AcuseXml;
        factura.FechaCancelacion = DateTime.UtcNow;
        factura.MotivoCancelacion = request.MotivoCancelacion;
        factura.FolioSustitucion = request.FolioSustitucion;

        if (resultado.EstadoCancelacion == "CANCELADA")
            factura.Estado = "CANCELADA";

        var mensaje = resultado.EstadoCancelacion switch
        {
            "CANCELADA" => "Factura cancelada exitosamente ante el SAT.",
            "EN_PROCESO" => "Solicitud de cancelación enviada. El receptor tiene 72 horas para aceptar o rechazar.",
            _ => $"Solicitud procesada. Estado: {resultado.EstadoCancelacion}"
        };

        RegistrarAuditoria(tenantId, factura.Id, "CANCELAR",
            $"Cancelación: motivo={request.MotivoCancelacion}, estado={factura.EstadoCancelacion}", userId);
        await _context.SaveChangesAsync();

        _logger.LogWarning("CANCEL_FLOW [{UUID}] ═══ ÉXITO — Estado={Estado}, Mensaje={Mensaje}", factura.Uuid, factura.EstadoCancelacion, mensaje);
        return Ok(new { estado = factura.EstadoCancelacion, mensaje });
    }

    [HttpGet("{id}/pdf")]
    public async Task<ActionResult> GetPdf(long id)
    {
        var tenantId = GetTenantId();

        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Include(f => f.Impuestos)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        // Try serving from Blob Storage first (cached)
        if (!string.IsNullOrEmpty(factura.PdfBlobUrl))
        {
            try
            {
                var pdfBytes = await _blobService.GetPdfAsync(factura.PdfBlobUrl);
                var fileName = $"{factura.EmisorRfc}_Factura_{factura.Serie}{factura.Folio}_{factura.FechaEmision:yyyyMMdd}.pdf";
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not retrieve PDF from Blob Storage, regenerating");
            }
        }

        // Generate PDF fresh
        var config = await _context.ConfiguracionesFiscales
            .Where(c => c.TenantId == tenantId && c.Activo)
            .FirstOrDefaultAsync();

        var logoBytes = await ResolveLogoAsync(config?.LogoUrl, tenantId);
        var generatedPdf = _pdfService.GeneratePdf(factura, config, logoBytes);

        // Upload to Blob Storage for caching (if timbrada + has UUID)
        if (factura.Estado == "TIMBRADA" && !string.IsNullOrEmpty(factura.Uuid))
        {
            try
            {
                factura.PdfBlobUrl = await _blobService.UploadPdfAsync(tenantId, factura.Uuid, generatedPdf);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not cache PDF to Blob Storage");
            }
        }

        var pdfFileName = $"{factura.EmisorRfc}_Factura_{factura.Serie}{factura.Folio}_{factura.FechaEmision:yyyyMMdd}.pdf";
        return File(generatedPdf, "application/pdf", pdfFileName);
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

        var xmlFileName = $"{factura.EmisorRfc}_Factura_{factura.Serie}{factura.Folio}_{factura.Uuid ?? factura.FechaEmision.ToString("yyyyMMdd")}.xml";

        // Try Blob Storage first (source of truth)
        if (!string.IsNullOrEmpty(factura.XmlBlobUrl))
        {
            try
            {
                var xmlContent = await _blobService.GetXmlAsync(factura.XmlBlobUrl);
                var xmlBytes = System.Text.Encoding.UTF8.GetBytes(xmlContent);
                return File(xmlBytes, "application/xml", xmlFileName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not retrieve XML from Blob Storage, falling back to DB");
            }
        }

        // Fallback to DB cache
        if (string.IsNullOrEmpty(factura.XmlContent))
            return NotFound("XML no disponible");

        var fallbackBytes = System.Text.Encoding.UTF8.GetBytes(factura.XmlContent);
        return File(fallbackBytes, "application/xml", xmlFileName);
    }

    [HttpGet("export-zip")]
    public async Task<ActionResult> ExportZip()
    {
        var tenantId = GetTenantId();

        var facturas = await _context.Facturas
            .Where(f => f.TenantId == tenantId && f.Estado == "TIMBRADA")
            .OrderByDescending(f => f.FechaEmision)
            .Select(f => new { f.Id, f.Serie, f.Folio, f.EmisorRfc, f.Uuid, f.XmlBlobUrl, f.XmlContent, f.FechaEmision })
            .ToListAsync();

        if (facturas.Count == 0)
            return BadRequest("No hay facturas timbradas para exportar.");

        using var memoryStream = new MemoryStream();
        using (var archive = new System.IO.Compression.ZipArchive(memoryStream, System.IO.Compression.ZipArchiveMode.Create, true))
        {
            foreach (var f in facturas)
            {
                var prefix = $"{f.EmisorRfc}_Factura_{f.Serie}{f.Folio}";

                // XML
                string? xml = null;
                if (!string.IsNullOrEmpty(f.XmlBlobUrl))
                {
                    try { xml = await _blobService.GetXmlAsync(f.XmlBlobUrl); }
                    catch { /* fallback to DB */ }
                }
                xml ??= f.XmlContent;

                if (!string.IsNullOrEmpty(xml))
                {
                    var xmlEntry = archive.CreateEntry($"{prefix}.xml", System.IO.Compression.CompressionLevel.Fastest);
                    using var writer = new StreamWriter(xmlEntry.Open());
                    await writer.WriteAsync(xml);
                }
            }
        }

        memoryStream.Position = 0;
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return File(memoryStream.ToArray(), "application/zip", $"facturas_{date}.zip");
    }

    [HttpPost("{id}/enviar")]
    [Authorize(Roles = "ADMIN,SUPER_ADMIN")]
    public async Task<ActionResult> EnviarPorCorreo(long id, [FromBody] EnviarFacturaRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var factura = await _context.Facturas
            .Include(f => f.Detalles)
            .Include(f => f.Impuestos)
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound();

        if (factura.Estado != "TIMBRADA")
            return BadRequest("Solo se pueden enviar facturas timbradas");

        // Generate PDF if requested
        byte[]? pdfBytes = null;
        string? pdfFileName = null;
        if (request.IncluirPdf)
        {
            var config = await _context.ConfiguracionesFiscales
                .Where(c => c.TenantId == tenantId && c.Activo)
                .FirstOrDefaultAsync();

            var logoBytes = await ResolveLogoAsync(config?.LogoUrl, tenantId);
            pdfBytes = _pdfService.GeneratePdf(factura, config, logoBytes);
            pdfFileName = $"{factura.EmisorRfc}_Factura_{factura.Serie}{factura.Folio}.pdf";
        }

        // XML attachment if requested
        string? xmlContent = request.IncluirXml ? factura.XmlContent : null;
        string? emailXmlFileName = request.IncluirXml && !string.IsNullOrEmpty(factura.XmlContent)
            ? $"{factura.EmisorRfc}_Factura_{factura.Serie}{factura.Folio}.xml"
            : null;

        // Build email
        var subject = $"Factura {factura.Serie}-{factura.Folio} — {factura.EmisorNombre}";
        var htmlBody = BillingEmailTemplates.FacturaEmail(
            factura.Serie ?? "",
            factura.Folio,
            factura.ReceptorNombre,
            factura.EmisorNombre,
            factura.Total,
            factura.Moneda,
            factura.FechaEmision,
            pdfBytes != null,
            xmlContent != null);

        var sent = await _emailService.SendFacturaAsync(
            request.Email, subject, htmlBody,
            pdfBytes, pdfFileName,
            xmlContent, emailXmlFileName);

        var attachments = new List<string>();
        if (pdfBytes != null) attachments.Add("PDF");
        if (xmlContent != null) attachments.Add("XML");

        RegistrarAuditoria(tenantId, factura.Id, "ENVIAR",
            $"Factura enviada a: {request.Email} (adjuntos: {string.Join(", ", attachments)})", userId);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = sent ? $"Factura enviada a {request.Email}" : "Email en cola (SendGrid no configurado)",
            email = request.Email,
            attachments = attachments
        });
    }

    /// <summary>
    /// Atomic upsert: INSERT on first use, UPDATE+increment on subsequent calls.
    ///
    /// BR-010 (Audit CRITICAL-2 + MEDIUM-12, Abril 2026): the folio increment MUST
    /// share the ambient EF transaction so that if the subsequent Factura save fails,
    /// the folio reservation rolls back and no SAT-compliance gap is created.
    /// Previously this method opened its own NpgsqlConnection, auto-committing the
    /// increment regardless of the EF transaction outcome.
    ///
    /// Callers of this method should wrap GetNextFolio + Factura.Add + SaveChangesAsync
    /// in a single transaction (via ITransactionManager.BeginTransactionAsync).
    /// </summary>
    private async Task<int> GetNextFolio(string tenantId, string serie)
    {
        var conn = (Npgsql.NpgsqlConnection)_context.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        var tx = _context.Database.CurrentTransaction?.GetDbTransaction() as Npgsql.NpgsqlTransaction;

        const string sql = @"INSERT INTO numeracion_documentos (tenant_id, tipo_documento, serie, folio_inicial, folio_actual, activo, created_at, updated_at)
                    VALUES (@tid, 'FACTURA', @serie, 1, 1, true, NOW(), NOW())
                    ON CONFLICT (tenant_id, tipo_documento, serie)
                    DO UPDATE SET folio_actual = numeracion_documentos.folio_actual + 1, updated_at = NOW()
                    RETURNING folio_actual";

        await using var cmd = new Npgsql.NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("tid", tenantId);
        cmd.Parameters.AddWithValue("serie", serie);
        var folio = await cmd.ExecuteScalarAsync();
        return folio is int f ? f : 1;
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

    private static DateTime EnsureUtc(DateTime dt)
    {
        return dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();
    }

    /// <summary>
    /// Public endpoint — no authentication required.
    /// Returns limited factura data for the invoice download portal (QR scan).
    /// </summary>
    [HttpGet("public/{uuid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicByUuid(string uuid)
    {
        if (string.IsNullOrWhiteSpace(uuid))
            return BadRequest(new { error = "UUID is required" });

        var factura = await _context.Facturas
            .AsNoTracking()
            .Where(f => f.Uuid == uuid)
            .FirstOrDefaultAsync();

        if (factura == null)
            return NotFound(new { error = "Factura no encontrada" });

        // Generate presigned download URLs only for timbrada invoices with blob files
        string? pdfUrl = null;
        string? xmlUrl = null;

        if (factura.Estado == "TIMBRADA")
        {
            try
            {
                if (!string.IsNullOrEmpty(factura.PdfBlobUrl))
                    pdfUrl = await _blobService.GenerateSasUrlAsync(factura.PdfBlobUrl, "cfdi-pdf", TimeSpan.FromMinutes(15));
                if (!string.IsNullOrEmpty(factura.XmlBlobUrl))
                    xmlUrl = await _blobService.GenerateSasUrlAsync(factura.XmlBlobUrl, "cfdi-xml", TimeSpan.FromMinutes(15));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not generate SAS URLs for public factura {Uuid}", uuid);
            }
        }

        var dto = new FacturaPublicDto
        {
            Uuid = factura.Uuid,
            Serie = factura.Serie,
            Folio = factura.Folio,
            FechaEmision = factura.FechaEmision,
            FechaTimbrado = factura.FechaTimbrado,
            EmisorRfc = factura.EmisorRfc,
            EmisorNombre = factura.EmisorNombre,
            ReceptorRfc = factura.ReceptorRfc,
            ReceptorNombre = factura.ReceptorNombre,
            Total = factura.Total,
            Moneda = factura.Moneda,
            Estado = factura.Estado,
            PdfUrl = pdfUrl,
            XmlUrl = xmlUrl
        };

        return Ok(dto);
    }

    private static string? ExtractSelloCfdi(string? xmlTimbrado)
    {
        if (string.IsNullOrEmpty(xmlTimbrado)) return null;
        try
        {
            var doc = new System.Xml.XmlDocument();
            doc.LoadXml(xmlTimbrado);
            var nsmgr = new System.Xml.XmlNamespaceManager(doc.NameTable);
            nsmgr.AddNamespace("cfdi", "http://www.sat.gob.mx/cfd/4");
            return doc.SelectSingleNode("/cfdi:Comprobante", nsmgr)?.Attributes?["Sello"]?.Value;
        }
        catch { return null; }
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

    private static bool IsValidRfc(string rfc) =>
        !string.IsNullOrWhiteSpace(rfc) &&
        (rfc == "XAXX010101000" || rfc == "XEXX010101000" ||
         System.Text.RegularExpressions.Regex.IsMatch(rfc, @"^[A-ZÑ&]{3,4}\d{6}[A-V1-9][0-9A-Z]\d$"));
}