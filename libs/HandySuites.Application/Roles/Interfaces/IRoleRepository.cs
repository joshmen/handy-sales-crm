using HandySuites.Application.Roles.DTOs;

namespace HandySuites.Application.Roles.Interfaces;

public interface IRoleRepository
{
    Task<List<RoleDto>> GetAllRolesAsync();
    Task<List<RoleDto>> GetActiveRolesAsync();
    Task<RoleDto?> GetRoleByIdAsync(int id);
    Task<RoleDto> CreateRoleAsync(CreateRoleDto createRoleDto);
    Task<RoleDto?> UpdateRoleAsync(int id, UpdateRoleDto updateRoleDto);
    Task<bool> DeleteRoleAsync(int id);
    Task<bool> RoleExistsByNameAsync(string name, int? excludeId = null);
    Task<bool> RoleHasUsersAsync(int roleId);
}