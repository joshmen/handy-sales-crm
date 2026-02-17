using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;
using HandySales.Domain.Entities;

[Table("CategoriasClientes")]

public class CategoriaCliente : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
    [Column("descripcion")]
    public string? Descripcion { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public List<Cliente> Clientes { get; set; } = new();
}
