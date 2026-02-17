using HandySales.Domain.Entities;
using HandySales.Application.Usuarios.DTOs;

namespace HandySales.Application.Usuarios.Interfaces;

public interface IUsuarioRepository
{
    Task<bool> ExisteEmailAsync(string email);
    Task<Usuario> RegistrarAsync(Usuario usuario);
    Task<Usuario?> ObtenerPorEmailAsync(string email);
    Task<Usuario?> ObtenerPorIdAsync(int id);
    Task<List<Usuario>> ObtenerPorTenantAsync(int tenantId);
    Task<List<Usuario>> ObtenerTodosAsync();
    Task<Usuario> ActualizarAsync(Usuario usuario);
    Task<bool> EliminarAsync(int id);
    Task<(List<Usuario> usuarios, int totalCount)> BuscarUsuariosAsync(UsuarioSearchDto searchDto);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
}
