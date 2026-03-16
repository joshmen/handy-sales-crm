import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
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
import { RefreshCcw } from 'lucide-react-native';

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

  const progress = syncMode ? (syncPhase / (SYNC_TEXTS.length - 1)) : 0;
  const isDone = syncPhase === SYNC_TEXTS.length - 1;

  const runSync = async () => {
    setSyncError(null);
    setSyncPhase(0);
    setSyncStarted(true);

    try {
      // Simulate progressive phases during monolithic sync
      let phase = 0;
      timerRef.current = setInterval(() => {
        phase++;
        if (phase < 4) setSyncPhase(phase);
      }, 2500);

      await performSync();
      if (timerRef.current) clearInterval(timerRef.current);

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

      // Catálogos
      setSyncPhase(5);
      try {
        await Promise.allSettled([
          api.get('/api/mobile/catalogos/zonas'),
          api.get('/api/mobile/catalogos/categorias-cliente'),
          api.get('/api/mobile/catalogos/categorias-producto'),
          api.get('/api/mobile/catalogos/familias-producto'),
        ]);
      } catch { /* non-fatal */ }

      // Done!
      setSyncPhase(6);
      onSyncComplete?.();

      // Fade out after showing "Listo"
      setTimeout(() => {
        Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          onFinish();
        });
      }, 1200);

    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setSyncError(err instanceof Error ? err.message : 'Error de sincronización');
    }
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents={syncMode ? 'auto' : 'none'}>
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
            {syncMode && syncStarted ? SYNC_TEXTS[syncPhase] : 'Tu equipo de ventas, conectado'}
          </Text>
        </Animated.View>

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

      <Animated.View style={[styles.versionWrap, { opacity: subtitleOpacity }]}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: { alignItems: 'center', justifyContent: 'center' },
  logoWrap: { marginBottom: 24 },
  textWrap: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  brandHandy: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  brandSuites: { fontSize: 32, fontWeight: '300', color: '#9CA3AF', letterSpacing: -0.5 },
  brandReg: { fontSize: 16, fontWeight: '400', color: '#9CA3AF', lineHeight: 24 },
  subtitle: { fontSize: 14, fontWeight: '500', color: '#94a3b8', letterSpacing: 0.5, textAlign: 'center' },
  versionWrap: { position: 'absolute', bottom: 48 },
  versionText: { fontSize: 12, color: '#cbd5e1', fontWeight: '500' },

  // Sync progress
  progressSection: { marginTop: 32, width: SCREEN_WIDTH * 0.7, alignItems: 'center', gap: 8 },
  progressBar: { width: '100%', height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 2 },
  progressPercent: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },

  // Error
  errorBox: { alignItems: 'center', gap: 12 },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 20, height: 40, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
