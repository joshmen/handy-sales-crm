using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("DatosEmpresa")]
public class DatosEmpresa : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("razon_social")]
    [MaxLength(255)]
    public string? RazonSocial { get; set; }

    [Column("identificador_fiscal")]
    [MaxLength(20)]
    public string? IdentificadorFiscal { get; set; }

    [Column("tipo_identificador_fiscal")]
    [MaxLength(10)]
    public string TipoIdentificadorFiscal { get; set; } = "RFC";

    [Column("telefono")]
    [MaxLength(20)]
    public string? Telefono { get; set; }

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("contacto")]
    [MaxLength(255)]
    public string? Contacto { get; set; }

    [Column("direccion")]
    [MaxLength(500)]
    public string? Direccion { get; set; }

    [Column("ciudad")]
    [MaxLength(100)]
    public string? Ciudad { get; set; }

    [Column("estado")]
    [MaxLength(100)]
    public string? Estado { get; set; }

    [Column("codigo_postal")]
    [MaxLength(10)]
    public string? CodigoPostal { get; set; }

    [Column("sitio_web")]
    [MaxLength(255)]
    public string? SitioWeb { get; set; }

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    // Navegación
    public Tenant Tenant { get; set; } = null!;
}
