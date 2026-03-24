using HandySales.Application.Ai.DTOs;
using HandySales.Application.Ai.Interfaces;
using HandySales.Application.Rutas.DTOs;
using HandySales.Application.Rutas.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Shared.Multitenancy;
using Microsoft.Extensions.Logging;

namespace HandySales.Application.Rutas.Services;

public class RutaVendedorService
{
    private readonly IRutaVendedorRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly IAiGatewayService? _aiGateway;
    private readonly ILogger<RutaVendedorService>? _logger;

    public RutaVendedorService(
        IRutaVendedorRepository repo,
        ICurrentTenant tenant,
        IAiGatewayService? aiGateway = null,
        ILogger<RutaVendedorService>? logger = null)
    {
        _repo = repo;
        _tenant = tenant;
        _aiGateway = aiGateway;
        _logger = logger;
    }

    public async Task<int> CrearAsync(RutaVendedorCreateDto dto)
    {
        var ruta = new RutaVendedor
        {
            TenantId = _tenant.TenantId,
            UsuarioId = dto.UsuarioId,
            ZonaId = dto.ZonaId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            Fecha = dto.Fecha.Date,
            HoraInicioEstimada = dto.HoraInicioEstimada,
            HoraFinEstimada = dto.HoraFinEstimada,
            Notas = dto.Notas,
            Estado = EstadoRuta.Planificada,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        var rutaId = await _repo.CrearAsync(ruta);

        // Agregar detalles si se proporcionan
        if (dto.Detalles?.Any() == true)
        {
            foreach (var detalleDto in dto.Detalles.OrderBy(d => d.OrdenVisita))
            {
                var detalle = new RutaDetalle
                {
                    RutaId = rutaId,
                    ClienteId = detalleDto.ClienteId,
                    OrdenVisita = detalleDto.OrdenVisita,
                    HoraEstimadaLlegada = detalleDto.HoraEstimadaLlegada,
                    DuracionEstimadaMinutos = detalleDto.DuracionEstimadaMinutos,
                    Notas = detalleDto.Notas,
                    Estado = EstadoParada.Pendiente,
                    CreadoEn = DateTime.UtcNow,
                    CreadoPor = _tenant.UserId
                };
                await _repo.AgregarDetalleAsync(detalle);
            }
        }

        return rutaId;
    }

    public async Task<RutaVendedorDto?> ObtenerPorIdAsync(int id)
    {
        var ruta = await _repo.ObtenerPorIdAsync(id);
        if (ruta == null) return null;

        // Validar tenant
        var entidad = await _repo.ObtenerEntidadAsync(id);
        if (entidad?.TenantId != _tenant.TenantId && !_tenant.IsSuperAdmin)
            throw new UnauthorizedAccessException("No tienes permisos para ver esta ruta");

        return ruta;
    }

    public async Task<(List<RutaListaDto> Items, int TotalCount)> ObtenerPorFiltroAsync(RutaFiltroDto filtro)
    {
        // RBAC: Vendedor solo ve sus rutas
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                filtro.UsuarioId = vendedorId;
        }

        return await _repo.ObtenerPorFiltroAsync(_tenant.TenantId, filtro);
    }

