import { useMemo, useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Visita from '@/db/models/Visita';
import { useObservable } from './useObservable';
import { useEmpresa } from './useEmpresa';
import { startOfDayInTz } from '@/utils/dateTz';

/**
 * Visitas agendadas pendientes de HOY: una visita con `fecha_programada` dentro
 * del día actual (en TZ del tenant) que aún NO tiene check-in. Son las visitas
 * que el admin agendó desde la web (ClienteVisita.FechaProgramada) y el vendedor
 * todavía debe atender.
 *
 * Mismo patrón TZ + refresh de medianoche que useOfflineTodayVisits, pero filtra
 * por `fecha_programada` (no `check_in_at`) y excluye las que ya tienen check-in
 * (esas dejan de ser "pendientes" y pasan a contarse como visitadas).
 */
export function useOfflineScheduledVisits() {
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
    const todayStartMs = startOfDayInTz(tz).getTime();
    const tomorrowStartMs = todayStartMs + 24 * 60 * 60 * 1000;

    return database
      .get<Visita>('visitas')
      .query(
        Q.where('activo', true),
        // Agendada para hoy: fecha_programada dentro de [hoy 00:00, mañana 00:00)
        Q.where('fecha_programada', Q.gte(todayStartMs)),
        Q.where('fecha_programada', Q.lt(tomorrowStartMs)),
        // Pendiente: sin check-in aún (las que ya tienen check-in son "visitadas")
        Q.where('check_in_at', Q.eq(null)),
        Q.sortBy('fecha_programada', Q.asc)
      )
      .observe();
  }, [dateKey, tz]);

  return useObservable(observable);
}
