using HandySales.Domain.Common;
using System;

namespace HandySales.Domain.Entities
{
    /// <summary>
    /// Global platform settings managed by SUPER_ADMIN
    /// Only one record exists in the entire system
    /// </summary>
    public class GlobalSettings
    {
        public int Id { get; set; }
        public string PlatformName { get; set; } = "Handy Suites";
        public string? PlatformLogo { get; set; }
        public string? PlatformLogoPublicId { get; set; }
        public string PlatformPrimaryColor { get; set; } = "#3B82F6";
        public string PlatformSecondaryColor { get; set; } = "#8B5CF6";
        public string DefaultLanguage { get; set; } = "es";
        public string DefaultTimezone { get; set; } = "America/Mexico_City";
        public bool AllowSelfRegistration { get; set; } = false;
        public bool RequireEmailVerification { get; set; } = true;
        public int? MaxUsersPerCompany { get; set; }
        public long? MaxStoragePerCompany { get; set; }
        public bool MaintenanceMode { get; set; } = false;
        public string? MaintenanceMessage { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}