import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  WifiOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  ImageIcon,
  Clock,
} from 'lucide-react-native';
import { useSyncStore } from '@/stores';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePendingCount } from '@/hooks';
import { classifyError } from '@/sync/errorClassifier';
import type { SyncProgress } from '@/sync/syncEngine';
import { COLORS } from '@/theme/colors';

/**
 * Sprint 1 audit code-quality (2026-06-04): card unificada de estado de sync.
 * Reemplaza el feedback fragmentado anterior (banner verde/rojo + boton suelto
 * + texto de error opaco) por una pieza visual coherente con 7 estados
 * derivados del syncStore + errorClassifier.
 *
 * El usuario reporto "le doy click y no se sabe si ocurrio algo o no, estoy
 * a ciegas". Esta card resuelve eso:
 *  - Idle: muestra ultima sync + pendings + boton para disparar manual
 *  - Syncing (pull/push/attachments): spinner animado + progreso "X de Y"
 *  - Success (transient 3s): banner verde + resumen de items movidos
 *  - Error transient (network/server): amber + countdown + "Reintentar ahora"
 *  - Error auth: rojo + CTA "Iniciar sesion"
 *  - Error permanent (client): rojo + "Contacta soporte"
 *  - Offline: disabled + hint
 *
 * Modo compact (prop): mini-banner para home/index.tsx con solo spinner + texto.
 */

interface Props {
  compact?: boolean;
}

