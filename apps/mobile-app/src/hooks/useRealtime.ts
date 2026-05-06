import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/stores';
import { signalR, HubConnectionState } from '@/services/signalr';
import { performSync } from '@/sync/syncEngine';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Mantiene una conexión SignalR mientras hay sesión y la app está en foreground.
 * Mapea eventos del hub a invalidaciones de React Query y dispara sync cuando aplica.
 */
export function useRealtime() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isConnected: isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [state, setState] = useState<HubConnectionState>(HubConnectionState.Disconnected);

  useEffect(() => {
    // App offline-first: la app trabaja sin red la mayor parte del tiempo.
    // Solo intentamos conectar cuando hay sesión Y red. Cualquier otra cosa
    // queda silenciosa — los fallos de connect ya están atrapados en el service.
    if (!isAuthenticated || !isOnline) {
      signalR.stop().catch(() => {});
      return;
    }

    const unsubState = signalR.onStateChange(setState);
    signalR.start().catch(() => {});

    // Invalidaciones por evento. Mantengo nombres alineados con backend (NotificationHub + AnnouncementEndpoints).
    const unsubs: Array<() => void> = [
      signalR.on('PedidoCreated', () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        performSync().catch(() => {});
      }),
      signalR.on('CobroRegistrado', () => {
        queryClient.invalidateQueries({ queryKey: ['cobros'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        performSync().catch(() => {});
      }),
      signalR.on('VisitaCompletada', () => {
        queryClient.invalidateQueries({ queryKey: ['visits'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }),
      signalR.on('DashboardUpdate', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['supervisor'] });
      }),
      signalR.on('SyncCompleted', () => {
        performSync().catch(() => {});
      }),
      signalR.on('AnnouncementCreated', () => {
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      }),
      signalR.on('AnnouncementExpired', () => {
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      }),
      signalR.on('MaintenanceModeChanged', (...args: unknown[]) => {
        const payload = args[0] as { active?: boolean; message?: string } | undefined;
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
        if (payload?.active) {
          Toast.show({
            type: 'info',
            text1: 'Modo mantenimiento',
            text2: payload.message ?? 'Algunas funciones pueden no estar disponibles',
            visibilityTime: 6000,
          });
        }
      }),
      signalR.on('ForceLogout', (...args: unknown[]) => {
        const payload = args[0] as { reason?: string } | undefined;
        Toast.show({
          type: 'error',
          text1: 'Sesión cerrada por el sistema',
          text2: payload?.reason === 'TENANT_DEACTIVATED' ? 'Tu empresa fue desactivada' : 'Sesión finalizada remotamente',
          visibilityTime: 8000,
        });
        // Logout via store — el AuthGate redirige a /(auth)/login al cambiar isAuthenticated.
        useAuthStore.getState().logout();
      }),
      signalR.on('ReceiveNotification', () => {
        // Backend persiste NotificationHistory antes de mandar push. Disparar
        // sync incremental → trae nuevas entries → notificationStore notifica
        // a sus subscribers (pantalla notificaciones se actualiza sin pull).
        // Dedup por nhId garantiza que push live + sync no dupliquen.
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        import('@/services/notificationSync')
          .then(m => m.syncNotificationsFromBackend())
          .catch(() => { /* best-effort */ });
      }),
      // Admin asignó/republicó una ruta al vendedor. Disparar sync general:
      // trae la ruta nueva (estado=PendienteAceptar/CargaAceptada) + sus
      // pedidos asignados + carga. Pantalla "Hoy" lee de WDB observable
      // (useOfflineRutaHoy) → se actualiza solo cuando WDB cambie.
      signalR.on('RutaAssigned', () => {
        queryClient.invalidateQueries({ queryKey: ['rutas'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        performSync().catch(() => {});
      }),
      signalR.on('RutaCancelada', () => {
        queryClient.invalidateQueries({ queryKey: ['rutas'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        performSync().catch(() => {});
      }),
      // Cuando admin/super-admin edita datos de empresa o logo/branding desde
      // el backoffice web, el backend emite este evento → mobile invalida el
      // cache (staleTime de 1h) sin esperar a que expire naturalmente.
      // Backend backlog: emitir desde DatosEmpresaController + CompanySettingsController
      // tras Update con success.
      signalR.on('EmpresaUpdated', () => {
        queryClient.invalidateQueries({ queryKey: ['empresa'] });
      }),
    ];

    // Catálogos comerciales: cuando el admin activa/desactiva/edita algo desde
    // el web, backend emite el evento al hub y aquí invalidamos React Query +
    // disparamos un pull de WatermelonDB para que la UI offline refleje el
    // cambio en <2s sin necesidad de re-login. Reusa todos los mappers + sync
    // engine ya existentes — solo es invalidación + sync.
    const CATALOG_EVENTS: Record<string, string[]> = {
      PromocionesActualizadas: ['promociones'],
      DescuentosActualizados: ['descuentos'],
      ListaPreciosActualizadas: ['listas-precio', 'precios-por-producto'],
      ProductosActualizados: ['products'],
      CategoriasClienteActualizadas: ['categorias-cliente'],
      CategoriasProductoActualizadas: ['categorias-producto'],
      FamiliasProductoActualizadas: ['familias-producto'],
      ZonasActualizadas: ['zonas'],
    };
    Object.entries(CATALOG_EVENTS).forEach(([evt, queryKeys]) => {
      unsubs.push(
        signalR.on(evt, () => {
          queryKeys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
          performSync().catch(() => {});
        })
      );
    });

    // Reconectar al volver a foreground si la conexión se cayó.
    const appSub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && signalR.getState() !== HubConnectionState.Connected) {
        signalR.start().catch(() => {});
      }
    });

    return () => {
      unsubState();
      unsubs.forEach((u) => u());
      appSub.remove();
    };
  }, [isAuthenticated, isOnline, queryClient]);

  return { state, isConnected: state === HubConnectionState.Connected };
}