    public async Task<RutaVendedorDto?> ObtenerMiRutaDelDiaAsync(DateTime? fecha = null)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repo.ObtenerRutaDelDiaAsync(_tenant.TenantId, usuarioId, fecha);
    }

    public async Task<List<RutaVendedorDto>> ObtenerMisRutasPendientesAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repo.ObtenerRutasPendientesAsync(_tenant.TenantId, usuarioId);
    }

    public async Task<List<RutaVendedorDto>> ObtenerRutasPorUsuarioAsync(int usuarioId)
    {
        return await _repo.ObtenerPorUsuarioAsync(_tenant.TenantId, usuarioId);
    }

    public async Task<bool> ActualizarAsync(int id, RutaVendedorUpdateDto dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        // No permitir editar rutas en progreso o completadas
        if (ruta.Estado != EstadoRuta.Planificada && ruta.Estado != EstadoRuta.PendienteAceptar)
            throw new InvalidOperationException("No se puede editar una ruta que ya está en progreso o completada");

        if (dto.UsuarioId.HasValue) ruta.UsuarioId = dto.UsuarioId.Value;
        if (dto.ZonaId.HasValue) ruta.ZonaId = dto.ZonaId;
        if (!string.IsNullOrEmpty(dto.Nombre)) ruta.Nombre = dto.Nombre;
        if (dto.Descripcion != null) ruta.Descripcion = dto.Descripcion;
        if (dto.Fecha.HasValue) ruta.Fecha = dto.Fecha.Value.Date;
        if (dto.HoraInicioEstimada.HasValue) ruta.HoraInicioEstimada = dto.HoraInicioEstimada;
        if (dto.HoraFinEstimada.HasValue) ruta.HoraFinEstimada = dto.HoraFinEstimada;
        if (dto.Notas != null) ruta.Notas = dto.Notas;

        ruta.ActualizadoEn = DateTime.UtcNow;
        ruta.ActualizadoPor = _tenant.UserId;

        return await _repo.ActualizarAsync(ruta);
    }

    public async Task<bool> EliminarAsync(int id)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        // No permitir eliminar rutas en progreso
        if (ruta.Estado == EstadoRuta.EnProgreso)
            throw new InvalidOperationException("No se puede eliminar una ruta en progreso");

        return await _repo.EliminarAsync(id);
    }

    // Gestión de estado de ruta
    public async Task<bool> IniciarRutaAsync(int id, IniciarRutaDto? dto = null)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        // Validar que es el vendedor asignado
        var usuarioId = int.Parse(_tenant.UserId);
        if (ruta.UsuarioId != usuarioId && !_tenant.IsAdmin)
            throw new UnauthorizedAccessException("Solo el vendedor asignado puede iniciar esta ruta");

        return await _repo.IniciarRutaAsync(id, DateTime.UtcNow);
    }

    public async Task<bool> CompletarRutaAsync(int id, double? kilometrosReales = null)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        return await _repo.CompletarRutaAsync(id, DateTime.UtcNow, kilometrosReales);
    }

    public async Task<bool> CancelarRutaAsync(int id, string? motivo)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        return await _repo.CancelarRutaAsync(id, motivo);
    }

    // Gestión de paradas
    public async Task<int> AgregarParadaAsync(int rutaId, RutaDetalleCreateDto dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        if (ruta.Estado != EstadoRuta.Planificada)
            throw new InvalidOperationException("No se pueden agregar paradas a una ruta en progreso o completada");

        var detalle = new RutaDetalle
        {
            RutaId = rutaId,
            ClienteId = dto.ClienteId,
            OrdenVisita = dto.OrdenVisita,
            HoraEstimadaLlegada = dto.HoraEstimadaLlegada,
            DuracionEstimadaMinutos = dto.DuracionEstimadaMinutos,
            Notas = dto.Notas,
            Estado = EstadoParada.Pendiente,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        return await _repo.AgregarDetalleAsync(detalle);
    }

    public async Task<bool> EliminarParadaAsync(int rutaId, int detalleId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        if (ruta.Estado != EstadoRuta.Planificada)
            throw new InvalidOperationException("No se pueden eliminar paradas de una ruta en progreso");

        return await _repo.EliminarDetalleAsync(detalleId);
    }

    public async Task<bool> ReordenarParadasAsync(int rutaId, ReordenarParadasDto dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        if (ruta.Estado != EstadoRuta.Planificada)
            throw new InvalidOperationException("No se pueden reordenar paradas de una ruta en progreso");

        return await _repo.ReordenarDetallesAsync(rutaId, dto.OrdenDetalleIds);
    }

    public async Task<bool> LlegarAParadaAsync(int detalleId, LlegarParadaDto dto)
    {
        var detalle = await _repo.ObtenerDetalleAsync(detalleId);
        if (detalle == null) return false;

        var ruta = await _repo.ObtenerEntidadAsync(detalle.RutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        if (ruta.Estado != EstadoRuta.EnProgreso)
            throw new InvalidOperationException("La ruta no está en progreso");

        return await _repo.LlegarAParadaAsync(detalleId, DateTime.UtcNow, dto.Latitud, dto.Longitud);
    }

    public async Task<bool> SalirDeParadaAsync(int detalleId, SalirParadaDto dto)
    {
        var detalle = await _repo.ObtenerDetalleAsync(detalleId);
        if (detalle == null) return false;

        var ruta = await _repo.ObtenerEntidadAsync(detalle.RutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        return await _repo.SalirDeParadaAsync(detalleId, DateTime.UtcNow, dto.VisitaId, dto.PedidoId, dto.Notas);
    }

    public async Task<bool> OmitirParadaAsync(int detalleId, OmitirParadaDto dto)
    {
        var detalle = await _repo.ObtenerDetalleAsync(detalleId);
        if (detalle == null) return false;

        var ruta = await _repo.ObtenerEntidadAsync(detalle.RutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        return await _repo.OmitirParadaAsync(detalleId, dto.RazonOmision);
    }

    public async Task<RutaDetalleDto?> ObtenerParadaActualAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return null;

        return await _repo.ObtenerParadaActualAsync(rutaId);
    }

    public async Task<RutaDetalleDto?> ObtenerSiguienteParadaAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return null;

        return await _repo.ObtenerSiguienteParadaAsync(rutaId);
    }

    // Toggle activo
    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);

    // === Carga de inventario ===

    public Task<List<RutaCargaDto>> ObtenerCargaAsync(int rutaId)
        => _repo.ObtenerCargaAsync(rutaId, _tenant.TenantId);

    public async Task AsignarProductoVentaAsync(int rutaId, AsignarProductoVentaRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        if (ruta.Estado != EstadoRuta.Planificada && ruta.Estado != EstadoRuta.PendienteAceptar)
            throw new InvalidOperationException("No se pueden agregar productos a una ruta en este estado");

        await _repo.AsignarProductoVentaAsync(rutaId, dto.ProductoId, dto.Cantidad, dto.PrecioUnitario ?? 0, _tenant.TenantId);
    }

    public async Task RemoverProductoCargaAsync(int rutaId, int productoId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        await _repo.RemoverProductoCargaAsync(rutaId, productoId, _tenant.TenantId);
    }

    public Task<List<RutaPedidoAsignadoDto>> ObtenerPedidosAsignadosAsync(int rutaId)
        => _repo.ObtenerPedidosAsignadosAsync(rutaId, _tenant.TenantId);

    public async Task AsignarPedidoAsync(int rutaId, int pedidoId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        await _repo.AsignarPedidoAsync(rutaId, pedidoId, _tenant.TenantId);
    }

    public async Task RemoverPedidoAsync(int rutaId, int pedidoId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        await _repo.RemoverPedidoAsync(rutaId, pedidoId, _tenant.TenantId);
    }

    public async Task ActualizarEfectivoInicialAsync(int rutaId, ActualizarEfectivoRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        await _repo.ActualizarEfectivoInicialAsync(rutaId, dto.Monto, dto.Comentarios, _tenant.TenantId);
    }

    public async Task EnviarACargaAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        if (ruta.Estado != EstadoRuta.Planificada)
            throw new InvalidOperationException("Solo se pueden enviar a carga rutas planificadas");

        await _repo.EnviarACargaAsync(rutaId, _tenant.TenantId);
    }

    // === Cierre de ruta ===

    public Task<CierreRutaResumenDto> ObtenerResumenCierreAsync(int rutaId)
        => _repo.ObtenerResumenCierreAsync(rutaId, _tenant.TenantId);

    public Task<List<RutaRetornoItemDto>> ObtenerRetornoInventarioAsync(int rutaId)
        => _repo.ObtenerRetornoInventarioAsync(rutaId, _tenant.TenantId);

    public async Task ActualizarRetornoAsync(int rutaId, int productoId, ActualizarRetornoRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        await _repo.ActualizarRetornoAsync(rutaId, productoId, dto.Mermas, dto.RecAlmacen, dto.CargaVehiculo, _tenant.TenantId);
    }

    public async Task CerrarRutaAsync(int rutaId, CerrarRutaRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        if (ruta.Estado != EstadoRuta.Completada)
            throw new InvalidOperationException("Solo se pueden cerrar rutas completadas/terminadas");

        // Update retornos if provided
        if (dto.Retornos?.Any() == true)
        {
            foreach (var retorno in dto.Retornos)
            {
                await _repo.ActualizarRetornoAsync(rutaId, retorno.ProductoId, retorno.Mermas, retorno.RecAlmacen, retorno.CargaVehiculo, _tenant.TenantId);
            }
        }

        await _repo.CerrarRutaAsync(rutaId, dto.MontoRecibido, _tenant.UserId, _tenant.TenantId);
    }

    /// <summary>
    /// Generates an AI-powered natural language summary of a closed route.
    /// Returns null if AI gateway is unavailable or credits are insufficient.
    /// </summary>
    public async Task<string?> GenerarResumenDiarioAsync(int rutaId)
    {
        if (_aiGateway == null) return null;

        try
        {
            var resumen = await ObtenerResumenCierreAsync(rutaId);
            var userId = int.TryParse(_tenant.UserId, out var uid) ? uid : 0;

            var prompt = $@"Genera un resumen ejecutivo en español de la ruta de venta del día:
- Ventas contado: {resumen.VentasContadoCount} pedidos por ${resumen.VentasContado:N2}
- Entregas cobradas: {resumen.EntregasCobradasCount} por ${resumen.EntregasCobradas:N2}
- Cobranza de adeudos: {resumen.CobranzaAdeudosCount} por ${resumen.CobranzaAdeudos:N2}
- Ventas a crédito: {resumen.VentasCreditoCount} por ${resumen.VentasCredito:N2}
- Entregas a crédito: {resumen.EntregasCreditoCount} por ${resumen.EntregasCredito:N2}
- Preventas: {resumen.PedidosPreventaCount} por ${resumen.PedidosPreventa:N2}
- Devoluciones: {resumen.DevolucionesCount} por ${resumen.Devoluciones:N2}
- Valor de ruta: ${resumen.ValorRuta:N2}
- Efectivo inicial: ${resumen.EfectivoInicial:N2}
- A recibir: ${resumen.ARecibir:N2}
- Recibido: ${resumen.Recibido:N2}
- Diferencia: ${resumen.Diferencia:N2}
Sé conciso (3-4 oraciones), destaca logros y puntos de atención.";

            var response = await _aiGateway.ProcessRequestAsync(
                new AiRequestDto("resumen", prompt),
                _tenant.TenantId,
                userId);

            return response.Respuesta;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error generating AI route summary for ruta {RutaId}", rutaId);
            return null;
        }
    }
}