function formatLastSync(ts: number | null): string {
  if (!ts) return 'Nunca';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'hace unos segundos';
  if (diff < 3600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86400_000) return `hace ${Math.floor(diff / 3600_000)} h`;
  return new Date(ts).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function phaseLabel(p: SyncProgress | null): string {
  if (!p) return 'Sincronizando...';
  switch (p.phase) {
    case 'flush_crash': return 'Preparando...';
    case 'pull': return p.total > 0 ? `Bajando ${p.current} de ${p.total}` : 'Bajando datos del servidor...';
    case 'apply_pull': return p.total > 0 ? `Aplicando ${p.current} de ${p.total}` : 'Aplicando cambios...';
    case 'push': return p.total > 0 ? `Enviando ${p.current} de ${p.total}` : 'Enviando cambios...';
    case 'attachments': return p.total > 0 ? `Subiendo ${p.current} de ${p.total} archivos` : 'Subiendo archivos...';
    case 'done': return 'Finalizando...';
    default: return 'Sincronizando...';
  }
}

export function SyncStatusCard({ compact }: Props) {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const isOnline = !!isConnected;
  const status = useSyncStore((s) => s.status);
  const progress = useSyncStore((s) => s.progress);
  const errorType = useSyncStore((s) => s.errorType);
  const error = useSyncStore((s) => s.error);
  const retryingAtMs = useSyncStore((s) => s.retryingAtMs);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastSummary = useSyncStore((s) => s.lastSummary);
  const sync = useSyncStore((s) => s.sync);
  const { data: pendingCount = 0 } = usePendingCount();

  // Spinner animation: rotacion infinita cuando status='syncing'.
  const spin = useSharedValue(0);
  useEffect(() => {
    if (status === 'syncing') {
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(spin);
      spin.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(spin);
  }, [status, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` }],
  }));

  // Countdown para errores transient (network/server). Refresca cada 1s.
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  useEffect(() => {
    if (status !== 'error' || !retryingAtMs) {
      setCountdownSec(null);
      return;
    }
    const tick = () => {
      const remainingMs = retryingAtMs - Date.now();
      if (remainingMs <= 0) {
        setCountdownSec(0);
      } else {
        setCountdownSec(Math.ceil(remainingMs / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, retryingAtMs]);

  const isSyncing = status === 'syncing';
  const classifiedAuth = errorType === 'auth';
  const classifiedTransient = errorType === 'network' || errorType === 'server';
  const classifiedClient = errorType === 'client';

  const headerStyle = useMemo(() => {
    if (status === 'syncing') return styles.cardSyncing;
    if (status === 'success') return styles.cardSuccess;
    if (status === 'error') {
      if (classifiedAuth) return styles.cardErrorAuth;
      if (classifiedTransient) return styles.cardErrorTransient;
      return styles.cardErrorPermanent;
    }
    if (!isOnline) return styles.cardOffline;
    return styles.cardIdle;
  }, [status, classifiedAuth, classifiedTransient, isOnline]);

  const handlePressMainButton = () => {
    if (classifiedAuth) {
      router.replace('/(auth)/login' as any);
      return;
    }
    sync().catch(() => {/* error state se setea en el store */});
  };

  // Compact mode: barra horizontal para home/index. Solo muestra cuando hay actividad
  // (syncing) o error visible. En idle/success/offline no renderiza nada.
  if (compact) {
    if (status !== 'syncing' && status !== 'error') return null;
    return (
      <TouchableOpacity
        style={[styles.compactBanner, isSyncing ? styles.compactSyncing : styles.compactError]}
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/sync' as any)}
        accessibilityRole="button"
        accessibilityLabel={isSyncing ? 'Sincronizando, toca para ver progreso' : 'Error de sincronización, toca para detalles'}
      >
        {isSyncing ? (
          <>
            <Animated.View style={spinStyle}>
              <RefreshCcw size={14} color="#ffffff" />
            </Animated.View>
            <Text style={styles.compactText} numberOfLines={1}>{phaseLabel(progress)}</Text>
          </>
        ) : (
          <>
            <AlertCircle size={14} color="#ffffff" />
            <Text style={styles.compactText} numberOfLines={1}>
              {error ? classifyError(error, isOnline).userMessage : 'Error de sincronización'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, headerStyle]}>
      <View style={styles.headerRow}>
        {isSyncing ? (
          <Animated.View style={spinStyle}>
            <RefreshCcw size={20} color={COLORS.primary} />
          </Animated.View>
        ) : status === 'success' ? (
          <CheckCircle size={20} color="#16a34a" />
        ) : status === 'error' && classifiedAuth ? (
          <AlertCircle size={20} color="#dc2626" />
        ) : status === 'error' && classifiedTransient ? (
          <AlertTriangle size={20} color="#d97706" />
        ) : status === 'error' ? (
          <AlertCircle size={20} color="#dc2626" />
        ) : !isOnline ? (
          <WifiOff size={20} color="#94a3b8" />
        ) : (
          <RefreshCcw size={20} color={COLORS.primary} />
        )}
        <Text style={styles.title}>
          {isSyncing ? phaseLabel(progress)
            : status === 'success' ? '¡Sincronizado!'
            : status === 'error' && classifiedAuth ? 'Tu sesión expiró'
            : status === 'error' && classifiedTransient ? 'Reintentando sincronización'
            : status === 'error' && classifiedClient ? 'Error de validación'
            : status === 'error' ? 'Error desconocido'
            : !isOnline ? 'Sin conexión'
            : 'Listo para sincronizar'}
        </Text>
      </View>

      {/* Sub-text / detail */}
      {isSyncing && progress && progress.total > 0 && (
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }]} />
        </View>
      )}

      {status === 'success' && lastSummary && (
        <View style={styles.summaryRow}>
          {lastSummary.pushed > 0 && (
            <View style={styles.summaryItem}>
              <ArrowUpFromLine size={14} color="#16a34a" />
              <Text style={styles.summaryText}>{lastSummary.pushed} enviados</Text>
            </View>
          )}
          {lastSummary.pulled > 0 && (
            <View style={styles.summaryItem}>
              <ArrowDownToLine size={14} color={COLORS.primary} />
              <Text style={styles.summaryText}>{lastSummary.pulled} recibidos</Text>
            </View>
          )}
          {lastSummary.conflicts > 0 && (
            <View style={styles.summaryItem}>
              <AlertTriangle size={14} color="#d97706" />
              <Text style={styles.summaryText}>{lastSummary.conflicts} conflictos</Text>
            </View>
          )}
        </View>
      )}

      {status === 'error' && error && (
        <Text style={styles.errorText}>
          {classifyError(error, isOnline).userMessage}
        </Text>
      )}

      {status === 'error' && classifiedTransient && countdownSec !== null && countdownSec > 0 && (
        <Text style={styles.countdownText}>Reintentando en {countdownSec}s</Text>
      )}

      {status === 'idle' && (
        <View style={styles.idleMeta}>
          <View style={styles.metaRow}>
            <Clock size={13} color="#64748b" />
            <Text style={styles.metaText}>Última sincronización: {formatLastSync(lastSyncAt)}</Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.metaRow}>
              <ImageIcon size={13} color="#d97706" />
              <Text style={[styles.metaText, { color: '#d97706' }]}>{pendingCount} pendientes locales</Text>
            </View>
          )}
        </View>
      )}

      {/* Main action button. Disabled en syncing y offline (excepto error auth que va a login). */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          (isSyncing || (!isOnline && !classifiedAuth)) && styles.actionButtonDisabled,
          classifiedAuth && styles.actionButtonAuth,
          classifiedTransient && styles.actionButtonTransient,
        ]}
        onPress={handlePressMainButton}
        disabled={isSyncing || (!isOnline && !classifiedAuth)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={
          classifiedAuth ? 'Iniciar sesión'
          : classifiedTransient ? 'Reintentar ahora'
          : isSyncing ? 'Sincronizando'
          : 'Sincronizar ahora'
        }
        accessibilityState={{ disabled: isSyncing || (!isOnline && !classifiedAuth), busy: isSyncing }}
      >
        {!isSyncing && (
          classifiedAuth ? <AlertCircle size={16} color="#ffffff" />
          : classifiedTransient ? <RefreshCcw size={16} color="#ffffff" />
          : <RefreshCcw size={16} color="#ffffff" />
        )}
        <Text style={styles.actionButtonText}>
          {classifiedAuth ? 'Iniciar sesión'
            : classifiedTransient ? 'Reintentar ahora'
            : classifiedClient ? 'Contacta soporte'
            : isSyncing ? 'Sincronizando...'
            : !isOnline ? 'Sin conexión'
            : 'Sincronizar ahora'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  cardIdle: {},
  cardSyncing: { borderColor: COLORS.primary, backgroundColor: '#eef2ff' },
  cardSuccess: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  cardErrorAuth: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  cardErrorTransient: { borderColor: '#d97706', backgroundColor: '#fffbeb' },
  cardErrorPermanent: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  cardOffline: { borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },

  progressBarOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 13, color: '#334155', fontWeight: '600' },

  errorText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  countdownText: { fontSize: 13, fontWeight: '700', color: '#d97706' },

  idleMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#64748b' },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonDisabled: { backgroundColor: '#94a3b8' },
  actionButtonAuth: { backgroundColor: '#dc2626' },
  actionButtonTransient: { backgroundColor: '#d97706' },
  actionButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  // Compact mode (mini-banner home/index)
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'center',
  },
  compactSyncing: { backgroundColor: COLORS.primary },
  compactError: { backgroundColor: '#dc2626' },
  compactText: { fontSize: 13, color: '#ffffff', fontWeight: '600', flexShrink: 1 },
});
