using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.Models;
using Npgsql;

namespace HandySuites.Billing.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class MapeoFiscalController : ControllerBase
{
    private readonly BillingDbContext _context;
    private readonly ILogger<MapeoFiscalController> _logger;
    private readonly string? _mainConnectionString;

    public MapeoFiscalController(
        BillingDbContext context,
        ILogger<MapeoFiscalController> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _mainConnectionString = configuration.GetConnectionString("MainConnection");
    }

    private string GetTenantId() => User.FindFirst("tenant_id")?.Value
        ?? throw new UnauthorizedAccessException("Token missing tenant_id claim");

    // ─── SAT Catalog Search ────────────────────────────────────────────

    [HttpGet("catalogos/prod-serv")]
    public async Task<ActionResult> SearchProdServ(
        [FromQuery] string q = "",
        [FromQuery] int limit = 20,
        [FromQuery] string pais = "MX")
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<object>());

        limit = Math.Clamp(limit, 1, 50);
        var sanitizedQ = q.Trim();

        var results = await _context.CatalogoProdServ
            .Where(c => c.Pais == pais && c.Activo &&
                (EF.Functions.ILike(c.Clave, sanitizedQ + "%") ||
                 EF.Functions.ILike(c.Descripcion, "%" + sanitizedQ + "%")))
            .OrderBy(c => EF.Functions.ILike(c.Clave, sanitizedQ + "%") ? 0 : 1)
            .ThenBy(c => c.Clave)
            .Take(limit)
            .Select(c => new { c.Clave, c.Descripcion })
            .ToListAsync();

        return Ok(results);
    }

    [HttpGet("catalogos/unidades")]
    public async Task<ActionResult> SearchUnidades(
        [FromQuery] string q = "",
        [FromQuery] int limit = 20,
        [FromQuery] string pais = "MX")
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<object>());

        limit = Math.Clamp(limit, 1, 50);
        var sanitizedQ = q.Trim();

        var results = await _context.CatalogoUnidad
            .Where(c => c.Pais == pais && c.Activo &&
                (EF.Functions.ILike(c.Clave, sanitizedQ + "%") ||
                 EF.Functions.ILike(c.Nombre, "%" + sanitizedQ + "%")))
            .OrderBy(c => EF.Functions.ILike(c.Clave, sanitizedQ + "%") ? 0 : 1)
            .ThenBy(c => c.Clave)
            .Take(limit)
            .Select(c => new { c.Clave, c.Nombre })
            .ToListAsync();

        return Ok(results);
    }

    // ─── Fiscal Mapping CRUD ───────────────────────────────────────────

    [HttpGet("mapeo-fiscal")]
    public async Task<ActionResult> GetMappings(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var tenantId = GetTenantId();
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _context.MapeosFiscalesProducto
            .Where(m => m.TenantId == tenantId);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(m => m.ProductoId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new
            {
                m.Id,
                m.ProductoId,
                m.ClaveProdServ,
                m.ClaveUnidad,
                m.DescripcionFiscal,
                m.CreatedAt,
                m.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { items, totalCount = total, page, pageSize });
    }

    [HttpGet("mapeo-fiscal/unmapped")]
    public async Task<ActionResult> GetUnmappedProducts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var tenantId = GetTenantId();
        pageSize = Math.Clamp(pageSize, 1, 200);

        if (string.IsNullOrEmpty(_mainConnectionString))
            return BadRequest("MainConnection not configured");

        if (!int.TryParse(tenantId, out var tenantIdInt))
            return BadRequest("Invalid tenant ID");

        // Get existing mapped product IDs
        var mappedProductIds = await _context.MapeosFiscalesProducto
            .Where(m => m.TenantId == tenantId)
            .Select(m => m.ProductoId)
            .ToListAsync();

        // Cross-DB query to get unmapped products from CRM
        var products = new List<object>();
        var totalCount = 0;

        await using var conn = new NpgsqlConnection(_mainConnectionString);
        await conn.OpenAsync();

        // Count query
        var countSql = @"SELECT COUNT(*) FROM ""Productos"" p
            WHERE p.tenant_id = @tenantId AND p.eliminado_en IS NULL
            AND p.activo = true";
        if (mappedProductIds.Count > 0)
            countSql += " AND p.id != ALL(@mappedIds)";

        await using (var countCmd = new NpgsqlCommand(countSql, conn))
        {
            countCmd.Parameters.AddWithValue("tenantId", tenantIdInt);
            if (mappedProductIds.Count > 0)
                countCmd.Parameters.AddWithValue("mappedIds", mappedProductIds.ToArray());
            totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
        }

        // Data query
        var dataSql = @"SELECT p.id, p.nombre, p.codigo_barra, p.clave_sat,
                u.nombre AS unidad_nombre, u.abreviatura AS unidad_abreviatura, u.clave_sat AS unidad_clave_sat
            FROM ""Productos"" p
            JOIN ""UnidadesMedida"" u ON u.id = p.unidad_medida_id AND u.tenant_id = p.tenant_id
            WHERE p.tenant_id = @tenantId AND p.eliminado_en IS NULL
            AND p.activo = true";
        if (mappedProductIds.Count > 0)
            dataSql += " AND p.id != ALL(@mappedIds)";
        dataSql += " ORDER BY p.nombre LIMIT @limit OFFSET @offset";

        await using (var dataCmd = new NpgsqlCommand(dataSql, conn))
        {
            dataCmd.Parameters.AddWithValue("tenantId", tenantIdInt);
            if (mappedProductIds.Count > 0)
                dataCmd.Parameters.AddWithValue("mappedIds", mappedProductIds.ToArray());
            dataCmd.Parameters.AddWithValue("limit", pageSize);
            dataCmd.Parameters.AddWithValue("offset", (page - 1) * pageSize);

            await using var reader = await dataCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                products.Add(new
                {
                    productoId = reader.GetInt32(0),
                    nombre = reader.GetString(1),
                    codigoBarra = reader.IsDBNull(2) ? null : reader.GetString(2),
                    claveSatActual = reader.IsDBNull(3) ? null : reader.GetString(3),
                    unidadNombre = reader.GetString(4),
                    unidadAbreviatura = reader.IsDBNull(5) ? null : reader.GetString(5),
                    unidadClaveSat = reader.IsDBNull(6) ? null : reader.GetString(6),
                });
            }
        }

        return Ok(new { items = products, totalCount, page, pageSize });
    }

    [HttpPost("mapeo-fiscal")]
    public async Task<ActionResult> UpsertMapping([FromBody] UpsertMapeoFiscalRequest request)
    {
        var tenantId = GetTenantId();

        var existing = await _context.MapeosFiscalesProducto
            .FirstOrDefaultAsync(m => m.TenantId == tenantId && m.ProductoId == request.ProductoId);

        if (existing != null)
        {
            existing.ClaveProdServ = request.ClaveProdServ;
            existing.ClaveUnidad = request.ClaveUnidad;
            existing.DescripcionFiscal = request.DescripcionFiscal;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.MapeosFiscalesProducto.Add(new MapeoFiscalProducto
            {
                TenantId = tenantId,
                ProductoId = request.ProductoId,
                ClaveProdServ = request.ClaveProdServ,
                ClaveUnidad = request.ClaveUnidad,
                DescripcionFiscal = request.DescripcionFiscal,
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Mapeo guardado" });
    }

    [HttpPost("mapeo-fiscal/batch")]
    public async Task<ActionResult> BatchUpsertMappings([FromBody] BatchUpsertMapeoFiscalRequest request)
    {
        var tenantId = GetTenantId();

        if (request.Mappings == null || request.Mappings.Count == 0)
            return BadRequest("No mappings provided");

        if (request.Mappings.Count > 500)
            return BadRequest("Maximum 500 mappings per batch");

        var productIds = request.Mappings.Select(m => m.ProductoId).ToList();
        var existingMappings = await _context.MapeosFiscalesProducto
            .Where(m => m.TenantId == tenantId && productIds.Contains(m.ProductoId))
            .ToDictionaryAsync(m => m.ProductoId);

        foreach (var item in request.Mappings)
        {
            if (existingMappings.TryGetValue(item.ProductoId, out var existing))
            {
                existing.ClaveProdServ = item.ClaveProdServ;
                existing.ClaveUnidad = item.ClaveUnidad;
                existing.DescripcionFiscal = item.DescripcionFiscal;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.MapeosFiscalesProducto.Add(new MapeoFiscalProducto
                {
                    TenantId = tenantId,
                    ProductoId = item.ProductoId,
                    ClaveProdServ = item.ClaveProdServ,
                    ClaveUnidad = item.ClaveUnidad,
                    DescripcionFiscal = item.DescripcionFiscal,
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"{request.Mappings.Count} mapeos guardados" });
    }

    [HttpDelete("mapeo-fiscal/{productoId}")]
    public async Task<ActionResult> DeleteMapping(int productoId)
    {
        var tenantId = GetTenantId();
        var deleted = await _context.MapeosFiscalesProducto
            .Where(m => m.TenantId == tenantId && m.ProductoId == productoId)
            .ExecuteDeleteAsync();

        return deleted > 0 ? Ok() : NotFound();
    }

    // ─── Tenant Defaults ───────────────────────────────────────────────

    [HttpGet("mapeo-fiscal/defaults")]
    public async Task<ActionResult> GetDefaults()
    {
        var tenantId = GetTenantId();
        var defaults = await _context.DefaultsFiscalesTenant
            .FirstOrDefaultAsync(d => d.TenantId == tenantId);

        return Ok(defaults ?? new DefaultsFiscalesTenant
        {
            TenantId = tenantId,
            ClaveProdServDefault = "01010101",
            ClaveUnidadDefault = "H87"
        });
    }

    [HttpPut("mapeo-fiscal/defaults")]
    public async Task<ActionResult> SetDefaults([FromBody] SetDefaultsFiscalesRequest request)
    {
        var tenantId = GetTenantId();
        var existing = await _context.DefaultsFiscalesTenant
            .FirstOrDefaultAsync(d => d.TenantId == tenantId);

        if (existing != null)
        {
            existing.ClaveProdServDefault = request.ClaveProdServDefault;
            existing.ClaveUnidadDefault = request.ClaveUnidadDefault;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.DefaultsFiscalesTenant.Add(new DefaultsFiscalesTenant
            {
                TenantId = tenantId,
                ClaveProdServDefault = request.ClaveProdServDefault,
                ClaveUnidadDefault = request.ClaveUnidadDefault,
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Defaults guardados" });
    }
}

// ─── DTOs ──────────────────────────────────────────────────────────────

public class UpsertMapeoFiscalRequest
{
    public int ProductoId { get; set; }
    public string ClaveProdServ { get; set; } = default!;
    public string ClaveUnidad { get; set; } = default!;
    public string? DescripcionFiscal { get; set; }
}

public class BatchUpsertMapeoFiscalRequest
{
    public List<UpsertMapeoFiscalRequest> Mappings { get; set; } = new();
}

public class SetDefaultsFiscalesRequest
{
    public string ClaveProdServDefault { get; set; } = "01010101";
    public string ClaveUnidadDefault { get; set; } = "H87";
}
