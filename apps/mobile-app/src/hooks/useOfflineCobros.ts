import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cobro from '@/db/models/Cobro';
import { useObservable } from './useObservable';
import { useEmpresa } from './useEmpresa';
import { startOfDayInTz } from '@/utils/dateTz';

export function useOfflineCobros(clienteId?: string) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];

    if (clienteId) {
      conditions.push(Q.where('cliente_id', clienteId));
    }

    conditions.push(Q.sortBy('created_at', Q.desc));

    return database.get<Cobro>('cobros').query(...conditions).observe();
  }, [clienteId]);

  return useObservable(observable);
}

export function useOfflineCobroById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Cobro>('cobros').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}

export function useOfflineTodayCobros() {
  const { data: empresa } = useEmpresa();
  const tz = empresa?.timezone || 'America/Mexico_City';

  const observable = useMemo(() => {
    // "Hoy" en TZ del tenant — sin esto el filtro usa device TZ y excluye
    // cobros entre 23:00-00:00 cuando device != tenant TZ.
    const todayMs = startOfDayInTz(tz).getTime();

    return database
      .get<Cobro>('cobros')
      .query(
        Q.where('activo', true),
        Q.where('created_at', Q.gte(todayMs)),
        Q.sortBy('created_at', Q.desc)
      )
      .observe();
  }, [tz]);

  return useObservable(observable);
}
