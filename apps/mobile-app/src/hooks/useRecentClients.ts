import { useEffect, useMemo, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import Pedido from '@/db/models/Pedido';
import { useAuthStore } from '@/stores';

export interface RecentCliente {
  cliente: Cliente;
  ultimaActividad: Date;
}

const DEFAULT_DAYS_BACK = 7;
const DEFAULT_LIMIT = 5;

/**
 * Devuelve los últimos N clientes con los que el vendedor ha tenido actividad
 * (pedidos) en los últimos `daysBack` días, ordenados por fecha descendente.
 *
 * Offline-first: lee desde WatermelonDB local (Pedido + Cliente). Sin red.
 *
 * Acelera el flow del vendedor: en lugar de buscar con lupa al mismo cliente
 * frecuente, lo ve en el tope.
 */
export function useRecentClients(daysBack: number = DEFAULT_DAYS_BACK, limit: number = DEFAULT_LIMIT) {
  const userId = Number(useAuthStore(s => s.user?.id) ?? 0);
  const [recents, setRecents] = useState<RecentCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const since = useMemo(() => Date.now() - daysBack * 24 * 60 * 60 * 1000, [daysBack]);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Fetch pedidos del vendedor en el rango. Usamos `created_at` (siempre
        // poblado) en lugar de `fecha_pedido` que puede ser null en drafts.
        const pedidos = await database
          .get<Pedido>('pedidos')
          .query(
            Q.where('usuario_id', userId),
            Q.where('created_at', Q.gte(since)),
            Q.where('activo', true),
            Q.sortBy('created_at', Q.desc),
          )
          .fetch();

        // Dedup por clienteServerId (preferido) o clienteId local
        const seen = new Set<string>();
        const ordered: { key: string; pedido: Pedido }[] = [];
        for (const p of pedidos) {
          const key = p.clienteServerId != null ? `s:${p.clienteServerId}` : `l:${p.clienteId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          ordered.push({ key, pedido: p });
          if (ordered.length >= limit) break;
        }

        // Lookup Cliente para cada uno. Buscamos por serverId si está, sino por id local.
        const clientesCol = database.get<Cliente>('clientes');
        const result: RecentCliente[] = [];
        for (const item of ordered) {
          let cliente: Cliente | null = null;
          if (item.pedido.clienteServerId != null) {
            const matches = await clientesCol
              .query(Q.where('server_id', item.pedido.clienteServerId), Q.take(1))
              .fetch();
            cliente = matches[0] ?? null;
          }
          if (!cliente && item.pedido.clienteId) {
            try {
              cliente = await clientesCol.find(item.pedido.clienteId);
            } catch { /* no encontrado */ }
          }
          if (cliente && cliente.activo) {
            result.push({ cliente, ultimaActividad: item.pedido.createdAt });
          }
        }

        if (!cancelled) {
          setRecents(result);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRecents([]);
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId, since, limit]);

  return { recents, isLoading };
}
