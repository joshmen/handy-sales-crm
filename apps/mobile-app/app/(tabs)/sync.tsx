import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, Button, ConfirmModal } from '@/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Wifi, WifiOff, RefreshCcw, CheckCircle, Clock,
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ImageIcon, ChevronLeft,
  DownloadCloud,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePendingCount, usePendingAttachmentCount, useTenantLocale } from '@/hooks';
import { useSyncStore } from '@/stores';
import { COLORS } from '@/theme/colors';
import { resetDatabase } from '@/db/database';

function formatLastSync(timestamp: number | null, dateTimeFmt: (d: Date) => string): string {
  if (!timestamp) return 'Nunca';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Hace unos segundos';
  if (diff < 3600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86400_000) return `Hace ${Math.floor(diff / 3600_000)} horas`;
  return dateTimeFmt(new Date(timestamp));
}

/**
 * Audit 2026-05-19: vendedor@jeyma vio "Network Error" cuando en realidad
 * el device estaba conectado (banner verde "Conectado") pero el refresh
 * de tokens había fallado por race condition server-side. El mensaje
 * técnico no era accionable. Esta función traduce:
 * - "Network Error" + online → "Reintentando..." (probable race/timeout
 *   transient; el SessionExpiredBanner se encarga si es auth)
 * - "Network Error" + offline → mostrar offline-genuine (raro porque
 *   ya tenemos OfflineBanner pero defensivo)
 * - 401/sesión → mensaje claro de re-login (también cubierto por
 *   SessionExpiredBanner pero útil aquí también)
 * - Otros → mensaje original
 */
