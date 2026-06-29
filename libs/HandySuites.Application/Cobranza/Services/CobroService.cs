using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Shared.Multitenancy;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace HandySuites.Application.Cobranza.Services;

public class CobroService
{
    /// <summary>
    /// Feature code para SubscriptionFeatureGuard. Mirror del campo
    /// SubscriptionPlan.PermitirAnticiposEnCampo.
    /// </summary>
    public const string FeatureAnticiposEnCampo = "anticipos_en_campo";

    private readonly ICobroRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly IClienteRepository _clienteRepo;
    private readonly IPedidoRepository _pedidoRepo;
    private readonly ISubscriptionFeatureGuard _featureGuard;
    private readonly ICobroFifoAplicadorService? _fifoAplicador;
    private readonly ILogger<CobroService> _logger;

    public CobroService(
        ICobroRepository repo,
        ICurrentTenant tenant,
        IClienteRepository clienteRepo,
        IPedidoRepository pedidoRepo,
        ISubscriptionFeatureGuard featureGuard,
        ICobroFifoAplicadorService? fifoAplicador = null,
        ILogger<CobroService>? logger = null)
    {
        _repo = repo;
        _tenant = tenant;
        _clienteRepo = clienteRepo;
        _pedidoRepo = pedidoRepo;
        _featureGuard = featureGuard;
        _fifoAplicador = fifoAplicador;
        _logger = logger ?? NullLogger<CobroService>.Instance;
    }

    public Task<List<CobroDto>> ObtenerCobrosAsync(int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null)
    {
        // RBAC: Vendedor solo ve sus cobros
        if (!_tenant.IsAdminOrAbove && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                usuarioId = vendedorId;
        }

        return _repo.ObtenerCobrosAsync(_tenant.TenantId, clienteId, desde, hasta, usuarioId);
    }

    /// <summary>
    /// Agregado del periodo para el list GET /cobros. Aplica los MISMOS filtros
    /// y la MISMA regla RBAC que ObtenerCobrosAsync (vendedor solo ve sus cobros)
    /// para que `resumen` coincida exactamente con el set que `items` muestra.
    /// </summary>
    public Task<CobroPeriodoResumenDto> ObtenerResumenPeriodoAsync(int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null)
    {
        // RBAC: Vendedor solo ve sus cobros (mismo guard que ObtenerCobrosAsync).
        if (!_tenant.IsAdminOrAbove && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                usuarioId = vendedorId;
        }

        return _repo.ObtenerResumenPeriodoAsync(_tenant.TenantId, clienteId, desde, hasta, usuarioId);
    }

