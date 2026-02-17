using HandySales.Application.Roles.DTOs;
using HandySales.Application.Roles.Interfaces;

namespace HandySales.Application.Roles.Services;

public class RoleService
{
    private readonly IRoleRepository _roleRepository;

    public RoleService(IRoleRepository roleRepository)
    {
        _roleRepository = roleRepository;
    }

    public async Task<List<RoleDto>> GetAllRolesAsync()
    {
        return await _roleRepository.GetAllRolesAsync();
    }

    public async Task<List<RoleDto>> GetActiveRolesAsync()
    {
        return await _roleRepository.GetActiveRolesAsync();
    }

    public async Task<RoleDto?> GetRoleByIdAsync(int id)
    {
        return await _roleRepository.GetRoleByIdAsync(id);
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleDto createRoleDto)
    {
        // Verificar si ya existe un role con el mismo nombre
        var exists = await _roleRepository.RoleExistsByNameAsync(createRoleDto.Nombre);
        if (exists)
        {
            throw new InvalidOperationException($"Ya existe un rol con el nombre '{createRoleDto.Nombre}'");
        }

        return await _roleRepository.CreateRoleAsync(createRoleDto);
    }

    public async Task<RoleDto?> UpdateRoleAsync(int id, UpdateRoleDto updateRoleDto)
    {
        // Verificar si ya existe otro role con el mismo nombre
        var exists = await _roleRepository.RoleExistsByNameAsync(updateRoleDto.Nombre, id);
        if (exists)
        {
            throw new InvalidOperationException($"Ya existe un rol con el nombre '{updateRoleDto.Nombre}'");
        }

        return await _roleRepository.UpdateRoleAsync(id, updateRoleDto);
    }

    public async Task<bool> DeleteRoleAsync(int id)
    {
        // Verificar si hay usuarios usando este rol
        var hasUsers = await _roleRepository.RoleHasUsersAsync(id);
        if (hasUsers)
        {
            throw new InvalidOperationException("No se puede eliminar el rol porque hay usuarios asignados a él");
        }

        return await _roleRepository.DeleteRoleAsync(id);
    }
}