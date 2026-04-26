import { useMemo, useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Visita from '@/db/models/Visita';
import { useObservable } from './useObservable';
import { useEmpresa } from './useEmpresa';
import { startOfDayInTz } from '@/utils/dateTz';

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
  const { data: empresa } = useEmpresa();
  const tz = empresa?.timezone || 'America/Mexico_City';

  // Recompute date key so the query refreshes if mount spans midnight (en TZ tenant)
  const [dateKey, setDateKey] = useState(() => startOfDayInTz(tz).toISOString());

  useEffect(() => {
    // Próxima medianoche en TZ del tenant: agregamos 24h al inicio del día actual.
    const nextMidnightMs = startOfDayInTz(tz).getTime() + 24 * 60 * 60 * 1000;
    const msUntilMidnight = nextMidnightMs - Date.now();
    if (msUntilMidnight <= 0) return; // ya pasó (DST raro), reintentar próximo render
    const timeout = setTimeout(
      () => setDateKey(startOfDayInTz(tz).toISOString()),
      msUntilMidnight
    );
    return () => clearTimeout(timeout);
  }, [dateKey, tz]);

  const observable = useMemo(() => {
    const todayMs = startOfDayInTz(tz).getTime();

    return database
      .get<Visita>('visitas')
      .query(
        Q.where('activo', true),
        Q.where('check_in_at', Q.gte(todayMs)),
        Q.sortBy('check_in_at', Q.desc)
      )
      .observe();
  }, [dateKey, tz]);

  return useObservable(observable);
}
