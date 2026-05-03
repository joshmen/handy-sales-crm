import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Path,
  Circle,
} from 'react-native-svg';
import { performSync } from '@/sync/syncEngine';
import { api } from '@/api/client';
import { Image as RNImage } from 'react-native';
import { secureStorage } from '@/utils/storage';
import { RefreshCcw, LogOut } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import { useAuthStore } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.32;
const EMPRESA_CACHE_KEY = 'cached_empresa_data';

interface AnimatedSplashProps {
  onFinish: () => void;
  /** If true, runs initial sync with progress before finishing */
  syncMode?: boolean;
  onSyncComplete?: () => void;
}

function LogoIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="-6 -8 86 86" fill="none">
      <Defs>
        <LinearGradient id="sp-rose" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FB7185" />
          <Stop offset="100%" stopColor="#E11D48" />
        </LinearGradient>
        <LinearGradient id="sp-indigo" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4338CA" />
        </LinearGradient>
        <LinearGradient id="sp-green" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#34D399" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>
        <LinearGradient id="sp-amber" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="100%" stopColor="#B45309" />
        </LinearGradient>
      </Defs>
      <G><Rect x="0" y="26" width="30" height="30" rx={9} fill="url(#sp-rose)" /><G transform="translate(7.5, 33.5) scale(0.625)" stroke="white" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Path d="M16 3.128a4 4 0 0 1 0 7.744" /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /><Circle cx={9} cy={7} r={4} /></G></G>
      <G><Rect x="22" y="0" width="36" height="36" rx={11} fill="url(#sp-indigo)" /><G transform="translate(31, 9) scale(0.75)" stroke="white" strokeWidth={2.67} fill="none" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 10a4 4 0 0 1-8 0" /><Path d="M3.103 6.034h17.794" /><Path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" /></G></G>
      <G><Rect x="46" y="28" width="28" height="28" rx={8} fill="url(#sp-green)" /><G transform="translate(53, 35) scale(0.583)" stroke="white" strokeWidth={3.43} fill="none" strokeLinecap="round" strokeLinejoin="round"><Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><Circle cx={12} cy={10} r={3} /></G></G>
      <G><Rect x="16" y="46" width="26" height="26" rx={8} fill="url(#sp-amber)" /><G transform="translate(22.5, 52.5) scale(0.542)" stroke="white" strokeWidth={3.69} fill="none" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><Path d="M14 2v5a1 1 0 0 0 1 1h5" /><Path d="M10 9H8" /><Path d="M16 13H8" /><Path d="M16 17H8" /></G></G>
    </Svg>
  );
}

const SYNC_TEXTS = [
  'Conectando con el servidor...',
  'Descargando clientes y productos...',
  'Descargando pedidos y rutas...',
  'Descargando cobros y visitas...',
  'Preparando datos de empresa...',
  'Cargando catálogos...',
  '¡Listo! Preparado para trabajar',
];

/**
 * Mapea cualquier error que pueda salir de performSync a un mensaje amigable
 * para mostrar al usuario. NUNCA exponer err.message crudo de axios — la
 * representación default ("Request failed with status code 401") confunde al
 * usuario y se quedaba pegada en pantalla bloqueando login (hotfix mayo 2026).
 */
function friendlyErrorMessage(err: unknown): { text: string; isAuthError: boolean } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return {
        text: 'Tu sesión expiró. Vuelve a iniciar sesión.',
        isAuthError: true,
      };
    }
    if (status === 429) {
      return { text: 'Servicio ocupado. Intenta en unos minutos.', isAuthError: false };
    }
    if (status && status >= 500) {
      return { text: 'Error del servidor. Intenta más tarde.', isAuthError: false };
    }
    if (!err.response) {
      return { text: 'Sin conexión. Verifica tu red e intenta de nuevo.', isAuthError: false };
    }
  }
  return { text: 'Error de sincronización. Intenta de nuevo.', isAuthError: false };
}

