using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("Tenants")]
public class Tenant : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("nombre_empresa")]
    public string NombreEmpresa { get; set; } = string.Empty;
    [Column("rfc")]
    public string? RFC { get; set; }
    [Column("contacto")]
    public string? Contacto { get; set; }
    [Column("cloudinary_folder")]
    public string? CloudinaryFolder { get; set; }
    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    // Suscripción
    [Column("plan_tipo")]
    public string? PlanTipo { get; set; }
    [Column("max_usuarios")]
    public int MaxUsuarios { get; set; } = 10;
    [Column("fecha_suscripcion")]
    public DateTime? FechaSuscripcion { get; set; }
    [Column("fecha_expiracion")]
    public DateTime? FechaExpiracion { get; set; }

    // Contacto extendido
    [Column("telefono")]
    public string? Telefono { get; set; }
    [Column("email")]
    public string? Email { get; set; }
    [Column("direccion")]
    public string? Direccion { get; set; }

    // Relaciones
    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    public ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();
    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
    public ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();
    public ICollection<Promocion> Promociones { get; set; } = new List<Promocion>();
    public ICollection<DescuentoPorCantidad> DescuentosPorCantidad { get; set; } = new List<DescuentoPorCantidad>();
    public ICollection<ListaPrecio> ListasPrecios { get; set; } = new List<ListaPrecio>();
}
