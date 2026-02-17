using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

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

    public Tenant Tenant { get; set; } = null!;
    public Usuario? Vendedor { get; set; }
}
