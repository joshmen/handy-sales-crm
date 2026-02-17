using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities
{
    [Table("company_settings")]
    public class CompanySettings
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tenant_id")]
        public int TenantId { get; set; }

        // Información básica de la empresa
        [Column("company_name")]
        [Required]
        [MaxLength(255)]
        public string CompanyName { get; set; } = string.Empty;

        [Column("logo_url")]
        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [Column("logo_public_id")]
        [MaxLength(255)]
        public string? LogoPublicId { get; set; } // Para Cloudinary

        [Column("cloudinary_folder")]
        [MaxLength(255)]
        public string? CloudinaryFolder { get; set; } // Carpeta específica de la empresa

        // Configuración de colores
        [Column("primary_color")]
        [MaxLength(7)]
        public string PrimaryColor { get; set; } = "#3B82F6";

        [Column("secondary_color")]
        [MaxLength(7)]
        public string SecondaryColor { get; set; } = "#8B5CF6";

        // Información adicional de contacto
        [Column("address")]
        [MaxLength(500)]
        public string? Address { get; set; }

        [Column("phone")]
        [MaxLength(20)]
        public string? Phone { get; set; }

        [Column("email")]
        [MaxLength(255)]
        public string? Email { get; set; }

        [Column("website")]
        [MaxLength(255)]
        public string? Website { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        // Timestamps
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_by")]
        public int? UpdatedBy { get; set; }

        // Navigation properties
        [ForeignKey("TenantId")]
        public virtual Tenant? Tenant { get; set; }

        [ForeignKey("UpdatedBy")]
        public virtual Usuario? UpdatedByUser { get; set; }
    }
}