using System.ComponentModel.DataAnnotations;

namespace HandySales.Application.Clientes.DTOs;

public class ClienteCreateDto
{
    public int TenandId { get; set; }
    [Required]
    public required string Nombre { get; set; }
    [Required]
    public required string RFC { get; set; }
    [Required]
    public required string Correo { get; set; }
    [Required]
    public required string Telefono { get; set; }
    [Required]
    public required string Direccion { get; set; }
    public int IdZona { get; set; }
    public int CategoriaClienteId { get; set; }
}
