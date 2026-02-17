using System;
using HandySales.Domain.Entities;

namespace HandySales.Application.Companies.DTOs
{
    public class CompanyDto
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
        public SubscriptionStatus SubscriptionStatus { get; set; }
        public string SubscriptionPlan { get; set; } = "BASIC";
        public DateTime? SubscriptionExpiresAt { get; set; }
        public DateTime? TrialEndsAt { get; set; }
        public int? MaxUsers { get; set; }
        public int CurrentUsers { get; set; }
        public long? MaxStorage { get; set; }
        public long CurrentStorage { get; set; }
        public bool IsActive { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class CreateCompanyDto
    {
        public int TenantId { get; set; }
        public required string CompanyName { get; set; }
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
        public string SubscriptionPlan { get; set; } = "BASIC";
        public int? MaxUsers { get; set; }
        public long? MaxStorage { get; set; }
    }

    public class UpdateCompanyDto
    {
        public string? CompanyName { get; set; }
        public string? CompanyLogo { get; set; }
        public string? CompanyPrimaryColor { get; set; }
        public string? CompanySecondaryColor { get; set; }
        public string? CompanyDescription { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        public string? Timezone { get; set; }
        public string? Currency { get; set; }
        public string? TaxId { get; set; }
    }

    public class CompanySettingsDto
    {
        public required string CompanyName { get; set; }
        public string? CompanyLogo { get; set; }
        public string? CompanyPrimaryColor { get; set; }
        public string? CompanySecondaryColor { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}