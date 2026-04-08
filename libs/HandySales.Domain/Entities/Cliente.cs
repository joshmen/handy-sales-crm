using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("Clientes")]
public class Cliente : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = null!;
    [Column("rfc")]
    public string RFC { get; set; } = null!;
    [Column("correo")]
    public string Correo { get; set; } = null!;
    [Column("telefono")]
    public string Telefono { get; set; } = null!;
    [Column("direccion")]
    public string Direccion { get; set; } = null!;
    [Column("numero_exterior")]
    public string? NumeroExterior { get; set; }
    [Column("id_zona")]
    public int IdZona { get; set; }
    [Column("categoria_cliente_id")]
    public int CategoriaClienteId { get; set; }

    [Column("vendedor_id")]
    public int? VendedorId { get; set; }

    [Column("latitud")]
    public double? Latitud { get; set; }

    [Column("longitud")]
    public double? Longitud { get; set; }

    // === Campos adicionales del formulario ===
    [Column("es_prospecto")]
    public bool EsProspecto { get; set; }

    [Column("comentarios")]
    public string? Comentarios { get; set; }

    [Column("lista_precios_id")]
    public int? ListaPreciosId { get; set; }

    [Column("descuento")]
    public decimal Descuento { get; set; }

    [Column("saldo")]
    public decimal Saldo { get; set; }

    [Column("limite_credito")]
    public decimal LimiteCredito { get; set; }

    [Column("venta_minima_efectiva")]
    public decimal VentaMinimaEfectiva { get; set; }

    [Column("tipos_pago_permitidos")]
    public string TiposPagoPermitidos { get; set; } = "efectivo";

    [Column("tipo_pago_predeterminado")]
    public string TipoPagoPredeterminado { get; set; } = "efectivo";

    [Column("dias_credito")]
    public int DiasCredito { get; set; }

    // === Dirección desglosada ===
    [Column("ciudad")]
    public string? Ciudad { get; set; }

    [Column("colonia")]
    public string? Colonia { get; set; }

    [Column("codigo_postal")]
    public string? CodigoPostal { get; set; }

    // === Datos de contacto ===
    [Column("encargado")]
    public string? Encargado { get; set; }

    // === Datos fiscales (para facturación CFDI 4.0) ===
    [Column("rfc_fiscal")]
    public string? RfcFiscal { get; set; }

    [Column("razon_social")]
    public string? RazonSocial { get; set; }

    [Column("codigo_postal_fiscal")]
    public string? CodigoPostalFiscal { get; set; }

    [Column("regimen_fiscal")]
    public string? RegimenFiscal { get; set; }

    [Column("uso_cfdi_predeterminado")]
    public string? UsoCFDIPredeterminado { get; set; }

    [Column("facturable")]
    public bool Facturable { get; set; }

    // === Navegación ===
    public Tenant Tenant { get; set; } = null!;

    [ForeignKey(nameof(IdZona))]
    public Zona? Zona { get; set; }

    [ForeignKey(nameof(CategoriaClienteId))]
    public CategoriaCliente? Categoria { get; set; }

    public Usuario? Vendedor { get; set; }
    public ListaPrecio? ListaPrecios { get; set; }
}
