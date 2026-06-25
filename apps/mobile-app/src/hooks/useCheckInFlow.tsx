import { useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores';
import { performCheckIn } from '@/services/geoCheckin';
import { createVisitaOffline } from '@/db/actions';
import { performSync } from '@/sync/syncEngine';
import { CheckInPanel } from '@/components/map/CheckInPanel';

/** Datos del cliente sobre el que se inicia el check-in (coords requeridas). */
export interface CheckInStartParams {
  clienteId: string;
  clienteServerId: number | null;
  clienteNombre: string;
  latitude: number;
  longitude: number;
}

interface CheckInTarget {
  clienteId: string;
  clienteServerId: number | null;
  clienteNombre: string;
  distance: number;
  withinGeofence: boolean;
  lat: number;
  lng: number;
}

/**
 * Flujo de check-in reutilizable para visitas ad-hoc / de agenda (SIN parada de
 * ruta). Es el MISMO flujo que `mapa.tsx` (handleClientCheckIn + handleConfirmCheckIn)
 * pero sin el `.arrive()` de la parada de ruta — un check-in de agenda no tiene
 * RutaDetalle asociada, por eso no pasa `rutaId` a `createVisitaOffline`.
 *
 * El dedup interno de `createVisitaOffline` (findScheduledVisitaForCliente) hace
 * que un check-in de agenda CUMPLA la visita agendada existente en vez de crear
 * un duplicado. Si no hay agendada, crea una visita ad-hoc nueva.
 *
 * Uso:
 *   const { startCheckIn, checkInPanel } = useCheckInFlow();
 *   // ...render {checkInPanel} para montar el overlay del CheckInPanel
 *   <Button onPress={() => startCheckIn({ clienteId, clienteServerId, clienteNombre, latitude, longitude })} />
 */
export function useCheckInFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [checkInTarget, setCheckInTarget] = useState<CheckInTarget | null>(null);
  const [loading, setLoading] = useState(false);

  const startCheckIn = useCallback(async (params: CheckInStartParams) => {
    try {
      const result = await performCheckIn({
        latitude: params.latitude,
        longitude: params.longitude,
      });
      setCheckInTarget({
        clienteId: params.clienteId,
        clienteServerId: params.clienteServerId,
        clienteNombre: params.clienteNombre,
        distance: result.distance,
        withinGeofence: result.withinGeofence,
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo obtener tu ubicación' });
    }
  }, []);

  const cancel = useCallback(() => {
    setCheckInTarget(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!checkInTarget || !user) return;
    setLoading(true);

    try {
      // Sin rutaId: el check-in de agenda/ad-hoc no tiene parada de ruta. El dedup
      // de createVisitaOffline cumple la visita agendada o crea una ad-hoc nueva.
      await createVisitaOffline(
        checkInTarget.clienteId,
        checkInTarget.clienteServerId,
        Number(user.id),
        checkInTarget.lat,
        checkInTarget.lng,
        checkInTarget.distance,
      );

      // Tracking GPS: ping de visita (no-op si plan no aplica). Mismo import dinámico
      // que mapa.tsx para no acoplar el bundle del dashboard al servicio de tracking.
      const { recordPing, TipoPing } = await import('@/services/locationCheckpoint');
      recordPing(TipoPing.Visita).catch(() => {});

      setCheckInTarget(null);
      performSync().catch(() => {});
      router.push('/(tabs)/ruta/visita-activa' as any);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo iniciar la visita' });
    } finally {
      setLoading(false);
    }
  }, [checkInTarget, user, router]);

  // Elemento listo para montar: cualquier pantalla renderiza `{checkInPanel}`.
  const checkInPanel = checkInTarget ? (
    <CheckInPanel
      clienteNombre={checkInTarget.clienteNombre}
      distance={checkInTarget.distance}
      withinGeofence={checkInTarget.withinGeofence}
      loading={loading}
      bottomInset={insets.bottom}
      onConfirm={confirm}
      onCancel={cancel}
    />
  ) : null;

  return {
    checkInTarget,
    loading,
    startCheckIn,
    confirm,
    cancel,
    checkInPanel,
  };
}
