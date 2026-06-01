using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum TipoGasto
{
    Combustible = 0,
    Peaje = 1,
    Comida = 2,
    Hospedaje = 3,
    Mantenimiento = 4,
    Estacionamiento = 5,
    Papeleria = 6,
    Otro = 99,
}

public enum EstadoGasto
{
    Activo = 0,
    Invalidado = 1,
}

/// <summary>
/// Registro de gasto incurrido por un vendedor durante su jornada/ruta.
/// Auto-aprobado al crearse: cuenta inmediatamente contra el corte de caja
/// de su ruta (descuenta de aRecibir en CierreRutaResumenDto). El supervisor
/// puede invalidar un gasto historicamente (no recomputa cierres ya cerrados).
/// Comprobante (foto del ticket) opcional, subido via attachments endpoint
/// y stampeado por MobileRecordId post-upload.
/// </summary>
[Table("Gastos")]
public class Gasto : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("mobile_record_id")]
    public string? MobileRecordId { get; set; }

    /// <summary>Opcional: ruta a la que se imputa el gasto. Si null, vendedor lo registro fuera de ruta.</summary>
    [Column("ruta_id")]
    public int? RutaId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("fecha_gasto")]
    public DateTime FechaGasto { get; set; } = DateTime.UtcNow;

    [Column("monto")]
    public decimal Monto { get; set; }

    [Column("tipo_gasto")]
    public TipoGasto TipoGasto { get; set; }

    [Column("concepto")]
    public string Concepto { get; set; } = string.Empty;

    [Column("notas")]
    public string? Notas { get; set; }

    /// <summary>URL del comprobante en Cloudinary o disco local. Stampeada por MobileAttachmentEndpoints tras upload.</summary>
    [Column("comprobante_url")]
    public string? ComprobanteUrl { get; set; }

    /// <summary>Moneda ISO-4217. Default 'MXN'. Futureproofing — multi-currency no soportado en v1.</summary>
    [Column("moneda")]
    public string Moneda { get; set; } = "MXN";

    [Column("estado")]
    public EstadoGasto Estado { get; set; } = EstadoGasto.Activo;

    [Column("invalidado_por")]
    public string? InvalidadoPor { get; set; }

    [Column("invalidado_en")]
    public DateTime? InvalidadoEn { get; set; }

    [Column("motivo_invalidacion")]
    public string? MotivoInvalidacion { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public RutaVendedor? Ruta { get; set; }
    public Usuario Usuario { get; set; } = null!;
}
