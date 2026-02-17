using HandySales.Domain.Common;
using System;
using System.Collections.Generic;

namespace HandySales.Domain.Entities
{
    /// <summary>
    /// Company entity representing each tenant
    /// Managed by ADMIN role within each company
    /// </summary>
    public class Company
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public required string CompanyName { get; set; }
        public string? CompanyLogo { get; set; }
        public string? CompanyPrimaryColor { get; set; }
        public string? CompanySecondaryColor { get; set; }
        public string? CompanyDescription { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string Country { get; set; } = "México";
        public string? PostalCode { get; set; }
        public string Timezone { get; set; } = "America/Mexico_City";
        public string Currency { get; set; } = "MXN";
        public string? TaxId { get; set; }
        
        // Subscription information
        public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;
        public string SubscriptionPlan { get; set; } = "BASIC";
        public DateTime? SubscriptionExpiresAt { get; set; }
        public DateTime? TrialEndsAt { get; set; }
        
        // Usage limits
        public int? MaxUsers { get; set; }
        public int CurrentUsers { get; set; } = 0;
        public long? MaxStorage { get; set; }
        public long CurrentStorage { get; set; } = 0;
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        
        // Navigation properties
        public virtual ICollection<CompanySetting> CompanySettings { get; set; } = new List<CompanySetting>();
        public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    }
    
    public enum SubscriptionStatus
    {
        Trial,
        Active,
        Suspended,
        Cancelled
    }
}