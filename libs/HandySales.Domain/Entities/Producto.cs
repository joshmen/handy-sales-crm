using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("Productos")]
public class Producto : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = null!;
    [Column("codigo_barra")]
    public string CodigoBarra { get; set; } = null!;
    [Column("descripcion")]
    public string Descripcion { get; set; } = null!;
    [Column("ImagenUrl")]
    public string? ImagenUrl { get; set; }
    [Column("familia_id")]
    public int FamiliaId { get; set; }
    [Column("categoria_id")]
    public int CategoraId { get; set; }
    [Column("unidad_medida_id")]
    public int UnidadMedidaId { get; set; }
    [Column("precio_base")]
    public decimal PrecioBase { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;

    [ForeignKey(nameof(FamiliaId))]
    public FamiliaProducto Familia { get; set; } = null!;

    [ForeignKey(nameof(CategoraId))]
    public CategoriaProducto Categoria { get; set; } = null!;

    [ForeignKey(nameof(UnidadMedidaId))]
    public UnidadMedida UnidadMedida { get; set; } = null!;

    // Inventario (one-to-one per tenant)
    public Inventario? Inventario { get; set; }
}
