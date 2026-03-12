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

        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = "America/Mexico_City";

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "MXN";

        [JsonPropertyName("language")]
        public string Language { get; set; } = "es";

        [JsonPropertyName("theme")]
        public string Theme { get; set; } = "light";

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

        [JsonPropertyName("trialEndsAt")]
        public DateTime? TrialEndsAt { get; set; }

        [JsonPropertyName("daysRemaining")]
        public int? DaysRemaining { get; set; }
    }

    public class UpdateCompanySettingsRequest
    {
        [JsonPropertyName("companyName")]
        public string? Name { get; set; }
        [JsonPropertyName("companyPrimaryColor")]
        public string? PrimaryColor { get; set; }
        [JsonPropertyName("companySecondaryColor")]
        public string? SecondaryColor { get; set; }
        [JsonPropertyName("timezone")]
        public string? Timezone { get; set; }
        [JsonPropertyName("language")]
        public string? Language { get; set; }
        [JsonPropertyName("currency")]
        public string? Currency { get; set; }
        [JsonPropertyName("theme")]
        public string? Theme { get; set; }
    }

    public class UploadLogoResponse
    {
        [JsonPropertyName("logoUrl")]
        public string LogoUrl { get; set; } = string.Empty;
    }
}