    public Task<CobroDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearAsync(CobroCreateDto dto)
    {
        var currentUserId = _tenant.UserId;
        _logger.LogInformation(
            "CobroService.CrearAsync iniciando. ClienteId={ClienteId}, PedidoId={PedidoId}, Modo={Modo}, UsuarioId={UsuarioId}",
            dto.ClienteId, dto.PedidoId, dto.Modo, currentUserId);

        // 2026-06-08 (plan eager-drifting cobros 3 modos): validar coherencia
        // del Modo con el resto del payload + feature gate del plan.
        switch (dto.Modo)
        {
            case ModoCobroDto.PorPedido:
                if (!dto.PedidoId.HasValue)
                {
                    _logger.LogWarning(
                        "CobroService.CrearAsync Modo=PorPedido sin PedidoId. ClienteId={ClienteId}",
                        dto.ClienteId);
                    throw new InvalidOperationException(
                        "El modo 'Pago de pedido' requiere seleccionar un pedido especifico.");
                }
                break;
            case ModoCobroDto.AbonoFifo:
                // FIFO: delega al distribuidor que crea N cobros children
                // (uno per-pedido tocado en orden FIFO). Retorna el id del
                // PRIMER cobro creado para mantener contract `Task<int>` —
                // si UI quiere ver la breakdown completa, usar CrearFifoAsync.
                if (_fifoAplicador == null)
                {
                    _logger.LogError(
                        "CobroService.CrearAsync Modo=AbonoFifo pero ICobroFifoAplicadorService no esta inyectado. " +
                        "Constructor opcional → DI mal configurado en este host.");
                    throw new InvalidOperationException(
                        "El modo 'Abono a cuenta' no esta disponible en este servicio.");
                }
                if (dto.PedidoId.HasValue)
                {
                    throw new InvalidOperationException(
                        "El modo 'Abono a cuenta' no debe llevar pedido especifico — la distribucion es automatica FIFO.");
                }
                var aplicaciones = await _fifoAplicador.DistribuirAsync(
                    dto.ClienteId, dto.Monto, dto.MetodoPago, dto.FechaCobro, dto.Referencia, dto.Notas);
                _logger.LogInformation(
                    "CobroService.CrearAsync Modo=AbonoFifo completado. ClienteId={ClienteId}, NumAplicaciones={Num}, PrimerCobroId={CobroId}",
                    dto.ClienteId, aplicaciones.Count, aplicaciones.FirstOrDefault()?.CobroId);
                return aplicaciones.First().CobroId;
            case ModoCobroDto.Anticipo:
                // Feature gate: solo planes con PermitirAnticiposEnCampo=true.
                // Throw FeatureNotInPlanException si el plan no lo incluye —
                // mobile/web deberian gating la UI antes pero defense-in-depth.
                await _featureGuard.RequireFeatureAsync(_tenant.TenantId, FeatureAnticiposEnCampo);
                if (dto.PedidoId.HasValue)
                {
                    _logger.LogWarning(
                        "CobroService.CrearAsync Modo=Anticipo con PedidoId={PedidoId} — incoherente",
                        dto.PedidoId.Value);
                    throw new InvalidOperationException(
                        "El modo 'Anticipo' no debe llevar pedido especifico — genera saldo a favor del cliente.");
                }
                break;
        }

        // BR-C-monto: el monto debe ser estrictamente positivo. Antes el endpoint
        // mobile aceptaba 0 y negativos porque no había validación en el Service
        // (la validación existía solo en UpsertCobroAsync del SyncRepository).
        if (dto.Monto <= 0)
        {
            _logger.LogWarning(
                "CobroService.CrearAsync validación fallida: Monto inválido ({Monto}) para ClienteId={ClienteId}",
                dto.Monto, dto.ClienteId);
            throw new InvalidOperationException("El monto del cobro debe ser mayor a cero.");
        }

        // BR-050 (Audit MEDIUM-11, Abril 2026): validar que ClienteId y PedidoId
        // pertenezcan al tenant del caller antes de crear el cobro. RLS ya mitiga
        // a nivel DB pero app-layer debe validar para devolver errores accionables
        // y evitar dependencia exclusiva del fallo silencioso del query filter.
        var cliente = await _clienteRepo.ObtenerPorIdAsync(dto.ClienteId, _tenant.TenantId);
        if (cliente == null)
        {
            _logger.LogWarning(
                "CobroService.CrearAsync validación fallida: ClienteId={ClienteId} no existe o no pertenece al tenant {TenantId}",
                dto.ClienteId, _tenant.TenantId);
            throw new InvalidOperationException("El cliente especificado no existe o no pertenece a tu empresa.");
        }

        if (dto.PedidoId.HasValue)
        {
            var pedido = await _pedidoRepo.ObtenerPorIdAsync(dto.PedidoId.Value, _tenant.TenantId);
            if (pedido == null)
            {
                _logger.LogWarning(
                    "CobroService.CrearAsync validación fallida: PedidoId={PedidoId} no existe o no pertenece al tenant {TenantId}",
                    dto.PedidoId.Value, _tenant.TenantId);
                throw new InvalidOperationException("El pedido especificado no existe o no pertenece a tu empresa.");
            }

            // BR-050b: el pedido vinculado al cobro debe ser del mismo cliente;
            // de lo contrario se corrompen los saldos del cliente correcto.
            if (pedido.ClienteId != dto.ClienteId)
            {
                _logger.LogWarning(
                    "CobroService.CrearAsync validación fallida: PedidoId={PedidoId} pertenece a ClienteId={PedidoClienteId} pero el cobro apunta a ClienteId={ClienteId}",
                    dto.PedidoId.Value, pedido.ClienteId, dto.ClienteId);
                throw new InvalidOperationException("El pedido no pertenece al cliente especificado.");
            }

            // BR-050c: no tiene sentido cobrar un pedido Cancelado (sin saldo) ni uno
            // en Borrador (aún no se entregó). Sólo Confirmado/EnRuta/Entregado generan saldo.
            if (pedido.Estado == HandySuites.Domain.Entities.EstadoPedido.Cancelado)
            {
                _logger.LogWarning(
                    "CobroService.CrearAsync validación fallida: PedidoId={PedidoId} está Cancelado",
                    dto.PedidoId.Value);
                throw new InvalidOperationException("No se puede cobrar un pedido cancelado.");
            }
            if (pedido.Estado == HandySuites.Domain.Entities.EstadoPedido.Borrador)
            {
                _logger.LogWarning(
                    "CobroService.CrearAsync validación fallida: PedidoId={PedidoId} está en Borrador",
                    dto.PedidoId.Value);
                throw new InvalidOperationException("No se puede cobrar un pedido en borrador. Confírmalo primero.");
            }
        }

        // BR-050d: la fecha de cobro no puede estar en el futuro (más de un día de tolerancia
        // para diferencias de zona horaria del dispositivo). Tampoco aceptamos fechas
        // ridículamente pasadas (> 20 años) por limpieza de datos.
        var ahora = DateTime.UtcNow;
        if (dto.FechaCobro > ahora.AddDays(1))
        {
            _logger.LogWarning(
                "CobroService.CrearAsync validación fallida: FechaCobro={FechaCobro} es futura",
                dto.FechaCobro);
            throw new InvalidOperationException("La fecha de cobro no puede ser futura.");
        }
        if (dto.FechaCobro < ahora.AddYears(-20))
        {
            _logger.LogWarning(
                "CobroService.CrearAsync validación fallida: FechaCobro={FechaCobro} es demasiado antigua",
                dto.FechaCobro);
            throw new InvalidOperationException("La fecha de cobro es demasiado antigua.");
        }

        var cobroId = await _repo.CrearAsync(dto, _tenant.TenantId, int.Parse(_tenant.UserId));
        _logger.LogInformation(
            "CobroService.CrearAsync completado. CobroId={CobroId}, ClienteId={ClienteId}, PedidoId={PedidoId}, UsuarioId={UsuarioId}",
            cobroId, dto.ClienteId, dto.PedidoId, currentUserId);
        return cobroId;
    }

