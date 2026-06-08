import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { View, ActivityIndicator, LogBox, BackHandler, Alert, Platform, AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';
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
import { database, getDatabase, isDatabaseEncrypted, verifyDatabaseEncryption } from '@/db/database';
import Toast from 'react-native-toast-message';
import { ConfirmModal } from '@/components/ui';
import { usePermissionDialogStore } from '@/stores/permissionDialogStore';
import { useRealtime, useMe } from '@/hooks';
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
 * Mantiene `useAuthStore.user` sincronizado con el backend (avatar, nombre,
 * role). Refresca al pasar a foreground (vía focusManager bridge) y respeta
 * `staleTime: 30s` mientras la app está activa. Resuelve el caso "admin sube
 * foto en web → mobile la ve al regresar a la app" sin SignalR.
 */
function MeRefreshBridge() {
  useMe();
  return null;
}

/**
 * Bridge AppState → focusManager. Forma idiomática que recomienda la doc
 * oficial de TanStack Query para React Native: en lugar de listeners ad-hoc
 * en cada hook, expones `focusManager.setFocused(active)` y todas las queries
 * con `refetchOnWindowFocus: true` se refrescan automáticamente al volver al
 * foreground. Una sola vez al root, no por hook.
 */
function setupTanStackFocusBridge() {
  if (Platform.OS === 'web') return undefined;
  const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
  return () => sub.remove();
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

  // Setup notif category + listener de tap (Mec 1 + Mec 4 cierre via notif)
  useEffect(() => {
    let removeSub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const notifs = await import('@/services/jornadaNotifications');
        if (cancelled) return;
        await notifs.setupJornadaNotificationCategory();

        const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
          const data = response.notification.request.content.data ?? {};
          if ((data as any).action !== 'jornada-close-prompt') return;

          const action = response.actionIdentifier;
          const source = (data as any).source as 'horario' | 'inactividad' | undefined;

          if (action === notifs.NOTIF_ACTION_EXTENDER) {
            // "Sigo trabajando" → reschedule notif inactividad para otras 2h.
            // (No tocamos jornada — sigue activa.)
            await notifs.rescheduleInactividadNotification();
            return;
          }

          // Default action (tap en notif) o action "cerrar" → cerrar jornada
          // con el motivo que originó la notif.
          if (action === notifs.NOTIF_ACTION_CERRAR
              || action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
            const motivo: 'horario' | 'inactividad' | 'manual' =
              source === 'horario' ? 'horario'
              : source === 'inactividad' ? 'inactividad'
              : 'manual';
            await useJornadaStore.getState().finalizarJornada(motivo);
          }
        });
        removeSub = () => sub.remove();
      } catch {
        // expo-notifications puede fallar en Expo Go SDK 53+ (limitación
        // del runtime). En dev development build / EAS build funciona.
        // Watchers (useHorarioLaboralWatcher, useInactividad) cubren el
        // caso si las notifs no llegan.
      }
    })();
    return () => {
      cancelled = true;
      if (removeSub) removeSub();
    };
  }, []);

  return null;
}
// SyncLoadingScreen merged into AnimatedSplash (syncMode prop)

const ONBOARDING_KEY = 'onboarding_complete';

SplashScreen.preventAutoHideAsync();

const INITIAL_SYNC_KEY = 'initial_sync_complete';

