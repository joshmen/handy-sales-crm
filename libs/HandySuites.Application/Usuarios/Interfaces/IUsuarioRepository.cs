using HandySuites.Domain.Entities;
using HandySuites.Application.Usuarios.DTOs;

namespace HandySuites.Application.Usuarios.Interfaces;

public interface IUsuarioRepository
{
    Task<bool> ExisteEmailAsync(string email);
    Task<Usuario> RegistrarAsync(Usuario usuario);
    Task<Usuario?> ObtenerPorEmailAsync(string email);
    Task<Usuario?> ObtenerPorIdAsync(int id);
    Task<List<Usuario>> ObtenerPorTenantAsync(int tenantId);
    Task<List<Usuario>> ObtenerPorTenantSinFiltroAsync(int tenantId);
    Task<List<Usuario>> ObtenerTodosAsync();
    Task<Usuario> ActualizarAsync(Usuario usuario);
    Task<bool> EliminarAsync(int id);
    Task<(List<Usuario> usuarios, int totalCount)> BuscarUsuariosAsync(UsuarioSearchDto searchDto);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<Role?> ObtenerRolPorNombreAsync(string nombre);
    Task<List<UsuarioUbicacionDto>> ObtenerUbicacionesAsync(int tenantId);
    Task<List<int>> ObtenerSubordinadoIdsAsync(int supervisorId, int tenantId);
    /// <summary>
    /// Cuenta pedidos no-terminales (Borrador/Confirmado/EnRuta) creados por el
    /// usuario. Si > 0 no se debería permitir borrar al usuario (pierde contexto
    /// del creador en reportes por el global query filter).
    /// </summary>
    Task<int> ContarPedidosActivosPorUsuarioAsync(int usuarioId, int tenantId);
}
