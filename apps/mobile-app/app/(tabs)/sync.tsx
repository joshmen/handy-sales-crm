import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, Button } from '@/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Wifi, WifiOff, RefreshCcw, CheckCircle, Clock,
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ImageIcon, ChevronLeft,
} from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePendingCount, usePendingAttachmentCount } from '@/hooks';
import { useSyncStore } from '@/stores';
import { COLORS } from '@/theme/colors';

function formatLastSync(timestamp: number | null): string {
  if (!timestamp) return 'Nunca';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Hace unos segundos';
  if (diff < 3600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86400_000) return `Hace ${Math.floor(diff / 3600_000)} horas`;
  return new Date(timestamp).toLocaleString('es-MX');
}

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isConnected: isOnline } = useNetworkStatus();
  const { status, lastSyncAt, lastSummary, error, sync } = useSyncStore();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: pendingAttachments = 0 } = usePendingAttachmentCount();

  const isSyncing = status === 'syncing';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn}>
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

      {/* Error banner */}
      {status === 'error' && error && (
        <View style={styles.errorBanner}>
          <AlertTriangle size={18} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
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
              <Text style={styles.syncValue}>{formatLastSync(lastSyncAt)}</Text>
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
      </View>
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
});
