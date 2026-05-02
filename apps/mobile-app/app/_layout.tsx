import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { View, ActivityIndicator, LogBox, BackHandler, Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { crashReporter } from '@/services/crashReporter';

LogBox.ignoreLogs([
  "Cannot read property 'initializeJSI'",
  'Require cycle:',
]);

// Global error handler — captura errores fuera del árbol React
// ErrorUtils may be undefined in some Expo Go / Hermes environments
const _ErrorUtils = (globalThis as any).ErrorUtils;
if (_ErrorUtils?.getGlobalHandler) {
  const previousHandler = _ErrorUtils.getGlobalHandler();
  _ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    crashReporter.reportCrash(error, 'global', isFatal ? 'CRASH' : 'ERROR');
    previousHandler?.(error, isFatal);
  });
}

import { QueryProvider } from '@/providers/QueryProvider';
import { useAuthStore, useJornadaStore } from '@/stores';
import { AnimatedSplash } from '@/components/shared/AnimatedSplash';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { secureStorage } from '@/utils/storage';
import { COLORS } from '@/utils/constants';
import { database } from '@/db/database';
import Toast from 'react-native-toast-message';
import { ConfirmModal } from '@/components/ui';
import { usePermissionDialogStore } from '@/stores/permissionDialogStore';
import { useRealtime } from '@/hooks';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useHorarioLaboralWatcher } from '@/hooks/useHorarioLaboralWatcher';
import { useRutaJornadaWatcher } from '@/hooks/useRutaJornadaWatcher';
import { useInactividadJornadaWatcher } from '@/hooks/useInactividadJornadaWatcher';
import { PrivacyConsentModal } from '@/components/shared/PrivacyConsentModal';

function GlobalPermissionDialog() {
  const { visible, title, message, confirmText, cancelText, handleConfirm, handleCancel } = usePermissionDialogStore();
  return <ConfirmModal visible={visible} title={title} message={message} confirmText={confirmText} cancelText={cancelText} onConfirm={handleConfirm} onCancel={handleCancel} />;
}

// Mantiene la conexión SignalR mientras hay sesión + cablea eventos a invalidaciones React Query.
function RealtimeBridge() {
  useRealtime();
  return null;
}

/**
 * Silent refresh on AppState='active' (v16+, 2026-04-29). Cuando el user
 * vuelve a la app tras estar en background, intenta renovar el token
 * silenciosamente para evitar el flow de 401 → force-logout transient.
 * Trabaja junto a JWT TTL 8h en backend (cubre jornada laboral típica).
 */
function SessionRefreshBridge() {
  useSessionRefresh();
  return null;
}

/**
 * Inicia/para el timer de checkpoint GPS según el estado de jornada del
 * vendedor (no según `isAuthenticated`). Esto evita trackear al vendedor
 * fuera de su jornada laboral cuando ya volvió a casa.
 *
 * El estado vive en `useJornadaStore`. Otros componentes lo cambian:
 *  - `recordPing(Venta|Cobro|Visita)` auto-inicia si está inactiva (flujo principal)
 *  - `useRutaJornadaWatcher` cuando la ruta arranca/completa
 *  - `useHorarioLaboralWatcher` al salir del horario laboral configurado
 *  - `useInactividadJornadaWatcher` red de seguridad si no hay pings >4h
 *  - Botón "Finalizar" del chip discreto en home (salir temprano manual)
 */
function LocationTrackingBridge() {
  const { isAuthenticated, user } = useAuthStore();
  const jornadaActiva = useJornadaStore(s => s.activa);
  const hidratada = useJornadaStore(s => s.hidratada);
  const hidratarDesdeStorage = useJornadaStore(s => s.hidratarDesdeStorage);

  // Hidratar el estado persistido al primer mount tras login
  useEffect(() => {
    if (isAuthenticated && !hidratada) {
      hidratarDesdeStorage();
      // Tomar la última config de empresa persistida (horario laboral, modo
      // venta default). Si la app está sin red al startup, esto evita que
      // recordPing decida con valores nulos y haga auto-start spam fuera de
      // horario. El useEmpresa la sobrescribirá con datos frescos al fetch.
      import('@/utils/empresaConfigSnapshot').then(m => m.hydrateEmpresaConfigSnapshot()).catch(() => {});
    }
  }, [isAuthenticated, hidratada, hidratarDesdeStorage]);

  // Arranca/para el timer cuando jornada cambia
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id || !jornadaActiva) {
      // Cualquier transición a "no debería estar tracking" → stop
      import('@/services/locationCheckpoint').then(mod => mod.stopCheckpointTimer()).catch(() => {});
      return;
    }
    const usuarioId = Number(user.id);
    if (!usuarioId) return;
    import('@/services/locationCheckpoint').then(mod => {
      if (cancelled) return;
      mod.startCheckpointTimer(usuarioId);
    }).catch(() => {});
    return () => {
      cancelled = true;
      import('@/services/locationCheckpoint').then(mod => mod.stopCheckpointTimer()).catch(() => {});
    };
  }, [isAuthenticated, user?.id, jornadaActiva]);

  // Watchers que disparan transiciones de jornada
  useHorarioLaboralWatcher();
  useRutaJornadaWatcher();
  useInactividadJornadaWatcher();

  return null;
}
// SyncLoadingScreen merged into AnimatedSplash (syncMode prop)

