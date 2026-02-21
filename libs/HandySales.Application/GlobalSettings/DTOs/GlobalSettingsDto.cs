using System;

namespace HandySales.Application.GlobalSettings.DTOs
{
    public class GlobalSettingsDto
    {
        public int Id { get; set; }
        public string PlatformName { get; set; } = "Handy Suites";
        public string? PlatformLogo { get; set; }
        public string PlatformPrimaryColor { get; set; } = "#3B82F6";
        public string PlatformSecondaryColor { get; set; } = "#8B5CF6";
        public string DefaultLanguage { get; set; } = "es";
        public string DefaultTimezone { get; set; } = "America/Mexico_City";
        public bool AllowSelfRegistration { get; set; }
        public bool RequireEmailVerification { get; set; }
        public int? MaxUsersPerCompany { get; set; }
        public long? MaxStoragePerCompany { get; set; }
        public bool MaintenanceMode { get; set; }
        public string? MaintenanceMessage { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class UpdateGlobalSettingsDto
    {
        public string? PlatformName { get; set; }
        public string? PlatformLogo { get; set; }
        public string? PlatformPrimaryColor { get; set; }
        public string? PlatformSecondaryColor { get; set; }
        public string? DefaultLanguage { get; set; }
        public string? DefaultTimezone { get; set; }
        public bool? AllowSelfRegistration { get; set; }
        public bool? RequireEmailVerification { get; set; }
        public int? MaxUsersPerCompany { get; set; }
        public long? MaxStoragePerCompany { get; set; }
        public bool? MaintenanceMode { get; set; }
        public string? MaintenanceMessage { get; set; }
    }

    public class UploadPlatformLogoResponse
    {
        public string LogoUrl { get; set; } = string.Empty;
    }
}