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
        //
        // 2026-06-07 (post-MEDIUM-1 iteration): switched to per-entity SAVEPOINTS
        // (the EF Core best practice for batch processing with partial failure
        // tolerance — see https://learn.microsoft.com/en-us/ef/core/saving/transactions#using-savepoints).
        //
        // Each entity in the push loop runs inside its own savepoint via
        // ISavepointScope.TryRunInSavepointAsync. The savepoint commits SaveChangesAsync
        // for that entity. On failure the savepoint is rolled back AND the failed
        // entity's change tracker entries are detached, so:
        //  - Surviving entities commit normally (mobile marks them synced, no loop)
        //  - The failed entity reports its real error to response.Errors[]
        //  - No dirty change tracker leakage between iterations or into the final commit
        //
        // Pull runs OUTSIDE the savepoint transaction because it is read-only
        // (only populates response.ServerChanges from queries). A pull failure does not
        // affect the already-committed push savepoints.
        if (request.ClientChanges != null)
        {
            try
            {
                await _transactions.ExecuteWithSavepointsAsync(sp =>
                    PushClientChangesAsync(request.ClientChanges, response, tenantId, usuarioId, sp));
            }
            catch (Exception ex)
            {
                // ExecuteWithSavepointsAsync only re-throws on outer transaction failure
                // (e.g., commit failed). Per-entity errors are handled inside via TryRunInSavepointAsync.
                response.Errors.Add(new SyncErrorDto
                {
                    EntityType = "sync",
                    Operation = "push_transaction",
                    Message = "Push transaction failed",
                    Details = ex.Message
                });
                response.Summary.ErrorsFound++;
            }
        }

        try
        {
            await PullServerChangesAsync(response, tenantId, usuarioId, since, entityTypes, syncAll, request.Pagination);
        }
        catch (Exception ex)
        {
            response.Errors.Add(new SyncErrorDto
            {
                EntityType = "sync",
                Operation = "pull",
                Message = "Pull failed",
                Details = ex.Message
            });
            response.Summary.ErrorsFound++;
        }

        return response;
    }

    private async Task PushClientChangesAsync(SyncChangesDto clientChanges, SyncResponseDto response, int tenantId, int usuarioId, ISavepointScope sp)
    {
        var userId = _tenant.UserId;

        // Push Clientes
        if (clientChanges.Clientes?.Any() == true)
        {
            foreach (var dto in clientChanges.Clientes)
            {
                var spName = $"sp_cliente_{(dto.LocalId ?? dto.Id.ToString())}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertClienteAsync(tenantId, dto, userId);
                    await _repo.SaveChangesAsync();
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
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Cliente",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
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
                var spName = $"sp_pedido_{(dto.LocalId ?? dto.Id.ToString())}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertPedidoAsync(tenantId, usuarioId, dto, userId);
                    await _repo.SaveChangesAsync();
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
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Pedido",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
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
                var spName = $"sp_visita_{(dto.LocalId ?? dto.Id.ToString())}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertVisitaAsync(tenantId, usuarioId, dto, userId);
                    await _repo.SaveChangesAsync();
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
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Visita",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
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
                var spName = $"sp_ruta_{dto.Id}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertRutaAsync(tenantId, usuarioId, dto, userId);
                    await _repo.SaveChangesAsync();
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
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Ruta",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
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
                var spName = $"sp_cobro_{(dto.LocalId ?? dto.Id.ToString())}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertCobroAsync(tenantId, usuarioId, dto, userId);
                    await _repo.SaveChangesAsync();
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
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Cobro",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }

        // Push Gastos (vendor expenses, auto-approved)
        if (clientChanges.Gastos?.Any() == true)
        {
            foreach (var dto in clientChanges.Gastos)
            {
                var spName = $"sp_gasto_{(dto.LocalId ?? dto.Id.ToString())}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertGastoAsync(tenantId, usuarioId, dto, userId);
                    await _repo.SaveChangesAsync();
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "Gasto",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.GastosPushed++;
                        if (!string.IsNullOrEmpty(dto.LocalId) && dto.Id == 0)
                        {
                            response.CreatedIdMappings.Add(new IdMappingDto { EntityType = "gastos", LocalId = dto.LocalId, ServerId = entity.Id });
                        }
                    }
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "Gasto",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }

        // Push DevolucionesPedido (con children atomico)
        if (clientChanges.DevolucionesPedido?.Any() == true)
        {
            foreach (var dto in clientChanges.DevolucionesPedido)
            {
                var spName = $"sp_devolucion_{(dto.LocalId ?? dto.Id.ToString())}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var (entity, wasConflict) = await _repo.UpsertDevolucionAsync(tenantId, usuarioId, dto, userId);
                    await _repo.SaveChangesAsync();
                    if (wasConflict)
                    {
                        response.Conflicts.Add(new SyncConflictDto
                        {
                            EntityType = "DevolucionPedido",
                            EntityId = dto.Id,
                            ClientModified = dto.ActualizadoEn ?? DateTime.UtcNow,
                            ServerModified = entity.ActualizadoEn ?? entity.CreadoEn,
                            Resolution = "server_wins"
                        });
                        response.Summary.ConflictsFound++;
                    }
                    else
                    {
                        response.Summary.DevolucionesPushed++;
                        if (!string.IsNullOrEmpty(dto.LocalId) && dto.Id == 0)
                        {
                            response.CreatedIdMappings.Add(new IdMappingDto { EntityType = "devoluciones_pedido", LocalId = dto.LocalId, ServerId = entity.Id });
                        }
                        // Map children created IDs por LocalId
                        // MEDIUM-7 (2026-06-06): materialize Detalles once outside the loop.
                        // entity.Detalles is ICollection; ElementAt(i) on a non-indexed
                        // ICollection enumerates from the start every call (O(N) per access,
                        // O(N^2) total). Cast to List<T> once for O(1) indexed access.
                        var detallesList = entity.Detalles.ToList();
                        for (int i = 0; i < dto.Detalles.Count && i < detallesList.Count; i++)
                        {
                            var childDto = dto.Detalles[i];
                            var childEntity = detallesList[i];
                            if (!string.IsNullOrEmpty(childDto.LocalId) && childDto.Id == 0 && childEntity.Id > 0)
                            {
                                response.CreatedIdMappings.Add(new IdMappingDto
                                {
                                    EntityType = "detalle_devoluciones",
                                    LocalId = childDto.LocalId,
                                    ServerId = childEntity.Id,
                                });
                            }
                        }
                    }
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "DevolucionPedido",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
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
                var spName = $"sp_ruta_detalle_{dto.Id}";
                var (committed, error) = await sp.TryRunInSavepointAsync(spName, async () =>
                {
                    var success = await _repo.UpsertRutaDetalleAsync(tenantId, usuarioId, dto);
                    await _repo.SaveChangesAsync();
                    if (success)
                        response.Summary.RutaDetallesPushed++;
                });
                if (!committed)
                {
                    response.Errors.Add(new SyncErrorDto
                    {
                        EntityType = "RutaDetalle",
                        EntityId = dto.Id > 0 ? dto.Id : null,
                        Operation = dto.Operation.ToString(),
                        Message = error?.Message ?? "Unknown error"
                    });
                    response.Summary.ErrorsFound++;
                }
            }
        }
    }

    private async Task PullServerChangesAsync(SyncResponseDto response, int tenantId, int usuarioId, DateTime? since, List<string> entityTypes, bool syncAll, SyncPaginationOptions? pagination = null)
    {
        response.ServerChanges = new SyncChangesDto();

        var maxRecords = pagination?.MaxRecords;
        var afterIds = pagination?.AfterIds;

        // Cursor POR ENTIDAD: cada entidad paginable (clientes/productos/pedidos) tiene su
        // PROPIO espacio de Id, asi que se rastrea su cursor por separado. Un cursor escalar
        // compartido (el Id mas alto entre todas) saltaria registros de las entidades con Ids
        // mas bajos -> perdida de datos. anyHasMore = true si ALGUNA entidad tiene mas paginas.
        bool anyHasMore = false;
        var nextCursors = new Dictionary<string, int>();

        // afterId de una entidad: su cursor (0 = desde el inicio). null cuando no hay paginacion
        // (maxRecords null) -> el repo no aplica filtro Id> y devuelve todo, identico a hoy.
        int? AfterFor(string key) =>
            maxRecords.HasValue
                ? (afterIds != null && afterIds.TryGetValue(key, out var v) ? v : 0)
                : (int?)null;

        // Pull Clientes (read-only for vendors to view customer list)
        if (syncAll || entityTypes.Contains("clientes", StringComparer.OrdinalIgnoreCase))
        {
            // Cuando maxRecords esta activo, pedimos maxRecords+1 para detectar hasMore
            // sin necesitar un COUNT(*) extra. Si llegaron maxRecords+1 resultados, hay mas;
            // devolvemos solo los primeros maxRecords.
            int? clientesAfter = AfterFor("clientes");
            int? fetchLimit = maxRecords.HasValue ? maxRecords.Value + 1 : null;
            var clientes = await _repo.GetClientesModifiedSinceAsync(tenantId, since, fetchLimit, clientesAfter);

            if (maxRecords.HasValue)
            {
                bool clientesHasMore = clientes.Count > maxRecords.Value;
                if (clientesHasMore) clientes = clientes.Take(maxRecords.Value).ToList();
                anyHasMore |= clientesHasMore;
                // cursor de clientes: ultimo Id entregado, o el cursor previo si no hubo registros (no retrocede)
                nextCursors["clientes"] = clientes.Count > 0 ? clientes[^1].Id : (clientesAfter ?? 0);
            }
            response.ServerChanges.Clientes = clientes.Select(c => new SyncClienteDto
            {
                Id = c.Id,
                LocalId = c.MobileRecordId,
                Nombre = c.Nombre,
                RFC = c.RFC,
                Correo = c.Correo,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                NumeroExterior = c.NumeroExterior,
                Colonia = c.Colonia,
                Ciudad = c.Ciudad,
                CodigoPostal = c.CodigoPostal,
                Encargado = c.Encargado,
                IdZona = c.IdZona,
                CategoriaClienteId = c.CategoriaClienteId,
                VendedorId = c.VendedorId,
                ListaPreciosId = c.ListaPreciosId,
                Latitud = c.Latitud,
                Longitud = c.Longitud,
                LimiteCredito = c.LimiteCredito,
                DiasCredito = c.DiasCredito,
                Descuento = c.Descuento,
                Saldo = c.Saldo,
                VentaMinimaEfectiva = c.VentaMinimaEfectiva,
                TiposPagoPermitidos = c.TiposPagoPermitidos,
                TipoPagoPredeterminado = c.TipoPagoPredeterminado,
                EsProspecto = c.EsProspecto,
                Comentarios = c.Comentarios,
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
            int? productosAfter = AfterFor("productos");
            int? fetchLimitProductos = maxRecords.HasValue ? maxRecords.Value + 1 : null;
            var productos = await _repo.GetProductosModifiedSinceAsync(tenantId, since, fetchLimitProductos, productosAfter);

            if (maxRecords.HasValue)
            {
                bool productosHasMore = productos.Count > maxRecords.Value;
                if (productosHasMore) productos = productos.Take(maxRecords.Value).ToList();
                anyHasMore |= productosHasMore;
                nextCursors["productos"] = productos.Count > 0 ? productos[^1].Id : (productosAfter ?? 0);
            }
            var stockMap = await _repo.GetStockMapAsync(tenantId);

            // Resolver tasas por producto: lookup de TasaImpuesto FK + default tenant.
            // Se denormaliza la `tasa` en SyncProductoDto para que mobile no necesite
            // hacer joins offline al calcular ticket. Reportado 2026-04-28.
            var allTasas = await _repo.GetTasasImpuestoModifiedSinceAsync(tenantId, null);
            var tasaMap = allTasas.Where(t => t.Activo).ToDictionary(t => t.Id, t => t.Tasa);
            var defaultTasa = allTasas.FirstOrDefault(t => t.EsDefault && t.Activo)?.Tasa ?? 0.16m;

            response.ServerChanges.Productos = productos.Select(p => {
                stockMap.TryGetValue(p.Id, out var stock);
                var tasa = (p.TasaImpuestoId.HasValue && tasaMap.TryGetValue(p.TasaImpuestoId.Value, out var t))
                    ? t
                    : defaultTasa;
                return new SyncProductoDto
                {
                    Id = p.Id,
                    Nombre = p.Nombre,
                    Descripcion = p.Descripcion,
                    SKU = p.CodigoBarra, // legacy alias
                    CodigoBarra = p.CodigoBarra,
                    Precio = p.PrecioBase,
                    CategoriaProductoId = p.CategoraId,
                    FamiliaProductoId = p.FamiliaId,
                    UnidadMedidaId = p.UnidadMedidaId,
                    UnidadMedidaNombre = p.UnidadMedida?.Nombre,
                    ImagenUrl = p.ImagenUrl,
                    StockDisponible = stock.cantidad,
                    StockMinimo = stock.minimo,
                    Activo = p.Activo,
                    Version = p.Version,
                    ActualizadoEn = p.ActualizadoEn,
                    PrecioIncluyeIva = p.PrecioIncluyeIva,
                    TasaImpuestoId = p.TasaImpuestoId,
                    Tasa = tasa
                };
            }).ToList();
            response.Summary.ProductosPulled = productos.Count;
        }

        // Pull Pedidos for this user
        if (syncAll || entityTypes.Contains("pedidos", StringComparer.OrdinalIgnoreCase))
        {
            int? pedidosAfter = AfterFor("pedidos");
            int? fetchLimitPedidos = maxRecords.HasValue ? maxRecords.Value + 1 : null;
            var pedidos = await _repo.GetPedidosModifiedSinceAsync(tenantId, usuarioId, since, fetchLimitPedidos, pedidosAfter);

            if (maxRecords.HasValue)
            {
                bool pedidosHasMore = pedidos.Count > maxRecords.Value;
                if (pedidosHasMore) pedidos = pedidos.Take(maxRecords.Value).ToList();
                anyHasMore |= pedidosHasMore;
                nextCursors["pedidos"] = pedidos.Count > 0 ? pedidos[^1].Id : (pedidosAfter ?? 0);
            }
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
                    LocalId = d.MobileRecordId,
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
                    Version = d.Version,
                    CantidadBonificada = d.CantidadBonificada,
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
                // Multi-zona: lista de IDs desde junction. Si no hay junction (ruta vieja),
                // sintetizar [ZonaId] para que el mobile reciba al menos la zona legacy.
                ZonaIds = r.Zonas != null && r.Zonas.Count > 0
                    ? r.Zonas.Select(rz => rz.ZonaId).Distinct().ToList()
                    : (r.ZonaId.HasValue ? new List<int> { r.ZonaId.Value } : new List<int>()),
                // Multi-zona con nombres (UI mobile muestra chips legibles).
                Zonas = r.Zonas != null && r.Zonas.Count > 0
                    ? r.Zonas.Where(rz => rz.Zona != null)
                        .Select(rz => new SyncZonaResumenDto { Id = rz.ZonaId, Nombre = rz.Zona!.Nombre })
                        .ToList()
                    : (r.Zona != null
                        ? new List<SyncZonaResumenDto> { new() { Id = r.Zona.Id, Nombre = r.Zona.Nombre } }
                        : new List<SyncZonaResumenDto>()),
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
                }).ToList(),
                Pedidos = r.PedidosAsignados?
                    .Where(rp => rp.Activo)
                    .Select(rp => new SyncRutaPedidoDto
                    {
                        Id = rp.Id,
                        RutaId = rp.RutaId,
                        PedidoId = rp.PedidoId,
                        Estado = (int)rp.Estado,
                        Activo = rp.Activo,
                        CreadoEn = rp.CreadoEn,
                    }).ToList(),
            }).ToList();

            // RutasCarga no está en navigation property — cargar bulk para todas las
            // rutas pulled y mapear por rutaId.
            var rutaIds = rutas.Select(r => r.Id).ToList();
            if (rutaIds.Count > 0)
            {
                var cargaPorRuta = await _repo.GetRutasCargaForRutasAsync(tenantId, rutaIds);
                foreach (var dto in response.ServerChanges.Rutas)
                {
                    if (cargaPorRuta.TryGetValue(dto.Id, out var items))
                    {
                        dto.Carga = items.Select(rc => new SyncRutaCargaDto
                        {
                            Id = rc.Id,
                            RutaId = rc.RutaId,
                            ProductoId = rc.ProductoId,
                            CantidadEntrega = rc.CantidadEntrega,
                            CantidadVenta = rc.CantidadVenta,
                            CantidadTotal = rc.CantidadTotal,
                            PrecioUnitario = rc.PrecioUnitario,
                            Activo = rc.Activo,
                            CreadoEn = rc.CreadoEn,
                            // Audit 2026-05-21: incluir progreso consumido para que el
                            // mobile pueda mostrar barra "Productos (vendidos + entregados)".
                            CantidadVendida = rc.CantidadVendida,
                            CantidadEntregada = rc.CantidadEntregada,
                        }).ToList();
                    }
                }
            }

            response.Summary.RutasPulled = rutas.Count;
        }

        // Pull Cobros for this user
        if (syncAll || entityTypes.Contains("cobros", StringComparer.OrdinalIgnoreCase))
        {
            var cobros = await _repo.GetCobrosModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.Cobros = cobros.Select(c => new SyncCobroDto
            {
                Id = c.Id,
                LocalId = c.MobileRecordId,
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

        // Pull Gastos for this user
        if (syncAll || entityTypes.Contains("gastos", StringComparer.OrdinalIgnoreCase))
        {
            var gastos = await _repo.GetGastosModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.Gastos = gastos.Select(g => new SyncGastoDto
            {
                Id = g.Id,
                LocalId = g.MobileRecordId,
                UsuarioId = g.UsuarioId, // Bug fix 30/5: faltaba -> mobile mapeaba usuario_id=0
                RutaId = g.RutaId,
                FechaGasto = g.FechaGasto,
                Monto = g.Monto,
                TipoGasto = (int)g.TipoGasto,
                Concepto = g.Concepto,
                Notas = g.Notas,
                ComprobanteUrl = g.ComprobanteUrl,
                Moneda = g.Moneda,
                Estado = (int)g.Estado,
                Activo = g.Activo,
                Version = g.Version,
                ActualizadoEn = g.ActualizadoEn,
                IsDeleted = !g.Activo,
            }).ToList();
            response.Summary.GastosPulled = gastos.Count;
        }

        // Pull DevolucionesPedido (con children)
        if (syncAll || entityTypes.Contains("devoluciones_pedido", StringComparer.OrdinalIgnoreCase))
        {
            var devs = await _repo.GetDevolucionesModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.DevolucionesPedido = devs.Select(d => new SyncDevolucionPedidoDto
            {
                Id = d.Id,
                LocalId = d.MobileRecordId,
                PedidoId = d.PedidoId,
                ClienteId = d.ClienteId,
                RutaId = d.RutaId,
                FechaDevolucion = d.FechaDevolucion,
                Motivo = (int)d.Motivo,
                Notas = d.Notas,
                TipoReembolso = (int)d.TipoReembolso,
                MontoTotal = d.MontoTotal,
                FotoEvidenciaUrl = d.FotoEvidenciaUrl,
                Estado = (int)d.Estado,
                Activo = d.Activo,
                Version = d.Version,
                ActualizadoEn = d.ActualizadoEn,
                IsDeleted = !d.Activo,
                Detalles = d.Detalles.Select(dd => new SyncDetalleDevolucionDto
                {
                    Id = dd.Id,
                    LocalId = dd.MobileRecordId,
                    DetallePedidoId = dd.DetallePedidoId,
                    ProductoId = dd.ProductoId,
                    Cantidad = dd.Cantidad,
                    PrecioUnitario = dd.PrecioUnitario,
                    Subtotal = dd.Subtotal,
                    Impuesto = dd.Impuesto,
                    Total = dd.Total,
                }).ToList(),
            }).ToList();
            response.Summary.DevolucionesPulled = devs.Count;
        }

        // Pull pricing catalogs (read-only on mobile)
        if (syncAll || entityTypes.Contains("precios", StringComparer.OrdinalIgnoreCase))
        {
            response.ServerChanges.PreciosPorProducto = await _repo.GetPreciosPorProductoAsync(tenantId, since);
            response.ServerChanges.Descuentos = await _repo.GetDescuentosAsync(tenantId, since);
            response.ServerChanges.Promociones = await _repo.GetPromocionesAsync(tenantId, since);
        }

        // Pull catalogos basicos (zonas, categorias, familias) — read-only on mobile.
        // Antes solo se cargaban via /api/mobile/catalogos/* en React Query memory y se
        // perdian al cerrar sesion. Ahora persisten en WatermelonDB para offline real
        // (reportado 2026-04-28 — el vendedor tenia que re-loguear cada vez).
        if (syncAll || entityTypes.Contains("zonas", StringComparer.OrdinalIgnoreCase))
        {
            var zonas = await _repo.GetZonasModifiedSinceAsync(tenantId, since);
            response.ServerChanges.Zonas = zonas.Select(z => new SyncZonaCatalogoDto
            {
                Id = z.Id,
                TenantId = z.TenantId,
                Nombre = z.Nombre,
                Descripcion = z.Descripcion,
                Activo = z.Activo,
                ActualizadoEn = z.ActualizadoEn ?? z.CreadoEn,
                IsDeleted = !z.Activo || z.EliminadoEn != null,
            }).ToList();
            response.Summary.ZonasPulled = zonas.Count;
        }

        if (syncAll || entityTypes.Contains("categoriasCliente", StringComparer.OrdinalIgnoreCase)
                   || entityTypes.Contains("categorias-cliente", StringComparer.OrdinalIgnoreCase))
        {
            var categorias = await _repo.GetCategoriasClienteModifiedSinceAsync(tenantId, since);
            response.ServerChanges.CategoriasCliente = categorias.Select(c => new SyncCategoriaClienteCatalogoDto
            {
                Id = c.Id,
                TenantId = c.TenantId,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion,
                Activo = c.Activo,
                ActualizadoEn = c.ActualizadoEn ?? c.CreadoEn,
                IsDeleted = !c.Activo || c.EliminadoEn != null,
            }).ToList();
            response.Summary.CategoriasClientePulled = categorias.Count;
        }

        if (syncAll || entityTypes.Contains("categoriasProducto", StringComparer.OrdinalIgnoreCase)
                   || entityTypes.Contains("categorias-producto", StringComparer.OrdinalIgnoreCase))
        {
            var categorias = await _repo.GetCategoriasProductoModifiedSinceAsync(tenantId, since);
            response.ServerChanges.CategoriasProducto = categorias.Select(c => new SyncCategoriaProductoCatalogoDto
            {
                Id = c.Id,
                TenantId = c.TenantId,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion,
                Activo = c.Activo,
                ActualizadoEn = c.ActualizadoEn ?? c.CreadoEn,
                IsDeleted = !c.Activo || c.EliminadoEn != null,
            }).ToList();
            response.Summary.CategoriasProductoPulled = categorias.Count;
        }

        if (syncAll || entityTypes.Contains("familiasProducto", StringComparer.OrdinalIgnoreCase)
                   || entityTypes.Contains("familias-producto", StringComparer.OrdinalIgnoreCase))
        {
            var familias = await _repo.GetFamiliasProductoModifiedSinceAsync(tenantId, since);
            response.ServerChanges.FamiliasProducto = familias.Select(f => new SyncFamiliaProductoCatalogoDto
            {
                Id = f.Id,
                TenantId = f.TenantId,
                Nombre = f.Nombre,
                Descripcion = f.Descripcion,
                Activo = f.Activo,
                ActualizadoEn = f.ActualizadoEn ?? f.CreadoEn,
                IsDeleted = !f.Activo || f.EliminadoEn != null,
            }).ToList();
            response.Summary.FamiliasProductoPulled = familias.Count;
        }

        // Catálogo `tasasImpuesto` removido del payload de sync (2026-04-29).
        // Mobile no consulta la tabla — el cálculo de IVA se resuelve con los
        // campos denormalizados `producto.tasa` y `producto.precioIncluyeIva`
        // que ya viajan en SyncProductoDto. El backend es la única autoridad
        // del catálogo; cuando admin cambia una tasa central, el servicio
        // propaga el valor a Producto.Tasa (cascade) y al próximo sync el
        // mobile recibe los productos actualizados.

        if (syncAll || entityTypes.Contains("listasPrecio", StringComparer.OrdinalIgnoreCase)
                   || entityTypes.Contains("listas-precio", StringComparer.OrdinalIgnoreCase))
        {
            var listas = await _repo.GetListasPrecioModifiedSinceAsync(tenantId, since);
            response.ServerChanges.ListasPrecio = listas.Select(l => new SyncListaPrecioCatalogoDto
            {
                Id = l.Id,
                TenantId = l.TenantId,
                Nombre = l.Nombre,
                Descripcion = l.Descripcion,
                Activo = l.Activo,
                ActualizadoEn = l.ActualizadoEn ?? l.CreadoEn,
                IsDeleted = !l.Activo || l.EliminadoEn != null,
            }).ToList();
            response.Summary.ListasPrecioPulled = listas.Count;
        }

        if (syncAll || entityTypes.Contains("usuarios", StringComparer.OrdinalIgnoreCase))
        {
            var usuarios = await _repo.GetUsuariosModifiedSinceAsync(tenantId, since);
            response.ServerChanges.Usuarios = usuarios.Select(u => new SyncUsuarioCatalogoDto
            {
                Id = u.Id,
                TenantId = u.TenantId,
                Nombre = u.Nombre,
                Email = u.Email,
                Rol = u.RolExplicito,
                AvatarUrl = u.AvatarUrl,
                Activo = u.Activo,
                ActualizadoEn = u.ActualizadoEn ?? u.CreadoEn,
                IsDeleted = !u.Activo || u.EliminadoEn != null,
            }).ToList();
            response.Summary.UsuariosPulled = usuarios.Count;
        }

        if (syncAll || entityTypes.Contains("metas", StringComparer.OrdinalIgnoreCase)
                   || entityTypes.Contains("metasVendedor", StringComparer.OrdinalIgnoreCase))
        {
            var metas = await _repo.GetMetasVendedorModifiedSinceAsync(tenantId, usuarioId, since);
            response.ServerChanges.MetasVendedor = metas.Select(m => new SyncMetaVendedorCatalogoDto
            {
                Id = m.Id,
                TenantId = m.TenantId,
                UsuarioId = m.UsuarioId,
                Tipo = m.Tipo,
                Periodo = m.Periodo,
                Monto = m.Monto,
                FechaInicio = m.FechaInicio,
                FechaFin = m.FechaFin,
                Activo = m.Activo,
                ActualizadoEn = m.ActualizadoEn ?? m.CreadoEn,
                IsDeleted = !m.Activo || m.EliminadoEn != null,
            }).ToList();
            response.Summary.MetasVendedorPulled = metas.Count;
        }

        if (syncAll || entityTypes.Contains("datosEmpresa", StringComparer.OrdinalIgnoreCase)
                   || entityTypes.Contains("empresa", StringComparer.OrdinalIgnoreCase))
        {
            var empresa = await _repo.GetDatosEmpresaIfModifiedAsync(tenantId, since);
            if (empresa != null)
            {
                response.ServerChanges.DatosEmpresa = new SyncDatosEmpresaCatalogoDto
                {
                    Id = empresa.Id,
                    TenantId = empresa.TenantId,
                    RazonSocial = empresa.RazonSocial,
                    IdentificadorFiscal = empresa.IdentificadorFiscal,
                    TipoIdentificadorFiscal = empresa.TipoIdentificadorFiscal,
                    Telefono = empresa.Telefono,
                    Email = empresa.Email,
                    Contacto = empresa.Contacto,
                    Direccion = empresa.Direccion,
                    Ciudad = empresa.Ciudad,
                    Estado = empresa.Estado,
                    CodigoPostal = empresa.CodigoPostal,
                    SitioWeb = empresa.SitioWeb,
                    Descripcion = empresa.Descripcion,
                    ActualizadoEn = empresa.ActualizadoEn ?? empresa.CreadoEn,
                };
                response.Summary.DatosEmpresaPulled = true;
            }
        }

        // Rellenar PaginationInfo solo cuando se solicito paginacion.
        // El cliente puede detectar si el servidor soporta paginacion verificando
        // que PaginationInfo no sea null en la respuesta. El cliente reenvia NextCursors
        // como AfterIds en la siguiente ronda y termina cuando HasMore es false.
        if (maxRecords.HasValue)
        {
            response.PaginationInfo = new SyncPullPageInfo
            {
                HasMore = anyHasMore,
                NextCursors = nextCursors
            };
        }
    }
}