function translateSyncError(rawError: string, isOnline: boolean): string {
  const msg = rawError.toLowerCase();
  if (msg.includes('network error') && isOnline) {
    return 'Reintentando conexión con el servidor...';
  }
  if (msg.includes('network error') || msg.includes('timeout')) {
    return 'Sin conexión estable. Reintentaremos cuando haya señal.';
  }
  if (msg.includes('401') || msg.includes('session_revoked') || msg.includes('unauthorized')) {
    return 'Tu sesión necesita renovarse. Toca "Iniciar sesión" en el banner rojo.';
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return 'Servidor temporalmente no disponible. Reintenta en un momento.';
  }
  return rawError;
}

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isConnected: isOnline } = useNetworkStatus();
  const { status, lastSyncAt, lastSummary, error, sync } = useSyncStore();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: pendingAttachments = 0 } = usePendingAttachmentCount();
  const { dateTime: dateTimeFmt } = useTenantLocale();
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isSyncing = status === 'syncing';

  // C.2 (fix prod 2026-06-03 post-incidente Rodrigo): "Restaurar desde servidor"
  // = wipe WDB local + full sync desde server. Caso uso: sospecha de corrupción
  // WDB (sync stuck con error "Cannot update a record with pending changes",
  // pedidos desaparecidos del UI sin motivo, etc.). Solo accesible si NO hay
  // pendings (no destruir trabajo no sincronizado del vendedor).
  const canRestore = isOnline && !isSyncing && pendingCount === 0 && pendingAttachments === 0;
  const handleRestoreFromServer = async () => {
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    try {
      await resetDatabase();
      await useSyncStore.getState().sync();
      Toast.show({
        type: 'success',
        text1: 'Datos restaurados',
        text2: 'Los datos del servidor están actualizados en tu dispositivo.',
        visibilityTime: 5000,
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error al restaurar',
        text2: err?.message ?? 'Intenta de nuevo en un momento.',
        visibilityTime: 6000,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sincronización</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
      {/* Status */}
      <Text style={styles.sectionLabel}>ESTADO</Text>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={[styles.statusBanner, isOnline ? styles.statusOnline : styles.statusOffline]}>
          {isOnline ? <Wifi size={24} color="#16a34a" /> : <WifiOff size={24} color="#ef4444" />}
          <View>
            <Text style={[styles.statusText, { color: isOnline ? '#16a34a' : '#ef4444' }]}>
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </Text>
            <Text style={styles.statusDesc}>
              {isOnline ? 'Los datos se sincronizan automáticamente' : 'Los cambios se guardarán localmente'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Error banner — audit 2026-05-19: traducir mensajes técnicos
          (axios "Network Error" / "Request failed status 401") a algo
          accionable para el vendedor en campo. */}
      {status === 'error' && error && (
        <View style={styles.errorBanner}>
          <AlertTriangle size={18} color="#dc2626" />
          <Text style={styles.errorText}>{translateSyncError(error, isOnline)}</Text>
        </View>
      )}

      {/* Conflict banner */}
      {lastSummary && lastSummary.conflicts > 0 && (
        <View style={styles.conflictBanner}>
          <AlertTriangle size={18} color="#d97706" />
          <Text style={styles.conflictText}>
            {lastSummary.conflicts} registro{lastSummary.conflicts !== 1 ? 's' : ''} actualizado{lastSummary.conflicts !== 1 ? 's' : ''} por el servidor
          </Text>
        </View>
      )}

      {/* Last Sync */}
      <Text style={styles.sectionLabel}>DETALLES</Text>
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <Card className="mb-4">
          <View style={styles.syncRow}>
            <CheckCircle size={18} color={lastSyncAt ? '#16a34a' : '#94a3b8'} style={{ marginRight: 12 }} />
            <View style={styles.syncContent}>
              <Text style={styles.syncLabel}>Última sincronización</Text>
              <Text style={styles.syncValue}>{formatLastSync(lastSyncAt, dateTimeFmt)}</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Pending */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <Card className="mb-4">
          <View style={styles.syncRow}>
            <Clock size={18} color={pendingCount > 0 ? '#d97706' : '#94a3b8'} style={{ marginRight: 12 }} />
            <View style={styles.syncContent}>
              <Text style={styles.syncLabel}>Pendientes de sincronizar</Text>
              <Text style={styles.syncValue}>{pendingCount} registros</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Pending Attachments */}
      {pendingAttachments > 0 && (
        <Card className="mb-4">
          <View style={styles.syncRow}>
            <ImageIcon size={18} color="#6b7280" style={{ marginRight: 12 }} />
            <View style={styles.syncContent}>
              <Text style={styles.syncLabel}>Fotos pendientes de subir</Text>
              <Text style={styles.syncValue}>{pendingAttachments} archivo{pendingAttachments !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Last Sync Summary */}
      {lastSummary && (lastSummary.pulled > 0 || lastSummary.pushed > 0) && (
        <>
        <Text style={styles.sectionLabel}>RESUMEN</Text>
        <Card className="mb-4">
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ArrowDownToLine size={16} color={COLORS.primary} />
              <Text style={styles.summaryValue}>{lastSummary.pulled}</Text>
              <Text style={styles.summaryLabel}>recibidos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ArrowUpFromLine size={16} color={COLORS.salesGreen} />
              <Text style={styles.summaryValue}>{lastSummary.pushed}</Text>
              <Text style={styles.summaryLabel}>enviados</Text>
            </View>
            {lastSummary.conflicts > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <AlertTriangle size={16} color="#d97706" />
                  <Text style={styles.summaryValue}>{lastSummary.conflicts}</Text>
                  <Text style={styles.summaryLabel}>conflictos</Text>
                </View>
              </>
            )}
          </View>
        </Card>
        </>
      )}

      {/* Sync Button — indigo */}
      <TouchableOpacity
        style={[styles.syncButton, !isOnline && styles.syncButtonDisabled]}
        onPress={sync}
        disabled={!isOnline || isSyncing}
        activeOpacity={0.8}
        accessibilityLabel="Sincronizar ahora"
        accessibilityRole="button"
        accessibilityState={{ disabled: !isOnline || isSyncing, busy: isSyncing }}
      >
        <RefreshCcw size={18} color={COLORS.headerText} />
        <Text style={styles.syncButtonText}>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </Text>
      </TouchableOpacity>

      {!isOnline && (
        <Text style={styles.offlineHint}>
          Conéctate a internet para sincronizar
        </Text>
      )}

      {/* C.2 (fix prod 2026-06-03 post-incidente Rodrigo): "Restaurar desde
          servidor" — wipe WDB local + full sync. Solo para emergencias. */}
      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <Text style={styles.sectionLabel}>EMERGENCIA</Text>
        <TouchableOpacity
          style={[styles.restoreButton, !canRestore && styles.restoreButtonDisabled]}
          onPress={() => setShowRestoreConfirm(true)}
          disabled={!canRestore || isRestoring}
          activeOpacity={0.8}
          accessibilityLabel="Restaurar desde servidor"
          accessibilityRole="button"
        >
          <DownloadCloud size={18} color={canRestore ? '#dc2626' : '#9ca3af'} />
          <Text style={[styles.restoreButtonText, !canRestore && styles.restoreButtonTextDisabled]}>
            {isRestoring ? 'Restaurando...' : 'Restaurar desde servidor'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.restoreHint}>
          {pendingCount > 0 || pendingAttachments > 0
            ? 'Sincroniza tus pendientes antes de restaurar.'
            : !isOnline
              ? 'Necesitas internet para restaurar.'
              : 'Borra los datos locales y los descarga de nuevo del servidor. Úsalo solo si crees que algo está mal con tus datos.'}
        </Text>
      </View>
      </View>
      <ConfirmModal
        visible={showRestoreConfirm}
        title="Restaurar desde servidor"
        message="Esto borrará todos los datos locales y los descargará nuevamente del servidor. Solo úsalo si crees que algo está corrupto. ¿Continuar?"
        confirmText="Sí, restaurar"
        cancelText="Cancelar"
        destructive
        onConfirm={handleRestoreFromServer}
        onCancel={() => setShowRestoreConfirm(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusOnline: { backgroundColor: COLORS.onlineBg, borderColor: '#dcfce7' },
  statusOffline: { backgroundColor: COLORS.destructiveLight, borderColor: '#fecaca' },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.destructiveLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500' },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  conflictText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '500' },
  syncRow: { flexDirection: 'row', alignItems: 'center' },
  syncContent: { flex: 1 },
  syncLabel: { fontSize: 13, color: COLORS.textTertiary, fontWeight: '500' },
  syncValue: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  summaryItem: { alignItems: 'center', gap: 4, flex: 1 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: COLORS.foreground },
  summaryLabel: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500' },
  summaryDivider: { width: 1, height: 36, backgroundColor: COLORS.borderMedium },
  syncButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  syncButtonDisabled: { opacity: 0.5 },
  syncButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.headerText },
  offlineHint: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 12,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 12,
  },
  restoreButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  restoreButtonText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
  restoreButtonTextDisabled: { color: '#9ca3af' },
  restoreHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 8,
    lineHeight: 16,
  },
});
