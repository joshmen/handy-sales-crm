import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { Wifi, WifiOff, RefreshCcw, CheckCircle, Clock, AlertTriangle } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
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
  const { status, lastSyncAt, error, pendingCount, sync } = useSyncStore();

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
  offlineHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 12,
  },
});