    /// <summary>
    /// 2026-06-08 PR 2 plan eager-drifting cobros: convenience wrapper que
    /// retorna la breakdown FIFO completa (lista de cobros creados per-pedido).
    /// Endpoints web/mobile pueden usar este metodo si quieren mostrar al user
    /// "Se aplicaron $X a PED-001, $Y a PED-002, $Z a PED-003" tras submit.
    /// </summary>
    public async Task<List<FifoAplicacionDto>> CrearFifoAsync(CobroCreateDto dto)
    {
        if (dto.Modo != ModoCobroDto.AbonoFifo)
            throw new InvalidOperationException("CrearFifoAsync requires Modo=AbonoFifo.");
        if (dto.Monto <= 0)
            throw new InvalidOperationException("El monto del cobro debe ser mayor a cero.");
        if (dto.PedidoId.HasValue)
            throw new InvalidOperationException(
                "El modo 'Abono a cuenta' no debe llevar pedido especifico.");
        if (_fifoAplicador == null)
            throw new InvalidOperationException(
                "El modo 'Abono a cuenta' no esta disponible en este servicio.");

        // Validar cliente pertenece al tenant (mismo guard del CrearAsync).
        var cliente = await _clienteRepo.ObtenerPorIdAsync(dto.ClienteId, _tenant.TenantId);
        if (cliente == null)
            throw new InvalidOperationException(
                "El cliente especificado no existe o no pertenece a tu empresa.");

        return await _fifoAplicador.DistribuirAsync(
            dto.ClienteId, dto.Monto, dto.MetodoPago, dto.FechaCobro, dto.Referencia, dto.Notas);
    }

    public Task<bool> ActualizarAsync(int id, CobroUpdateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

    public Task<bool> AnularAsync(int id)
        => _repo.AnularAsync(id, _tenant.TenantId);

    public Task<List<SaldoClienteDto>> ObtenerSaldosAsync(int? clienteId = null)
        => _repo.ObtenerSaldosAsync(_tenant.TenantId, clienteId);

    public Task<ResumenCarteraDto> ObtenerResumenCarteraAsync()
        => _repo.ObtenerResumenCarteraAsync(_tenant.TenantId);

    public Task<EstadoCuentaDto?> ObtenerEstadoCuentaAsync(int clienteId, bool historico = false)
        => _repo.ObtenerEstadoCuentaAsync(clienteId, _tenant.TenantId, historico);
}
