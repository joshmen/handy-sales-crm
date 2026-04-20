using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Sync.Services;

public class SyncService
{
    private readonly ISyncRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly ITransactionManager _transactions;

    public SyncService(ISyncRepository repo, ICurrentTenant tenant, ITransactionManager transactions)
    {
        _repo = repo;
        _tenant = tenant;
        _transactions = transactions;
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

        // BR-060 (Audit HIGH-6, Abril 2026): wrap the whole batch in a transaction.
        // Previous behavior: the outer catch swallowed SaveChangesAsync failures, but
        // entities staged in the EF change tracker by per-entity upserts could still
        // commit partial/corrupt state if SaveChangesAsync happened to succeed.
        // With a transaction, either everything commits cleanly or everything rolls
        // back — no divergence between mobile and server.
        await using var tx = await _transactions.BeginTransactionAsync();

        try
        {
            // 1. Push client changes to server
            if (request.ClientChanges != null)
            {
                await PushClientChangesAsync(request.ClientChanges, response, tenantId, usuarioId);
            }

            // 2. Pull server changes to client
            await PullServerChangesAsync(response, tenantId, usuarioId, since, entityTypes, syncAll);

            // 3. Save all changes atomically
            await _repo.SaveChangesAsync();
            await _transactions.CommitTransactionAsync();
        }
        catch (Exception ex)
        {
            await _transactions.RollbackTransactionAsync();
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
                        if (!string.IsNullOrEmpty(dto.LocalId) && dto.Id == 0)
                        {
                            response.CreatedIdMappings.Add(new IdMappingDto { EntityType = "clientes", LocalId = dto.LocalId, ServerId = entity.Id });
                        }
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
                        // Return ID mapping for newly created records
                        // Note: with sendCreatedAsUpdated=true, Operation is always Update,
                        // so detect new records by Id==0 or presence of LocalId
                        if (!string.IsNullOrEmpty(dto.LocalId) && (dto.Id == 0 || dto.Operation == SyncOperation.Create))
                        {
                            response.CreatedIdMappings.Add(new IdMappingDto
                            {
                                EntityType = "pedidos",
                                LocalId = dto.LocalId,
                                ServerId = entity.Id
                            });
                        }
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
                        if (!string.IsNullOrEmpty(dto.LocalId) && dto.Id == 0)
                        {
                            response.CreatedIdMappings.Add(new IdMappingDto { EntityType = "visitas", LocalId = dto.LocalId, ServerId = entity.Id });
                        }
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

        // Push Cobros
        if (clientChanges.Cobros?.Any() == true)
        {
            foreach (var dto in clientChanges.Cobros)
            {
                try
                {
                    var (entity, wasConflict) = await _repo.UpsertCobroAsync(tenantId, usuarioId, dto, userId);
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "Cobro",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.CobrosPushed++;
                        if (!string.IsNullOrEmpty(dto.LocalId) && dto.Id == 0)
                        {
                            response.CreatedIdMappings.Add(new IdMappingDto { EntityType = "cobros", LocalId = dto.LocalId, ServerId = entity.Id });
                        }
                    }
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Cobro",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = ex.Message
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }

        // Push RutaDetalles (updates only — detalles are created by admin)
        if (clientChanges.RutaDetalles?.Any() == true)
        {
            foreach (var dto in clientChanges.RutaDetalles.Where(rd => rd.Operation == SyncOperation.Update))
            {
                try
                {
                    var success = await _repo.UpsertRutaDetalleAsync(tenantId, usuarioId, dto);
                    if (success)
                        response.Summary.RutaDetallesPushed++;
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "RutaDetalle",
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
                ListaPreciosId = c.ListaPreciosId,
                Latitud = c.Latitud,
                Longitud = c.Longitud,
                RfcFiscal = c.RfcFiscal,
                RazonSocial = c.RazonSocial,
                RegimenFiscal = c.RegimenFiscal,
                UsoCfdi = c.UsoCFDIPredeterminado,
                CpFiscal = c.CodigoPostalFiscal,
                RequiereFactura = c.Facturable,
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
            // Get stock levels for all products
            var stockMap = await _repo.GetStockMapAsync(tenantId);
            response.ServerChanges.Productos = productos.Select(p => {
                stockMap.TryGetValue(p.Id, out var stock);
                return new SyncProductoDto
                {
                    Id = p.Id,
                    Nombre = p.Nombre,
                    Descripcion = p.Descripcion,
                    SKU = p.CodigoBarra,
                    Precio = p.PrecioBase,
                    CategoriaProductoId = p.CategoraId,
                    FamiliaProductoId = p.FamiliaId,
                    UnidadMedidaId = p.UnidadMedidaId,
                    ImagenUrl = p.ImagenUrl,
                    StockDisponible = stock.cantidad,
                    StockMinimo = stock.minimo,
                    Activo = p.Activo,
                    Version = p.Version,
                    ActualizadoEn = p.ActualizadoEn
                };
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
                LocalId = p.MobileRecordId,
                ClienteId = p.ClienteId,
                NumeroPedido = p.NumeroPedido,
                FechaPedido = p.FechaPedido,
                FechaEntregaEstimada = p.FechaEntregaEstimada,
                Estado = (int)p.Estado,
                TipoVenta = (int)p.TipoVenta,
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
                    Nombre = d.Producto?.Nombre,
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
                UsuarioId = r.UsuarioId,
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

        // Pull Cobros for this user
        if (syncAll || entityTypes.Contains("cobros", StringComparer.OrdinalIgnoreCase))
        {
            var cobros = await _repo.GetCobrosModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.Cobros = cobros.Select(c => new SyncCobroDto
            {
                Id = c.Id,
                ClienteId = c.ClienteId,
                PedidoId = c.PedidoId,
                Monto = c.Monto,
                MetodoPago = (int)c.MetodoPago,
                FechaCobro = c.FechaCobro,
                Referencia = c.Referencia,
                Notas = c.Notas,
                Activo = c.Activo,
                Version = c.Version,
                ActualizadoEn = c.ActualizadoEn,
                IsDeleted = !c.Activo
            }).ToList();
            response.Summary.CobrosPulled = cobros.Count;
        }

        // Pull pricing catalogs (read-only on mobile)
        if (syncAll || entityTypes.Contains("precios", StringComparer.OrdinalIgnoreCase))
        {
            response.ServerChanges.PreciosPorProducto = await _repo.GetPreciosPorProductoAsync(tenantId, since);
            response.ServerChanges.Descuentos = await _repo.GetDescuentosAsync(tenantId, since);
            response.ServerChanges.Promociones = await _repo.GetPromocionesAsync(tenantId, since);
        }
    }
}
