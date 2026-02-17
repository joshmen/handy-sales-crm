using System.Text.Json.Serialization;

namespace HandySales.Application.CompanySettings.DTOs
{
    public class CompanySettingsDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("tenantId")]
        public int TenantId { get; set; }

        [JsonPropertyName("companyName")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("companyLogo")]
        public string? Logo { get; set; }

        [JsonPropertyName("companyPrimaryColor")]
        public string PrimaryColor { get; set; } = "#3B82F6";

        [JsonPropertyName("companySecondaryColor")]
        public string SecondaryColor { get; set; } = "#8B5CF6";

        [JsonPropertyName("companyDescription")]
        public string? Description { get; set; }

        [JsonPropertyName("contactEmail")]
        public string? Email { get; set; }

        [JsonPropertyName("contactPhone")]
        public string? Phone { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("country")]
        public string Country { get; set; } = "México";

        [JsonPropertyName("postalCode")]
        public string? PostalCode { get; set; }

        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = "America/Mexico_City";

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "MXN";

        [JsonPropertyName("taxId")]
        public string? TaxId { get; set; }

        [JsonPropertyName("website")]
        public string? Website { get; set; }

        [JsonPropertyName("cloudinaryFolder")]
        public string? CloudinaryFolder { get; set; }

        [JsonPropertyName("subscriptionStatus")]
        public string SubscriptionStatus { get; set; } = "TRIAL";

        [JsonPropertyName("subscriptionPlan")]
        public string SubscriptionPlan { get; set; } = "BASIC";

        [JsonPropertyName("maxUsers")]
        public int? MaxUsers { get; set; }

        [JsonPropertyName("currentUsers")]
        public int CurrentUsers { get; set; } = 0;

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }

        [JsonPropertyName("updatedBy")]
        public string? UpdatedBy { get; set; }
    }

    public class UpdateCompanySettingsRequest
    {
        [JsonPropertyName("companyName")]
        public string? Name { get; set; }
        [JsonPropertyName("companyPrimaryColor")]
        public string? PrimaryColor { get; set; }
        [JsonPropertyName("companySecondaryColor")]
        public string? SecondaryColor { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }
        [JsonPropertyName("phone")]
        public string? Phone { get; set; }
        [JsonPropertyName("email")]
        public string? Email { get; set; }
        [JsonPropertyName("website")]
        public string? Website { get; set; }
        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class UploadLogoResponse
    {
        [JsonPropertyName("logoUrl")]
        public string LogoUrl { get; set; } = string.Empty;
    }
}