using System.ComponentModel.DataAnnotations;

namespace HandySales.Billing.Api.Models;

public class CfdiErrorCatalog
{
    [Key]
    [MaxLength(20)]
    public string Codigo { get; set; } = default!;

    [Required]
    public string DescripcionSat { get; set; } = default!;

    [MaxLength(100)]
    public string? CampoRelacionado { get; set; }

    [Required]
    public string MensajeUsuario { get; set; } = default!;

    [Required]
    public string AccionSugerida { get; set; } = default!;

    [MaxLength(50)]
    public string Complemento { get; set; } = "CFDI";

    public bool Activo { get; set; } = true;
}
