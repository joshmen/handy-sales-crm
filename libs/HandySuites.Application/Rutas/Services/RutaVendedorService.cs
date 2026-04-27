using HandySuites.Application.Ai.DTOs;
using HandySuites.Application.Ai.Interfaces;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Rutas.DTOs;
using HandySuites.Application.Rutas.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.Extensions.Logging;

namespace HandySuites.Application.Rutas.Services;

public class RutaVendedorService
{
    private readonly IRutaVendedorRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly ITransactionManager _transactions;
    private readonly IAiGatewayService? _aiGateway;
    private readonly ILogger<RutaVendedorService>? _logger;

    public RutaVendedorService(
        IRutaVendedorRepository repo,
        ICurrentTenant tenant,
        ITransactionManager transactions,
        IAiGatewayService? aiGateway = null,
        ILogger<RutaVendedorService>? logger = null)
    {
        _repo = repo;
        _tenant = tenant;
        _transactions = transactions;
        _aiGateway = aiGateway;
        _logger = logger;
    }

    // Vendedor/Viewer solo pueden operar paradas/estado de sus propias rutas.
    // Admin, SuperAdmin y Supervisor pueden operar cualquier ruta del tenant.
    private void EnsureRutaOperable(RutaVendedor ruta)
    {
        if (_tenant.IsAdmin || _tenant.IsSuperAdmin || _tenant.IsSupervisor) return;
        if (int.TryParse(_tenant.UserId, out var currentUserId) && ruta.UsuarioId == currentUserId) return;
        throw new UnauthorizedAccessException("No tienes permisos para operar esta ruta.");
    }

    public async Task<int> CrearAsync(RutaVendedorCreateDto dto)
    {
        // RBAC: vendedor/viewer solo puede crear rutas para sí mismo.
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin && !_tenant.IsSupervisor
            && !dto.EsTemplate
            && int.TryParse(_tenant.UserId, out var currentUserId)
            && dto.UsuarioId != currentUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para asignar rutas a otros vendedores.");
        }

        // Existence checks (antes caían en 500 por FK violation).
        if (!dto.EsTemplate && !await _repo.ExisteUsuarioEnTenantAsync(dto.UsuarioId, _tenant.TenantId))
            throw new InvalidOperationException("El vendedor seleccionado no existe o no pertenece a tu empresa.");
        if (dto.ZonaId is int zId && zId > 0
            && !await _repo.ExisteZonaEnTenantAsync(zId, _tenant.TenantId))
            throw new InvalidOperationException("La zona seleccionada no existe o no pertenece a tu empresa.");

        var ruta = new RutaVendedor
        {
            TenantId = _tenant.TenantId,
            UsuarioId = dto.EsTemplate ? null : dto.UsuarioId,
            ZonaId = dto.ZonaId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            Fecha = dto.EsTemplate ? DateTime.UtcNow.Date : dto.Fecha.Date,
            HoraInicioEstimada = dto.HoraInicioEstimada,
            HoraFinEstimada = dto.HoraFinEstimada,
            Notas = dto.Notas,
            EsTemplate = dto.EsTemplate,
            Estado = EstadoRuta.Planificada,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        // BR-040 (Audit HIGH-5, Abril 2026): header + detalles atómico. Si falla
        // cualquier detalle, la ruta entera rollback — no dejamos paradas parciales.
        return await _transactions.ExecuteInTransactionAsync(async () =>
        {
            var rutaId = await _repo.CrearAsync(ruta);

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
        });
    }

    public async Task<RutaVendedorDto?> ObtenerPorIdAsync(int id)
    {
        var ruta = await _repo.ObtenerPorIdAsync(id);
        if (ruta == null) return null;

        // Validar tenant
        var entidad = await _repo.ObtenerEntidadAsync(id);
        if (entidad?.TenantId != _tenant.TenantId && !_tenant.IsSuperAdmin)
            throw new UnauthorizedAccessException("No tienes permisos para ver esta ruta");

        // RBAC: vendedor/viewer solo ve sus propias rutas (consistente con ObtenerPorFiltroAsync).
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin && !_tenant.IsSupervisor
            && int.TryParse(_tenant.UserId, out var currentUserId)
            && entidad?.UsuarioId != currentUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para ver esta ruta");
        }

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

