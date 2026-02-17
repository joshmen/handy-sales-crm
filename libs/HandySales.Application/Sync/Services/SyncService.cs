using HandySales.Application.Sync.DTOs;
using HandySales.Application.Sync.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Sync.Services;

public class SyncService
{
    private readonly ISyncRepository _repo;
    private readonly ICurrentTenant _tenant;

    public SyncService(ISyncRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public async Task<SyncResponseDto> SyncAsync(SyncRequestDto request)
    {
        var response = new SyncResponseDto
        {
            ServerTimestamp = DateTime.UtcNow
        };

        var tenantId = _tenant.TenantId;
        var usuarioId = int.Parse(_tenant.UserId);
        var since = request.LastSyncTimestamp;
        var entityTypes = request.EntityTypes ?? new List<string>();
        var syncAll = entityTypes.Count == 0;

        try
        {
            // 1. Push client changes to server
            if (request.ClientChanges != null)
            {
                await PushClientChangesAsync(request.ClientChanges, response, tenantId, usuarioId);
            }

            // 2. Pull server changes to client
            await PullServerChangesAsync(response, tenantId, usuarioId, since, entityTypes, syncAll);

            // 3. Save all changes
            await _repo.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            response.Errors.Add(new SyncErrorDto
            {
                EntityType = "sync",
                Operation = "sync",
                Message = "Error during sync operation",
                Details = ex.Message
            });
            response.Summary.ErrorsFound++;
        }

        return response;
    }

    private async Task PushClientChangesAsync(SyncChangesDto clientChanges, SyncResponseDto response, int tenantId, int usuarioId)
    {
        var userId = _tenant.UserId;

        // Push Clientes
        if (clientChanges.Clientes?.Any() == true)
        {
            foreach (var dto in clientChanges.Clientes)
            {
                try
                {
                    var (entity, wasConflict) = await _repo.UpsertClienteAsync(tenantId, dto, userId);
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "Cliente",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.ClientesPushed++;
                    }
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Cliente",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = ex.Message
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }

        // Push Pedidos
        if (clientChanges.Pedidos?.Any() == true)
        {
            foreach (var dto in clientChanges.Pedidos)
            {
                try
                {
                    var (entity, wasConflict) = await _repo.UpsertPedidoAsync(tenantId, usuarioId, dto, userId);
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "Pedido",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.PedidosPushed++;
                    }
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Pedido",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = ex.Message
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }

        // Push Visitas
        if (clientChanges.Visitas?.Any() == true)
        {
            foreach (var dto in clientChanges.Visitas)
            {
                try
                {
                    var (entity, wasConflict) = await _repo.UpsertVisitaAsync(tenantId, usuarioId, dto, userId);
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "Visita",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.VisitasPushed++;
                    }
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Visita",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = ex.Message
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }

        // Push Rutas (updates only - routes are assigned by admin)
        if (clientChanges.Rutas?.Any() == true)
        {
            foreach (var dto in clientChanges.Rutas.Where(r => r.Operation == SyncOperation.Update))
            {
                try
                {
                    var (entity, wasConflict) = await _repo.UpsertRutaAsync(tenantId, usuarioId, dto, userId);
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "Ruta",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.RutasPushed++;
                    }
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Ruta",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = ex.Message
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }
    }

    private async Task PullServerChangesAsync(SyncResponseDto response, int tenantId, int usuarioId, DateTime? since, List<string> entityTypes, bool syncAll)
    {
        response.ServerChanges = new SyncChangesDto();

        // Pull Clientes (read-only for vendors to view customer list)
        if (syncAll || entityTypes.Contains("clientes", StringComparer.OrdinalIgnoreCase))
        {
            var clientes = await _repo.GetClientesModifiedSinceAsync(tenantId, since);
            response.ServerChanges.Clientes = clientes.Select(c => new SyncClienteDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                RFC = c.RFC,
                Correo = c.Correo,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdZona = c.IdZona,
                CategoriaClienteId = c.CategoriaClienteId,
                Latitud = c.Latitud,
                Longitud = c.Longitud,
                Activo = c.Activo,
                Version = c.Version,
                ActualizadoEn = c.ActualizadoEn,
                IsDeleted = !c.Activo
            }).ToList();
            response.Summary.ClientesPulled = clientes.Count;
        }

        // Pull Productos (read-only for mobile)
        if (syncAll || entityTypes.Contains("productos", StringComparer.OrdinalIgnoreCase))
        {
            var productos = await _repo.GetProductosModifiedSinceAsync(tenantId, since);
            response.ServerChanges.Productos = productos.Select(p => new SyncProductoDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                SKU = p.CodigoBarra, // Using CodigoBarra as SKU
                Precio = p.PrecioBase, // Using PrecioBase as Precio
                CategoriaProductoId = p.CategoraId, // Using CategoraId as CategoriaProductoId
                FamiliaProductoId = p.FamiliaId, // Using FamiliaId as FamiliaProductoId
                UnidadMedidaId = p.UnidadMedidaId,
                ImagenUrl = null, // Producto doesn't have ImagenUrl
                Activo = p.Activo,
                Version = p.Version,
                ActualizadoEn = p.ActualizadoEn
            }).ToList();
            response.Summary.ProductosPulled = productos.Count;
        }

        // Pull Pedidos for this user
        if (syncAll || entityTypes.Contains("pedidos", StringComparer.OrdinalIgnoreCase))
        {
            var pedidos = await _repo.GetPedidosModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.Pedidos = pedidos.Select(p => new SyncPedidoDto
            {
                Id = p.Id,
                ClienteId = p.ClienteId,
                NumeroPedido = p.NumeroPedido,
                FechaPedido = p.FechaPedido,
                FechaEntregaEstimada = p.FechaEntregaEstimada,
                Estado = (int)p.Estado,
                Subtotal = p.Subtotal,
                Descuento = p.Descuento,
                Impuestos = p.Impuestos,
                Total = p.Total,
                Notas = p.Notas,
                DireccionEntrega = p.DireccionEntrega,
                Latitud = p.Latitud,
                Longitud = p.Longitud,
                ListaPrecioId = p.ListaPrecioId,
                Activo = p.Activo,
                Version = p.Version,
                ActualizadoEn = p.ActualizadoEn,
                IsDeleted = !p.Activo,
                Detalles = p.Detalles?.Select(d => new SyncDetallePedidoDto
                {
                    Id = d.Id,
                    ProductoId = d.ProductoId,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Descuento = d.Descuento,
                    PorcentajeDescuento = d.PorcentajeDescuento,
                    Subtotal = d.Subtotal,
                    Impuesto = d.Impuesto,
                    Total = d.Total,
                    Notas = d.Notas,
                    Version = d.Version
                }).ToList()
            }).ToList();
            response.Summary.PedidosPulled = pedidos.Count;
        }

        // Pull Visitas for this user
        if (syncAll || entityTypes.Contains("visitas", StringComparer.OrdinalIgnoreCase))
        {
            var visitas = await _repo.GetVisitasModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.Visitas = visitas.Select(v => new SyncVisitaDto
            {
                Id = v.Id,
                ClienteId = v.ClienteId,
                FechaProgramada = v.FechaProgramada,
                FechaHoraInicio = v.FechaHoraInicio,
                FechaHoraFin = v.FechaHoraFin,
                LatitudInicio = v.LatitudInicio,
                LongitudInicio = v.LongitudInicio,
                LatitudFin = v.LatitudFin,
                LongitudFin = v.LongitudFin,
                Estado = (int)v.TipoVisita, // Using TipoVisita as Estado
                Notas = v.Notas,
                PedidoId = v.PedidoId,
                Resultado = v.Resultado.ToString(), // Convert enum to string
                Fotos = v.Fotos,
                Activo = v.Activo,
                Version = v.Version,
                ActualizadoEn = v.ActualizadoEn,
                IsDeleted = !v.Activo
            }).ToList();
            response.Summary.VisitasPulled = visitas.Count;
        }

        // Pull Rutas for this user
        if (syncAll || entityTypes.Contains("rutas", StringComparer.OrdinalIgnoreCase))
        {
            var rutas = await _repo.GetRutasModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.Rutas = rutas.Select(r => new SyncRutaDto
            {
                Id = r.Id,
                ZonaId = r.ZonaId,
                Nombre = r.Nombre,
                Descripcion = r.Descripcion,
                Fecha = r.Fecha,
                HoraInicioEstimada = r.HoraInicioEstimada,
                HoraFinEstimada = r.HoraFinEstimada,
                HoraInicioReal = r.HoraInicioReal,
                HoraFinReal = r.HoraFinReal,
                Estado = (int)r.Estado,
                KilometrosEstimados = r.KilometrosEstimados,
                KilometrosReales = r.KilometrosReales,
                Notas = r.Notas,
                Activo = r.Activo,
                Version = r.Version,
                ActualizadoEn = r.ActualizadoEn,
                IsDeleted = !r.Activo,
                Detalles = r.Detalles?.Select(d => new SyncRutaDetalleDto
                {
                    Id = d.Id,
                    ClienteId = d.ClienteId,
                    OrdenVisita = d.OrdenVisita,
                    HoraEstimadaLlegada = d.HoraEstimadaLlegada,
                    DuracionEstimadaMinutos = d.DuracionEstimadaMinutos,
                    HoraLlegadaReal = d.HoraLlegadaReal,
                    HoraSalidaReal = d.HoraSalidaReal,
                    LatitudLlegada = d.Latitud, // Using Latitud as LatitudLlegada
                    LongitudLlegada = d.Longitud, // Using Longitud as LongitudLlegada
                    Estado = (int)d.Estado,
                    RazonOmision = d.RazonOmision,
                    VisitaId = d.VisitaId,
                    PedidoId = d.PedidoId,
                    Notas = d.Notas,
                    Version = d.Version
                }).ToList()
            }).ToList();
            response.Summary.RutasPulled = rutas.Count;
        }
    }
}
