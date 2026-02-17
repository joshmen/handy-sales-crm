using HandySales.Application.Companies.DTOs;
using HandySales.Application.Companies.Interfaces;
using HandySales.Domain.Entities;

namespace HandySales.Application.Companies.Services
{
    public interface ICompanyService
    {
        Task<CompanyDto?> GetByTenantIdAsync(int tenantId);
        Task<CompanyDto?> GetByIdAsync(int id);
        Task<IEnumerable<CompanyDto>> GetAllAsync();
        Task<CompanyDto?> CreateAsync(int userId, CreateCompanyDto request);
        Task<CompanyDto?> UpdateAsync(int id, int userId, UpdateCompanyDto request);
        Task<bool> DeleteAsync(int id);
        Task<bool> ExistsByTenantIdAsync(int tenantId);
        Task<CompanySettingsDto?> GetSettingsAsync(int tenantId);
    }

    public class CompanyService : ICompanyService
    {
        private readonly ICompanyRepository _repository;

        public CompanyService(ICompanyRepository repository)
        {
            _repository = repository;
        }

        public async Task<CompanyDto?> GetByTenantIdAsync(int tenantId)
        {
            try
            {
                var company = await _repository.GetByTenantIdAsync(tenantId);
                return company != null ? MapToDto(company) : null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener empresa por TenantId: {ex.Message}");
                return null;
            }
        }

        public async Task<CompanyDto?> GetByIdAsync(int id)
        {
            try
            {
                var company = await _repository.GetByIdAsync(id);
                return company != null ? MapToDto(company) : null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener empresa por ID: {ex.Message}");
                return null;
            }
        }

        public async Task<IEnumerable<CompanyDto>> GetAllAsync()
        {
            try
            {
                var companies = await _repository.GetAllAsync();
                return companies.Select(MapToDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener todas las empresas: {ex.Message}");
                return new List<CompanyDto>();
            }
        }

        public async Task<CompanyDto?> CreateAsync(int userId, CreateCompanyDto request)
        {
            try
            {
                var company = new Company
                {
                    TenantId = request.TenantId,
                    CompanyName = request.CompanyName,
                    CompanyDescription = request.CompanyDescription,
                    ContactEmail = request.ContactEmail,
                    ContactPhone = request.ContactPhone,
                    Address = request.Address,
                    City = request.City,
                    State = request.State,
                    Country = request.Country,
                    PostalCode = request.PostalCode,
                    Timezone = request.Timezone,
                    Currency = request.Currency,
                    TaxId = request.TaxId,
                    SubscriptionPlan = request.SubscriptionPlan,
                    MaxUsers = request.MaxUsers,
                    MaxStorage = request.MaxStorage,
                    SubscriptionStatus = SubscriptionStatus.Trial,
                    TrialEndsAt = DateTime.UtcNow.AddDays(30),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedBy = userId.ToString()
                };

                var createdCompany = await _repository.CreateAsync(company);
                return MapToDto(createdCompany);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al crear empresa: {ex.Message}");
                return null;
            }
        }

        public async Task<CompanyDto?> UpdateAsync(int id, int userId, UpdateCompanyDto request)
        {
            try
            {
                var company = await _repository.GetByIdAsync(id);
                
                if (company == null)
                {
                    return null;
                }

                // Actualizar solo los campos que se proporcionan
                if (!string.IsNullOrEmpty(request.CompanyName))
                    company.CompanyName = request.CompanyName;

                if (request.CompanyLogo != null)
                    company.CompanyLogo = request.CompanyLogo;

                if (!string.IsNullOrEmpty(request.CompanyPrimaryColor))
                    company.CompanyPrimaryColor = request.CompanyPrimaryColor;

                if (!string.IsNullOrEmpty(request.CompanySecondaryColor))
                    company.CompanySecondaryColor = request.CompanySecondaryColor;

                if (request.CompanyDescription != null)
                    company.CompanyDescription = request.CompanyDescription;

                if (request.ContactEmail != null)
                    company.ContactEmail = request.ContactEmail;

                if (request.ContactPhone != null)
                    company.ContactPhone = request.ContactPhone;

                if (request.Address != null)
                    company.Address = request.Address;

                if (request.City != null)
                    company.City = request.City;

                if (request.State != null)
                    company.State = request.State;

                if (request.Country != null)
                    company.Country = request.Country;

                if (request.PostalCode != null)
                    company.PostalCode = request.PostalCode;

                if (request.Timezone != null)
                    company.Timezone = request.Timezone;

                if (request.Currency != null)
                    company.Currency = request.Currency;

                if (request.TaxId != null)
                    company.TaxId = request.TaxId;

                company.UpdatedBy = userId.ToString();

                var updatedCompany = await _repository.UpdateAsync(company);
                return MapToDto(updatedCompany);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al actualizar empresa: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                await _repository.DeleteAsync(id);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al eliminar empresa: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> ExistsByTenantIdAsync(int tenantId)
        {
            try
            {
                return await _repository.ExistsByTenantIdAsync(tenantId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al verificar existencia de empresa: {ex.Message}");
                return false;
            }
        }

        public async Task<CompanySettingsDto?> GetSettingsAsync(int tenantId)
        {
            try
            {
                var company = await _repository.GetByTenantIdAsync(tenantId);
                
                if (company == null)
                {
                    return null;
                }

                return new CompanySettingsDto
                {
                    CompanyName = company.CompanyName,
                    CompanyLogo = company.CompanyLogo,
                    CompanyPrimaryColor = company.CompanyPrimaryColor,
                    CompanySecondaryColor = company.CompanySecondaryColor,
                    UpdatedAt = company.UpdatedAt,
                    UpdatedBy = company.UpdatedBy
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener configuración de empresa: {ex.Message}");
                return null;
            }
        }

        private CompanyDto MapToDto(Company company)
        {
            return new CompanyDto
            {
                Id = company.Id,
                TenantId = company.TenantId,
                CompanyName = company.CompanyName,
                CompanyLogo = company.CompanyLogo,
                CompanyPrimaryColor = company.CompanyPrimaryColor,
                CompanySecondaryColor = company.CompanySecondaryColor,
                CompanyDescription = company.CompanyDescription,
                ContactEmail = company.ContactEmail,
                ContactPhone = company.ContactPhone,
                Address = company.Address,
                City = company.City,
                State = company.State,
                Country = company.Country,
                PostalCode = company.PostalCode,
                Timezone = company.Timezone,
                Currency = company.Currency,
                TaxId = company.TaxId,
                SubscriptionStatus = company.SubscriptionStatus,
                SubscriptionPlan = company.SubscriptionPlan,
                SubscriptionExpiresAt = company.SubscriptionExpiresAt,
                TrialEndsAt = company.TrialEndsAt,
                MaxUsers = company.MaxUsers,
                CurrentUsers = company.CurrentUsers,
                MaxStorage = company.MaxStorage,
                CurrentStorage = company.CurrentStorage,
                IsActive = company.IsActive,
                UpdatedAt = company.UpdatedAt,
                UpdatedBy = company.UpdatedBy
            };
        }
    }
}