        // RBAC: vendedor/viewer solo puede editar sus propias rutas y no puede reasignarlas.
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin && !_tenant.IsSupervisor
            && int.TryParse(_tenant.UserId, out var currentUserId))
        {
            if (ruta.UsuarioId != currentUserId)
                throw new UnauthorizedAccessException("No tienes permisos para editar rutas de otros vendedores.");
            if (dto.UsuarioId.HasValue && dto.UsuarioId.Value != currentUserId)
                throw new UnauthorizedAccessException("No tienes permisos para reasignar rutas a otros vendedores.");
        }

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

        // RBAC: vendedor/viewer solo puede eliminar sus propias rutas.
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin && !_tenant.IsSupervisor
            && int.TryParse(_tenant.UserId, out var currentUserId)
            && ruta.UsuarioId != currentUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para eliminar rutas de otros vendedores.");
        }

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

        // BR-RUTA-Iniciar (defensa en profundidad): la validación principal está en
        // EnviarACargaAsync, pero si por algún flujo (template, importación, bug en
        // otro endpoint) una ruta llega a CargaAceptada sin items, bloqueamos también
        // aquí. Reportado 2026-04-27: usuario logró iniciar una ruta sin paradas
        // saltándose la validación de EnviarACargaAsync.
        var faltantes = new List<string>();
        if (ruta.Detalles == null || !ruta.Detalles.Any(d => d.Activo))
            faltantes.Add("paradas");
        var pedidosAsignados = await _repo.ObtenerPedidosAsignadosAsync(id, _tenant.TenantId);
        if (pedidosAsignados.Count == 0)
            faltantes.Add("pedidos asignados");
        if (faltantes.Count > 0)
            throw new InvalidOperationException(
                $"No se puede iniciar la ruta: faltan {string.Join(", ", faltantes)}.");

        return await _repo.IniciarRutaAsync(id, DateTime.UtcNow);
    }

    public async Task<bool> AceptarRutaAsync(int id)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        var usuarioId = int.Parse(_tenant.UserId);
        if (ruta.UsuarioId != usuarioId && !_tenant.IsAdmin)
            throw new UnauthorizedAccessException("Solo el vendedor asignado puede aceptar esta ruta");

        return await _repo.AceptarRutaAsync(id, DateTime.UtcNow);
    }

    public async Task<bool> CompletarRutaAsync(int id, double? kilometrosReales = null)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        // Solo el vendedor asignado, admin/super_admin o supervisor pueden completar.
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin && !_tenant.IsSupervisor
            && int.TryParse(_tenant.UserId, out var currentUserId)
            && ruta.UsuarioId != currentUserId)
        {
            throw new UnauthorizedAccessException("Solo el vendedor asignado puede completar esta ruta");
        }

        return await _repo.CompletarRutaAsync(id, DateTime.UtcNow, kilometrosReales);
    }

    public async Task<bool> CancelarRutaAsync(int id, string? motivo)
    {
        var (ok, _, _) = await CancelarRutaDetalladoAsync(id, motivo);
        return ok;
    }

    /// <summary>
    /// Cancela la ruta y retorna info necesaria para que el endpoint web emita
    /// push notification al vendedor cuando la ruta estaba activa (CargaAceptada o
    /// EnProgreso). Antes el admin podía cancelar una ruta corriendo y el vendedor
    /// no se enteraba hasta el siguiente sync manual.
    /// </summary>
    public async Task<(bool Ok, EstadoRuta? EstadoPrevio, int? VendedorId)> CancelarRutaDetalladoAsync(int id, string? motivo)
    {
        var ruta = await _repo.ObtenerEntidadAsync(id);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return (false, null, null);

        // Solo el vendedor asignado, admin/super_admin o supervisor pueden cancelar.
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin && !_tenant.IsSupervisor
            && int.TryParse(_tenant.UserId, out var currentUserId)
            && ruta.UsuarioId != currentUserId)
        {
            throw new UnauthorizedAccessException("Solo el vendedor asignado puede cancelar esta ruta");
        }

        var estadoPrevio = ruta.Estado;
        var ok = await _repo.CancelarRutaAsync(id, motivo);
        return (ok, estadoPrevio, ruta.UsuarioId);
    }

    // Gestión de paradas
    public async Task<int> AgregarParadaAsync(int rutaId, RutaDetalleCreateDto dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        if (ruta.Estado != EstadoRuta.Planificada && ruta.Estado != EstadoRuta.PendienteAceptar)
            throw new InvalidOperationException("Solo se pueden agregar paradas a rutas planificadas o pendientes de aceptar");

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

        EnsureRutaOperable(ruta);

        if (ruta.Estado != EstadoRuta.Planificada)
            throw new InvalidOperationException("No se pueden eliminar paradas de una ruta en progreso");

        return await _repo.EliminarDetalleAsync(detalleId);
    }

    public async Task<bool> ReordenarParadasAsync(int rutaId, ReordenarParadasDto dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        EnsureRutaOperable(ruta);

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

        EnsureRutaOperable(ruta);

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

        EnsureRutaOperable(ruta);

        return await _repo.SalirDeParadaAsync(detalleId, DateTime.UtcNow, dto.VisitaId, dto.PedidoId, dto.Notas);
    }

    public async Task<bool> OmitirParadaAsync(int detalleId, OmitirParadaDto dto)
    {
        var detalle = await _repo.ObtenerDetalleAsync(detalleId);
        if (detalle == null) return false;

        var ruta = await _repo.ObtenerEntidadAsync(detalle.RutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return false;

        EnsureRutaOperable(ruta);

        return await _repo.OmitirParadaAsync(detalleId, dto.RazonOmision);
    }

    public async Task<RutaDetalleDto?> ObtenerParadaActualAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return null;

        EnsureRutaOperable(ruta);

        return await _repo.ObtenerParadaActualAsync(rutaId);
    }

    public async Task<RutaDetalleDto?> ObtenerSiguienteParadaAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return null;

        EnsureRutaOperable(ruta);

        return await _repo.ObtenerSiguienteParadaAsync(rutaId);
    }

    // === Templates ===

    public async Task<List<RutaTemplateListaDto>> ObtenerTemplatesAsync()
    {
        return await _repo.ObtenerTemplatesAsync(_tenant.TenantId);
    }

    public async Task<int> InstanciarTemplateAsync(int templateId, InstanciarTemplateDto dto)
    {
        if (dto.UsuarioId <= 0)
            throw new InvalidOperationException("Debe seleccionar un vendedor para asignar la ruta.");

        var template = await _repo.ObtenerTemplateConDetallesAsync(templateId, _tenant.TenantId);
        if (template == null)
            throw new InvalidOperationException("Template no encontrado");

        if (!await _repo.ExisteUsuarioEnTenantAsync(dto.UsuarioId, _tenant.TenantId))
            throw new InvalidOperationException("El vendedor seleccionado no existe o no pertenece a tu empresa.");

        var ruta = new RutaVendedor
        {
            TenantId = _tenant.TenantId,
            UsuarioId = dto.UsuarioId,
            ZonaId = template.ZonaId,
            Nombre = template.Nombre,
            Descripcion = template.Descripcion,
            Fecha = dto.Fecha.Date,
            HoraInicioEstimada = dto.HoraInicioEstimada ?? template.HoraInicioEstimada,
            HoraFinEstimada = dto.HoraFinEstimada ?? template.HoraFinEstimada,
            Notas = template.Notas,
            KilometrosEstimados = template.KilometrosEstimados,
            EsTemplate = false,
            Estado = EstadoRuta.Planificada,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        // BR-040: instanciación atómica — header + copia de paradas en una transacción.
        return await _transactions.ExecuteInTransactionAsync(async () =>
        {
            var rutaId = await _repo.CrearAsync(ruta);

            // Copy paradas from template
            foreach (var detalle in template.Detalles.OrderBy(d => d.OrdenVisita))
            {
                var nuevoDetalle = new RutaDetalle
                {
                    RutaId = rutaId,
                    ClienteId = detalle.ClienteId,
                    OrdenVisita = detalle.OrdenVisita,
                    HoraEstimadaLlegada = detalle.HoraEstimadaLlegada,
                    DuracionEstimadaMinutos = detalle.DuracionEstimadaMinutos,
                    Notas = detalle.Notas,
                    Estado = EstadoParada.Pendiente,
                    CreadoEn = DateTime.UtcNow,
                    CreadoPor = _tenant.UserId
                };
                await _repo.AgregarDetalleAsync(nuevoDetalle);
            }

            return rutaId;
        });
    }

    public async Task<int> DuplicarTemplateAsync(int templateId)
    {
        var template = await _repo.ObtenerTemplateConDetallesAsync(templateId, _tenant.TenantId);
        if (template == null)
            throw new InvalidOperationException("Template no encontrado");

        var copia = new RutaVendedor
        {
            TenantId = _tenant.TenantId,
            ZonaId = template.ZonaId,
            Nombre = $"{template.Nombre} (Copia)",
            Descripcion = template.Descripcion,
            HoraInicioEstimada = template.HoraInicioEstimada,
            HoraFinEstimada = template.HoraFinEstimada,
            Notas = template.Notas,
            KilometrosEstimados = template.KilometrosEstimados,
            EsTemplate = true,
            Estado = EstadoRuta.Planificada,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        // BR-040: duplicación atómica.
        return await _transactions.ExecuteInTransactionAsync(async () =>
        {
            var copiaId = await _repo.CrearAsync(copia);

            // Copy paradas from original template
            foreach (var detalle in template.Detalles.OrderBy(d => d.OrdenVisita))
            {
                var nuevoDetalle = new RutaDetalle
                {
                    RutaId = copiaId,
                    ClienteId = detalle.ClienteId,
                    OrdenVisita = detalle.OrdenVisita,
                    HoraEstimadaLlegada = detalle.HoraEstimadaLlegada,
                    DuracionEstimadaMinutos = detalle.DuracionEstimadaMinutos,
                    Notas = detalle.Notas,
                    Estado = EstadoParada.Pendiente,
                    CreadoEn = DateTime.UtcNow,
                    CreadoPor = _tenant.UserId
                };
                await _repo.AgregarDetalleAsync(nuevoDetalle);
            }

            return copiaId;
        });
    }

    // Toggle activo
    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);

    // === Carga de inventario ===

    public async Task<List<RutaCargaDto>> ObtenerCargaAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return new List<RutaCargaDto>();
        EnsureRutaOperable(ruta);
        return await _repo.ObtenerCargaAsync(rutaId, _tenant.TenantId);
    }

    public async Task AsignarProductoVentaAsync(int rutaId, AsignarProductoVentaRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        if (ruta.Estado != EstadoRuta.Planificada && ruta.Estado != EstadoRuta.PendienteAceptar)
            throw new InvalidOperationException("No se pueden agregar productos a una ruta en este estado");

        await _repo.AsignarProductoVentaAsync(rutaId, dto.ProductoId, dto.Cantidad, dto.PrecioUnitario ?? 0, _tenant.TenantId);
    }

    public async Task RemoverProductoCargaAsync(int rutaId, int productoId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        await _repo.RemoverProductoCargaAsync(rutaId, productoId, _tenant.TenantId);
    }

    public async Task<List<RutaPedidoAsignadoDto>> ObtenerPedidosAsignadosAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId) return new List<RutaPedidoAsignadoDto>();
        EnsureRutaOperable(ruta);
        return await _repo.ObtenerPedidosAsignadosAsync(rutaId, _tenant.TenantId);
    }

    /// <summary>
    /// Asigna un pedido a la ruta. Retorna info necesaria para que el endpoint
    /// emita push notification al vendedor cuando la ruta ya está activa
    /// (CargaAceptada o EnProgreso) — antes el admin asignaba pedidos a una
    /// ruta corriendo y el vendedor no se enteraba hasta el siguiente sync manual.
    /// </summary>
    public async Task<(EstadoRuta Estado, int? VendedorId)> AsignarPedidoAsync(int rutaId, int pedidoId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        await _repo.AsignarPedidoAsync(rutaId, pedidoId, _tenant.TenantId);

        return (ruta.Estado, ruta.UsuarioId);
    }

    public async Task RemoverPedidoAsync(int rutaId, int pedidoId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        await _repo.RemoverPedidoAsync(rutaId, pedidoId, _tenant.TenantId);
    }

    public async Task ActualizarEfectivoInicialAsync(int rutaId, ActualizarEfectivoRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        await _repo.ActualizarEfectivoInicialAsync(rutaId, dto.Monto, dto.Comentarios, _tenant.TenantId);
    }

    public async Task EnviarACargaAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        if (ruta.Estado != EstadoRuta.Planificada)
            throw new InvalidOperationException("Solo se pueden enviar a carga rutas planificadas");

        // BR-RUTA-Carga: validar que la ruta tiene los 3 elementos mínimos antes de enviarla
        // al vendedor: paradas (clientes a visitar), pedidos asignados (carga del camión) y
        // productos para venta directa en ruta. Reportado 2026-04-27: el admin podía enviar
        // una ruta vacía y el vendedor recibía push de "ruta asignada" sin nada que entregar.
        var faltantes = new List<string>();
        if (ruta.Detalles == null || !ruta.Detalles.Any(d => d.Activo))
            faltantes.Add("paradas (clientes a visitar)");
        var pedidosAsignados = await _repo.ObtenerPedidosAsignadosAsync(rutaId, _tenant.TenantId);
        if (pedidosAsignados.Count == 0)
            faltantes.Add("pedidos asignados");
        var carga = await _repo.ObtenerCargaAsync(rutaId, _tenant.TenantId);
        if (carga.Count == 0)
            faltantes.Add("productos de carga");

        if (faltantes.Count > 0)
            throw new InvalidOperationException(
                $"No se puede enviar la ruta a carga: faltan {string.Join(", ", faltantes)}.");

        await _repo.EnviarACargaAsync(rutaId, _tenant.TenantId);
    }

    // === Cierre de ruta ===

    public async Task<CierreRutaResumenDto> ObtenerResumenCierreAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta != null && ruta.TenantId == _tenant.TenantId) EnsureRutaOperable(ruta);
        return await _repo.ObtenerResumenCierreAsync(rutaId, _tenant.TenantId);
    }

    public async Task<List<RutaRetornoItemDto>> ObtenerRetornoInventarioAsync(int rutaId)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta != null && ruta.TenantId == _tenant.TenantId) EnsureRutaOperable(ruta);
        return await _repo.ObtenerRetornoInventarioAsync(rutaId, _tenant.TenantId);
    }

    public async Task ActualizarRetornoAsync(int rutaId, int productoId, ActualizarRetornoRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

        await _repo.ActualizarRetornoAsync(rutaId, productoId, dto.Mermas, dto.RecAlmacen, dto.CargaVehiculo, _tenant.TenantId);
    }

    public async Task CerrarRutaAsync(int rutaId, CerrarRutaRequest dto)
    {
        var ruta = await _repo.ObtenerEntidadAsync(rutaId);
        if (ruta == null || ruta.TenantId != _tenant.TenantId)
            throw new InvalidOperationException("Ruta no encontrada");

        EnsureRutaOperable(ruta);

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
