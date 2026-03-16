import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { performSync } from '@/sync/syncEngine';
import { api } from '@/api/client';
import { Image } from 'react-native';
import { secureStorage } from '@/utils/storage';
import { CheckCircle, RefreshCcw, WifiOff } from 'lucide-react-native';

const EMPRESA_CACHE_KEY = 'cached_empresa_data';

const SYNC_PHASES = [
  { key: 'connecting', text: 'Conectando con el servidor...', progress: 0.05 },
  { key: 'syncing', text: 'Descargando clientes y productos...', progress: 0.2 },
  { key: 'syncing2', text: 'Descargando pedidos y rutas...', progress: 0.4 },
  { key: 'syncing3', text: 'Descargando cobros y visitas...', progress: 0.6 },
  { key: 'empresa', text: 'Preparando datos de empresa...', progress: 0.8 },
  { key: 'catalogos', text: 'Cargando catálogos...', progress: 0.9 },
  { key: 'done', text: '¡Listo! Preparado para trabajar', progress: 1.0 },
];

interface SyncLoadingScreenProps {
  onComplete: () => void;
}

export function SyncLoadingScreen({ onComplete }: SyncLoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = SYNC_PHASES[phaseIndex];
  const progress = phase?.progress ?? 0;

  const runInitialSync = useCallback(async () => {
    setError(null);
    setPhaseIndex(0);

    try {
      // Phase 1: Start simulated progress during sync
      let currentPhase = 0;
      timerRef.current = setInterval(() => {
        currentPhase++;
        if (currentPhase < 4) { // phases 0-3 during sync
          setPhaseIndex(currentPhase);
        }
      }, 2000);

      // Actual sync
      await performSync();

      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);

      // Phase 5: Fetch empresa data + cache
      setPhaseIndex(4);
      try {
        const resp = await api.get('/api/mobile/empresa');
        const empresaData = (resp.data as any).data;
        if (empresaData) {
          await secureStorage.set(EMPRESA_CACHE_KEY, JSON.stringify(empresaData));
          // Prefetch logo
          if (empresaData.logoUrl) {
            Image.prefetch(empresaData.logoUrl).catch(() => {});
          }
        }
      } catch {
        // Non-fatal — empresa data is nice-to-have
      }

      // Phase 6: Pre-fetch catalogs
      setPhaseIndex(5);
      try {
        await Promise.allSettled([
          api.get('/api/mobile/catalogos/zonas'),
          api.get('/api/mobile/catalogos/categorias-cliente'),
          api.get('/api/mobile/catalogos/categorias-producto'),
          api.get('/api/mobile/catalogos/familias-producto'),
        ]);
      } catch {
        // Non-fatal
      }

      // Phase 7: Done!
      setPhaseIndex(6);
      setTimeout(onComplete, 1200);

    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setError(err instanceof Error ? err.message : 'Error de sincronización');
    }
  }, [onComplete]);

  useEffect(() => {
    runInitialSync();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    await runInitialSync();
    setRetrying(false);
  };

  const isDone = phaseIndex === SYNC_PHASES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      {/* Logo */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <Text style={styles.appName}>Handy Suites</Text>
      </Animated.View>

      {/* Progress Section */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.progressSection}>
        {error ? (
          // Error state
          <View style={styles.errorContainer}>
            <WifiOff size={40} color="#ef4444" />
            <Text style={styles.errorTitle}>Error de conexión</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              disabled={retrying}
              activeOpacity={0.8}
            >
              <RefreshCcw size={18} color="#ffffff" />
              <Text style={styles.retryText}>{retrying ? 'Reintentando...' : 'Reintentar'}</Text>
            </TouchableOpacity>
          </View>
        ) : isDone ? (
          // Success state
          <View style={styles.doneContainer}>
            <CheckCircle size={48} color="#16a34a" />
            <Text style={styles.doneText}>{phase.text}</Text>
          </View>
        ) : (
          // Loading state
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.phaseText}>{phase.text}</Text>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
        )}
      </Animated.View>

      {/* Footer */}
      {!error && !isDone && (
        <Text style={styles.footer}>Esto solo toma unos segundos</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  phaseText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  doneContainer: {
    alignItems: 'center',
    gap: 12,
  },
  doneText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444',
  },
  errorMessage: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    color: '#cbd5e1',
  },
});