const ONBOARDING_KEY = 'onboarding_complete';

SplashScreen.preventAutoHideAsync();

const INITIAL_SYNC_KEY = 'initial_sync_complete';

function AuthGate({ onReady }: { onReady: (firstSync?: boolean) => void }) {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
    secureStorage.get(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    }).catch(() => {
      setOnboardingDone(true);
    });
    // INITIAL_SYNC_KEY no longer needed — sync runs every login
  }, []);

  // Back handler — confirm exit on home screen
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const isHome = segments[0] === '(tabs)' && !(segments as string[])[1];
    if (!isHome) return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Salir de HandySales',
        '¿Deseas salir de la aplicación?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí, salir', onPress: () => BackHandler.exitApp() },
        ]
      );
      return true; // Prevent default back
    });
    return () => handler.remove();
  }, [segments]);

  useEffect(() => {
    if (isLoading || onboardingDone === null) return;

    // Always sync on login — splash shows progress
    onReady(isAuthenticated);

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      if (!onboardingDone) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && !inTabsGroup) {
      // Navigate to tabs — splash overlay handles sync if needed
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, onboardingDone,segments]);

  // Handle cold-start deep links (e.g., from killed notification tap)
  useEffect(() => {
    if (!isAuthenticated) return;
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const path = url.replace(/^handysuites:\/\//, '/');
      if (path.startsWith('/(tabs)/')) router.push(path as any);
    });
  }, [isAuthenticated]);

  // Prefetch catálogos silencioso al startup post-auth (cubre caso de user
  // ya logueado que reabre la app: el prefetch de useLogin solo corre en
  // login fresh). Crítico para offline-first: zonas/categorías deben estar
  // en cache TanStack (persist AsyncStorage) para que crear cliente sin red
  // muestre los pickers con datos.
  useEffect(() => {
    if (!isAuthenticated) return;
    // Import dinámico para evitar ciclo de módulos en startup
    import('@/providers/QueryProvider').then(({ queryClient }) => {
      import('@/api').then(({ catalogosApi }) => {
        queryClient.prefetchQuery({ queryKey: ['catalogos', 'zonas'], queryFn: () => catalogosApi.getZonas() });
        queryClient.prefetchQuery({ queryKey: ['catalogos', 'categorias-cliente'], queryFn: () => catalogosApi.getCategoriasCliente() });
        queryClient.prefetchQuery({ queryKey: ['catalogos', 'categorias-producto'], queryFn: () => catalogosApi.getCategoriasProducto() });
        queryClient.prefetchQuery({ queryKey: ['catalogos', 'familias-producto'], queryFn: () => catalogosApi.getFamiliasProducto() });
      });
    });
  }, [isAuthenticated]);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [needsInitialSync, setNeedsInitialSync] = useState(false);

  const handleAppReady = useCallback((firstSync?: boolean) => {
    if (!appReady) {
      setAppReady(true);
      if (firstSync) setNeedsInitialSync(true);
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    setNeedsInitialSync(false);
  }, []);

  const handleSyncComplete = useCallback(async () => {
    // Sync completed — data is ready for offline use
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DatabaseProvider database={database}>
          <QueryProvider>
            <StatusBar style={showSplash ? 'light' : 'dark'} />
            <AuthGate onReady={handleAppReady} />
            <RealtimeBridge />
            <SessionRefreshBridge />
            <LocationTrackingBridge />
            {showSplash && appReady && (
              <AnimatedSplash
                onFinish={handleSplashFinish}
                syncMode={needsInitialSync}
                onSyncComplete={handleSyncComplete}
              />
            )}
            <Toast />
            <GlobalPermissionDialog />
            <PrivacyConsentModal />
          </QueryProvider>
        </DatabaseProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
