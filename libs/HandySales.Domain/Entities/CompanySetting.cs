using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("company_settings")]
public class CompanySetting : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    
    [Column("tenant_id")]
    public int TenantId { get; set; }
    
    [Column("company_id")]
    public int? CompanyId { get; set; }
    
    [Column("company_name")]
    public string CompanyName { get; set; } = string.Empty;
    
    [Column("primary_color")]
    public string PrimaryColor { get; set; } = "#007bff";
    
    [Column("secondary_color")]
    public string SecondaryColor { get; set; } = "#6c757d";
    
    [Column("logo_url")]
    public string? LogoUrl { get; set; }
    
    [Column("logo_public_id")]
    public string? LogoPublicId { get; set; } // Para almacenar el ID de Cloudinary
    
    [Column("cloudinary_folder")]
    public string? CloudinaryFolder { get; set; }

    [Column("timezone")]
    [MaxLength(50)]
    public string Timezone { get; set; } = "America/Mexico_City";

    [Column("language")]
    [MaxLength(10)]
    public string Language { get; set; } = "es";

    [Column("currency")]
    [MaxLength(10)]
    public string Currency { get; set; } = "MXN";

    [Column("theme")]
    [MaxLength(10)]
    public string Theme { get; set; } = "light";

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Company? Company { get; set; }
}