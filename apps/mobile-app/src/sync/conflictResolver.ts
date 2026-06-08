/**
 * Conflict resolver para WatermelonDB sync.
 *
 * Extraído de syncEngine.ts el 2026-06-08 para hacerlo testeable + permitir
 * regresión Jest del bug createVentaDirectaOffline (estado=5 sobreescrito a 0).
 *
 * Contrato WDB: invocado durante el merge de un record que existe en local
 * (_status !== 'synced' o id-matched) y también viene en el pull. Recibe:
 *   - table:    nombre de la tabla WDB ('pedidos', 'cobros', etc.)
 *   - local:    raw actual del WDB local (puede tener _changed='' si fue
 *               creado via collection.create() builder — WDB no marca dirty)
 *   - remote:   raw entrante del servidor (siempre _status='synced', _changed='')
 *   - resolved: per-column merge default de WDB (Object.assign({},local,remote)
 *               con re-aplicación de local solo para columnas en _changed).
 *               Si local._changed='' (caso create), resolved === remote shape.
 *
 * Retornar el raw final que reemplazará el local row.
 */

type Raw = Record<string, unknown> & {
  id?: string;
  estado?: unknown;
  updated_at?: unknown;
  _status?: string;
  _changed?: string;
};

export function resolveConflict(
  table: string,
  local: Raw | null | undefined,
  remote: Raw | null | undefined,
  resolved: Raw,
): Raw {
  // Pedido: estado es ratchet — el MAYOR del enum wins.
  // EstadoPedido (libs/HandySuites.Domain/Entities/Pedido.cs):
  // 0 Borrador, 1 Enviado*, 2 Confirmado, 3 EnProceso*, 4 EnRuta,
  // 5 Entregado, 6 Cancelado (* deprecados). Cancelado(6) > Entregado(5)
  // > EnRuta(4) > Confirmado(2) > Borrador(0).
  //
  // Bug pre-2026-06-08: usábamos `remote >= local` para decidir override,
  // pero el `resolved` per-column WDB ya traía estado=remote=0 cuando la
  // columna no estaba en _changed (caso típico: createVentaDirectaOffline
  // setea estado=5 dentro de `.create()`, WDB no lo marca dirty, pull
  // retorna 0, per-column merge usa remote=0). Resultado: pedidos venta
  // directa quedaban server-side en Borrador para siempre.
  // Fix: explicit Math.max + siempre override estado en resolved.
  if (table === 'pedidos') {
    const localEstado = typeof local?.estado === 'number' ? local.estado : 0;
    const remoteEstado = typeof remote?.estado === 'number' ? remote.estado : 0;
    const winning = Math.max(localEstado, remoteEstado);
    const resolvedEstado = typeof resolved.estado === 'number' ? resolved.estado : 0;
    // Telemetría: warn si Math.max sobreescribe un estado terminal local
    // (Entregado=5 o Cancelado=6). Caso típico: device A entregó offline,
    // device B canceló online — race que puede dejar inventario decrementado
    // + pedido cancelado. Reportar a crashReporter para reconciliación manual.
    // Importante: warn fires por la SEMANTIC mismatch (local vs winning),
    // independiente de si terminamos overrideando resolved.
    if (winning !== localEstado && (localEstado === 5 || localEstado === 6)) {
      console.warn('[Sync] Pedido estado conflict on terminal state', {
        id: resolved.id,
        local: localEstado,
        remote: remoteEstado,
        winning,
      });
    }
    // CRITICAL: NO override si winning ya coincide con resolved.estado.
    // Sin este guard, retornar `{...resolved, estado: winning}` cuando winning
    // === resolved.estado igual escribe el row (nuevo objeto reference), WDB
    // notifica withChangesForTables, useAutoSync debounces 2s → dispara sync →
    // pull trae el mismo row → conflict resolver corre otra vez → escritura →
    // notificación → sync → loop infinito "Sincronizando" que no para.
    // Caso típico que disparaba el loop: pedido ya en estado=5 server-side y
    // local — cada pull post-sync iteraba sin progreso real.
    if (winning === resolvedEstado) {
      return resolved;
    }
    return { ...resolved, estado: winning };
  }

  // Cobro: NO custom branch. La logica anterior (`return remote` cuando
  // remoteTs > localTs) generaba un loop infinito post-push:
  //   1. Vendedor crea cobro offline → WDB raw con updated_at=T0
  //   2. Sync push → server stamp ActualizadoEn=T1 (T1 > T0) → guarda
  //   3. Sync pull (mismo ciclo) trae cobro con updated_at=T1
  //   4. Conflict resolver: remoteTs(T1) > localTs(T0) → `return remote`
  //   5. WDB replaceRaw con nueva reference → withChangesForTables fires →
  //      useAutoSync debounce 2s → sync → push: cobros:1 (WDB cree pendiente)
  //   6. Server actualiza ActualizadoEn=T2 → pull → resolver →
  //      replaceRaw → withChangesForTables → … loop infinito cada ~4s.
  // El default per-column WDB ya hace "last-write-wins por columna" correcto
  // cuando _changed esta poblado (post-fix createWithDirtyColumns) o cuando
  // estamos en idle steady-state. El caso edge "2 devices editan mismo cobro
  // simultaneamente" lo manejara el follow-up SYSTEMIC fix (helper
  // createWithDirtyColumns + drop de bandaids per-table).
  // No-op aquí — cae a default per-column abajo.

  // Default: per-column client-wins (lo que WDB ya calcula).
  return resolved;
}