export function AnimatedSplash({ onFinish, syncMode, onSyncComplete }: AnimatedSplashProps) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  const [syncPhase, setSyncPhase] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStarted, setSyncStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mounted flag — runSync corre awaits largos. Si user logout/unmount durante
  // performSync, los setSyncPhase posteriores generan warning "state update on
  // unmounted component". Evitamos checkeando este flag antes de cada setState.
  const mountedRef = useRef(true);

  const progress = syncMode ? (syncPhase / (SYNC_TEXTS.length - 1)) : 0;

  const runSync = async () => {
    setSyncError(null);
    setSyncPhase(0);
    setSyncStarted(true);

    // Check network + last sync to decide if sync is needed
    const NetInfo = (await import('@react-native-community/netinfo')).default;
    const { syncCursors } = await import('../../sync/cursors');
    await syncCursors.init();
    const netState = await NetInfo.fetch();
    const isOffline = !netState.isConnected;
    const lastSync = syncCursors.getLastSyncAt();
    const hasCachedData = lastSync !== null && lastSync > 0;
    const MAX_SYNC_AGE_HOURS = 12;
    const hoursAgo = hasCachedData ? (Date.now() - lastSync) / (1000 * 60 * 60) : Infinity;
    const isStale = hoursAgo > MAX_SYNC_AGE_HOURS;

    if (isOffline && !hasCachedData) {
      // First install, no data, no internet — can't do anything
      setSyncError('Sin conexión a internet. Necesitas conectarte al menos una vez para sincronizar tus datos.');
      return;
    }

    if (isOffline && hasCachedData) {
      // Offline but have data — let the user in
      if (__DEV__) console.log(`[Offline] Skipping sync — last synced ${Math.round(hoursAgo)}h ago`);
      setSyncPhase(6);
      onSyncComplete?.();
      setTimeout(() => {
        Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          onFinish();
        });
      }, 800);
      return;
    }

    if (!isStale && hasCachedData) {
      // Online but data is fresh (< 12h) — skip sync, enter fast
      if (__DEV__) console.log(`[Fresh] Data is ${Math.round(hoursAgo)}h old (< ${MAX_SYNC_AGE_HOURS}h) — skipping startup sync`);
      setSyncPhase(6);
      onSyncComplete?.();
      setTimeout(() => {
        Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          onFinish();
        });
      }, 800);
      return;
    }

    // Online + stale data (or first sync) — run full sync
    if (__DEV__) console.log(`[Sync] Data is ${hasCachedData ? Math.round(hoursAgo) + 'h old' : 'empty'} — running sync`);

    try {
      // Online — run full sync
      let phase = 0;
      timerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        phase++;
        if (phase < 4) setSyncPhase(phase);
      }, 2500);

      await performSync();
      if (timerRef.current) clearInterval(timerRef.current);
      if (!mountedRef.current) return;

      // Empresa
      setSyncPhase(4);
      try {
        const resp = await api.get('/api/mobile/empresa');
        const data = (resp.data as any).data;
        if (data) {
          await secureStorage.set(EMPRESA_CACHE_KEY, JSON.stringify(data));
          if (data.logoUrl) RNImage.prefetch(data.logoUrl).catch(() => {});
        }
      } catch { /* non-fatal */ }
      if (!mountedRef.current) return;

      // Catalogos: ya no hace falta cargar via endpoints separados — el sync
      // delta de la fase anterior trae zonas/categorias/familias y los persiste
      // en WatermelonDB para offline real (commit 2026-04-28).
      setSyncPhase(5);

      // Done!
      setSyncPhase(6);
      onSyncComplete?.();

      // Fade out after showing "Listo"
      setTimeout(() => {
        if (!mountedRef.current) return;
        Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          onFinish();
        });
      }, 1200);

    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!mountedRef.current) return;

      // HOTFIX: antes hacíamos `setSyncError(err.message)` lo cual mostraba
      // strings axios crudos como "Request failed with status code 401"
      // verbatim al usuario. Pero peor: si era 401, el splash quedaba pegado
      // sin onFinish() — usuario no podía llegar a la pantalla de login.
      const friendly = friendlyErrorMessage(err);

      // Si es auth error: el interceptor de api/client.ts ya emitió
      // forceLogout (limpió tokens + isAuthenticated=false). Cerrar el
      // splash para que AuthGate redirija al login. Sin esto el splash
      // se quedaba encima ocultando login screen — usuario reportaba
      // "no me deja loguearme".
      if (friendly.isAuthError) {
        // Defensa adicional: forzar logout por si el interceptor no lo
        // hizo (ej: error vino de una request directa sin pasar por
        // apiInstance, o el evento se perdió).
        try { useAuthStore.getState().logout(); } catch { /* ignore */ }
        Animated.timing(containerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          if (mountedRef.current) onFinish();
        });
        return;
      }

      setSyncError(friendly.text);
    }
  };

  /**
   * Escape hatch: si el user queda atrapado en el error box (ej: red intermitente
   * con falsos positivos repetidos), permite cerrar sesión y volver al login.
   * Cubre el caso edge donde `forceLogout` del interceptor no alcanzó a
   * limpiar tokens (storage native error) y la app cree que sigue authenticated.
   */
  const handleLogoutAndExit = async () => {
    try { await useAuthStore.getState().logout(); } catch { /* ignore */ }
    Animated.timing(containerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      if (mountedRef.current) onFinish();
    });
  };

  useEffect(() => {
    // Animate logo + text in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(textTranslateY, { toValue: 0, damping: 12, stiffness: 100, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      if (syncMode) {
        // Show progress bar and start sync
        Animated.timing(progressOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        runSync();
      } else {
        // Normal splash — hold then fade out
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(containerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start(() => onFinish());
      }
    });

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents={syncMode ? 'auto' : 'none'}>
      {/* Dark gradient overlay (simulates photo + gradient from Pencil design) */}
      <View style={styles.gradientOverlay} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <LogoIcon size={LOGO_SIZE} />
        </Animated.View>

        <Animated.View style={[styles.textWrap, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
          <Text style={styles.brandHandy}>Handy</Text>
          <Text style={styles.brandSuites}> Suites</Text>
          <Text style={styles.brandReg}>®</Text>
        </Animated.View>

        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={styles.subtitle}>
            {syncMode && syncStarted ? SYNC_TEXTS[syncPhase] : 'Gestión de rutas en ruta'}
          </Text>
        </Animated.View>

        {/* Dots indicator */}
        {!syncMode && (
          <Animated.View style={[styles.dotsRow, { opacity: subtitleOpacity }]}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </Animated.View>
        )}

        {/* Progress bar — only in sync mode */}
        {syncMode && (
          <Animated.View style={[styles.progressSection, { opacity: progressOpacity }]}>
            {syncError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{syncError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={runSync} activeOpacity={0.8}>
                  <RefreshCcw size={16} color="#fff" />
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutAndExit} activeOpacity={0.8}>
                  <LogOut size={14} color="#94a3b8" />
                  <Text style={styles.logoutText}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
              </>
            )}
          </Animated.View>
        )}
      </View>

      <Animated.View style={[styles.footerWrap, { opacity: subtitleOpacity }]}>
        <Text style={styles.footerText}>Powered by Handy Tech</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    opacity: 0.92,
  },
  content: { alignItems: 'center', justifyContent: 'center' },
  logoWrap: { marginBottom: 24 },
  textWrap: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  brandHandy: { fontSize: 38, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  brandSuites: { fontSize: 38, fontWeight: '300', color: '#ffffffcc', letterSpacing: -0.5 },
  brandReg: { fontSize: 18, fontWeight: '400', color: '#ffffffcc', lineHeight: 28 },
  subtitle: { fontSize: 15, fontWeight: '400', color: '#ffffffb3', letterSpacing: 0.3, textAlign: 'center' },

  // Dots
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 20, alignItems: 'center' },
  dot: { borderRadius: 4 },
  dotActive: { width: 8, height: 8, backgroundColor: '#ffffff' },
  dotInactive: { width: 6, height: 6, backgroundColor: '#ffffff50', borderRadius: 3 },

  // Footer
  footerWrap: { position: 'absolute', bottom: 48 },
  footerText: { fontSize: 11, color: '#ffffff50', fontWeight: '400' },

  // Sync progress
  progressSection: { marginTop: 32, width: SCREEN_WIDTH * 0.7, alignItems: 'center', gap: 8 },
  progressBar: { width: '100%', height: 4, backgroundColor: '#ffffff20', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  progressPercent: { fontSize: 12, fontWeight: '600', color: '#ffffffb3' },

  // Error
  errorBox: { alignItems: 'center', gap: 12 },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, height: 40, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 36, marginTop: 4 },
  logoutText: { color: '#94a3b8', fontWeight: '500', fontSize: 12 },
});
