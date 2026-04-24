import { useMemo, useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Visita from '@/db/models/Visita';
import { useObservable } from './useObservable';

export function useOfflineVisits(clienteId?: string) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];

    if (clienteId) {
      conditions.push(Q.where('cliente_id', clienteId));
    }

    conditions.push(Q.sortBy('created_at', Q.desc));

    return database.get<Visita>('visitas').query(...conditions).observe();
  }, [clienteId]);

  return useObservable(observable);
}

export function useOfflineVisitById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Visita>('visitas').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}

export function useOfflineTodayVisits() {
  // Recompute date key so the query refreshes if mount spans midnight
  const [dateKey, setDateKey] = useState(() => new Date().toDateString());

  useEffect(() => {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - Date.now();
    const timeout = setTimeout(() => setDateKey(new Date().toDateString()), msUntilMidnight);
    return () => clearTimeout(timeout);
  }, [dateKey]);

  const observable = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    return database
      .get<Visita>('visitas')
      .query(
        Q.where('activo', true),
        Q.where('check_in_at', Q.gte(todayMs)),
        Q.sortBy('check_in_at', Q.desc)
      )
      .observe();
  }, [dateKey]);

  return useObservable(observable);
}