function AuthGate({ onReady }: { onReady: (firstSync?: boolean) => void }) {
  const { isAuthenticated, isLoading, restoreSession, user } = useAuthStore();
  // Hardening 2026-06-05 (fix data-loss critico reportado por usuario):
  // Cambio de contrato vs audit 2026-06-01. Antes: "el banner pinta y el
  // user decide". Resultado: app autenticado dejaba crear pedidos, llenar
  // formularios y tap Finalizar, donde eager-save + sync push fallaban
  // 401 silente -> pedidos quedaban en WDB local solo -> data loss si user
  // wipea o desinstala.
  //
  // Nuevo contrato: sessionExpired=true + inTabsGroup -> redirect automatico
  // a /(auth)/login. JWT preservado en SecureStore (soft-logout sigue),
  // WDB intacto, pero el user NO puede tocar nada mutativo hasta re-login.
  // login() resetea sessionExpired -> false y el sync engine drena
  // automaticamente los pendings que quedaron en WDB.
  const sessionExpired = useAuthStore(s => s.sessionExpired);
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
    const onCambiarPasswordScreen = inAuthGroup && (segments as string[])[1] === 'cambiar-password';

    if (!isAuthenticated && !inAuthGroup) {
      if (!onboardingDone) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && sessionExpired && inTabsGroup) {
      // Hardening 2026-06-05: sesion revocada server-side. Forzar login
      // antes de que el user pueda mutar nada. JWT y WDB preservados;
      // login() reseteara sessionExpired -> sync engine drena pendings.
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !sessionExpired && user?.mustChangePassword && !onCambiarPasswordScreen) {
      // Force-redirect a cambiar-password — el usuario fue creado con password
      // temporal por un admin (caso vendedor de campo MX sin email). No puede
      // navegar a otra pantalla hasta cambiarla. Backend MustChangePassword
      // flag = source of truth; sync local en setUser tras success.
      // Audit 2026-06-01 (v4) — guard `!sessionExpired`: si el user llegó al
      // banner soft-revoked, no queremos secuestrar el redirect a cambiar-
      // password (server ya rechaza la sesión; primero que re-loguee).
      router.replace('/(auth)/cambiar-password' as any);
    } else if (isAuthenticated && !sessionExpired && !user?.mustChangePassword && !inTabsGroup) {
      // Navigate to tabs — splash overlay handles sync if needed.
      // Audit 2026-06-01 (rev 3) — guard `!sessionExpired`: cuando el user
      // tappea el banner desde (tabs), navega a /(auth)/login. Sin este
      // guard, este effect lo veía con `isAuthenticated=true` (tokens
      // intactos en SecureStore por diseño soft-logout) y lo re-redirigía
      // a (tabs) → bounce loop. Con sessionExpired=true, dejamos que el
      // user complete su re-login en paz. El login() resetea el flag al
      // final → siguiente render entra a la rama normal.
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, sessionExpired, isLoading, onboardingDone, segments, user?.mustChangePassword]);

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
    // Sprint 3 audit: DRY con useAuth via helper compartido prefetchCatalogos.
    // Import dinámico para evitar ciclo de módulos en startup.
    import('@/providers/QueryProvider').then(({ queryClient }) => {
      import('@/api/prefetchCatalogos').then(({ prefetchCatalogos }) => {
        prefetchCatalogos(queryClient);
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

  // Audit 2026-06-07: gate todo el JSX detras de dbReady. La WDB se inicializa
  // de forma asincronica (passphrase SQLCipher resuelve via SecureStore) y los
  // 37 modulos que importan `{ database }` requieren que el Proxy ya delegue
  // al `_database` real ANTES de que se monten. SplashScreen.preventAutoHideAsync()
  // mantiene el splash nativo visible hasta que dbReady=true; entonces hideAsync.
  // Pattern oficial Expo SDK 54: docs.expo.dev/versions/latest/sdk/splash-screen
  const [dbReady, setDbReady] = useState(false);
  const [dbInitError, setDbInitError] = useState<string | null>(null);

  // Cableado AppState → focusManager para que `refetchOnWindowFocus: true`
  // funcione en RN. Una sola registración por sesión de app.
  useEffect(() => {
    return setupTanStackFocusBridge();
  }, []);

  // Audit 2026-06-07: lazy-init de la WDB (reemplaza top-level await que Hermes
  // Expo SDK 54 NO soporta). Llama getDatabase() — resuelve la passphrase
  // SQLCipher en background, construye el SQLiteAdapter cifrado y deja el
  // Database singleton listo. Solo entonces dbReady=true y el resto del JSX
  // monta (incluido DatabaseProvider que pasa `database` a hijos).
  useEffect(() => {
    void (async () => {
      try {
        await getDatabase();
        setDbReady(true);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (__DEV__) console.error('[RootLayout] getDatabase fallo:', msg);
        crashReporter.reportCrash(err, 'db_init', 'CRASH');
        setDbInitError(msg);
        // Render fallback UI igual: marcar ready para hide splash y mostrar error
        setDbReady(true);
      }
    })();
  }, []);

  // Sprint pre-prod #7+#8 audit 2026-06-06: verificacion SQLCipher post-init.
  //
  // Tras getDatabase() resolver, confirmamos que la WDB abre con la passphrase
  // nueva (caso normal) o, si el archivo era plaintext de un build previo,
  // ejecutamos el reset one-shot + full sync (migracion plaintext->encrypted).
  //
  // Reporta el estado de encryption via crashReporter para tracking de
  // adoption en field — sin esto, no podemos confirmar que builds EAS
  // tengan SQLCipher activo.
  useEffect(() => {
    if (!dbReady) return;
    void (async () => {
      try {
        const ok = await verifyDatabaseEncryption();
        crashReporter.reportEvent('db_encryption_status', {
          encrypted: isDatabaseEncrypted(),
          reset_needed: !ok,
        });
        if (!ok && __DEV__) {
          console.warn('[RootLayout] WDB reset por migracion plaintext->encrypted; full sync requerido en proximo login');
        }
      } catch (err: any) {
        crashReporter.reportCrash(err, 'db_encryption_verify', 'ERROR');
      }
    })();
  }, [dbReady]);

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

  // Audit 2026-06-07: si la DB no esta lista, retornamos null para mantener
  // el native splash visible (SplashScreen.preventAutoHideAsync() lo bloquea
  // al top del modulo). En cuanto dbReady=true, hideAsync se llama en el
  // useEffect dependiente y el arbol React monta — los 37 modulos que
  // importan { database } reciben el Proxy ya resolviendo al singleton.
  useEffect(() => {
    if (dbReady) {
      SplashScreen.hideAsync().catch(() => {
        // Silencioso — splash ya pudo haber sido hidden por el AnimatedSplash legacy.
      });
    }
  }, [dbReady]);

  if (!dbReady) {
    return null;
  }

  if (dbInitError) {
    // Fallback minimal cuando el init de WDB falla irrecuperablemente. No
    // bloqueamos la app entera — el user puede al menos ver el mensaje y
    // reinstalar. Sin Toast/SafeAreaProvider aqui porque no tenemos DB.
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DatabaseProvider database={database}>
          <QueryProvider>
            <StatusBar style={showSplash ? 'light' : 'dark'} />
            <AuthGate onReady={handleAppReady} />
            <RealtimeBridge />
            <SessionRefreshBridge />
            <MeRefreshBridge />
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
