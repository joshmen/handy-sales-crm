import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import {
  Wifi, WifiOff, RefreshCcw, CheckCircle, Clock,
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ImageIcon,
} from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePendingCount, usePendingAttachmentCount } from '@/hooks';
import { useSyncStore } from '@/stores';

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
  const { isConnected: isOnline } = useNetworkStatus();
  const { status, lastSyncAt, lastSummary, error, sync } = useSyncStore();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: pendingAttachments = 0 } = usePendingAttachmentCount();

  const isSyncing = status === 'syncing';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Sincronización</Text>

      {/* Status */}
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
      <Card className="mb-4">
        <View style={styles.syncRow}>
          <View style={[styles.syncIcon, { backgroundColor: lastSyncAt ? '#f0fdf4' : '#f1f5f9' }]}>
            <CheckCircle size={18} color={lastSyncAt ? '#16a34a' : '#94a3b8'} />
          </View>
          <View style={styles.syncContent}>
            <Text style={styles.syncLabel}>Última sincronización</Text>
            <Text style={styles.syncValue}>{formatLastSync(lastSyncAt)}</Text>
          </View>
        </View>
      </Card>

      {/* Pending */}
      <Card className="mb-4">
        <View style={styles.syncRow}>
          <View style={[styles.syncIcon, { backgroundColor: pendingCount > 0 ? '#fef3c7' : '#f1f5f9' }]}>
            <Clock size={18} color={pendingCount > 0 ? '#d97706' : '#94a3b8'} />
          </View>
          <View style={styles.syncContent}>
            <Text style={styles.syncLabel}>Pendientes de sincronizar</Text>
            <Text style={styles.syncValue}>{pendingCount} registros</Text>
          </View>
        </View>
      </Card>

      {/* Pending Attachments */}
      {pendingAttachments > 0 && (
        <Card className="mb-4">
          <View style={styles.syncRow}>
            <View style={[styles.syncIcon, { backgroundColor: '#eff6ff' }]}>
              <ImageIcon size={18} color="#2563eb" />
            </View>
            <View style={styles.syncContent}>
              <Text style={styles.syncLabel}>Fotos pendientes de subir</Text>
              <Text style={styles.syncValue}>{pendingAttachments} archivo{pendingAttachments !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Last Sync Summary */}
      {lastSummary && (lastSummary.pulled > 0 || lastSummary.pushed > 0) && (
        <Card className="mb-4">
          <Text style={styles.summaryTitle}>Resumen última sync</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ArrowDownToLine size={16} color="#2563eb" />
              <Text style={styles.summaryValue}>{lastSummary.pulled}</Text>
              <Text style={styles.summaryLabel}>recibidos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ArrowUpFromLine size={16} color="#16a34a" />
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
      )}

      {/* Sync Button */}
      <Button
        title={isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        onPress={sync}
        loading={isSyncing}
        disabled={!isOnline}
        fullWidth
        icon={<RefreshCcw size={18} color="#ffffff" />}
      />

      {!isOnline && (
        <Text style={styles.offlineHint}>
          Conéctate a internet para sincronizar
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusOnline: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  statusOffline: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
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
  syncIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  syncContent: { flex: 1 },
  syncLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  syncValue: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  summaryItem: { alignItems: 'center', gap: 4, flex: 1 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },
  offlineHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 12,
  },
});
