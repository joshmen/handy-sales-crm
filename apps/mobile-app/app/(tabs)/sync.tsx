import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { Wifi, WifiOff, RefreshCcw, CheckCircle, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const [syncing, setSyncing] = useState(false);
  const { isConnected: isOnline } = useNetworkStatus();

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync
    setTimeout(() => setSyncing(false), 2000);
  };

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

      {/* Last Sync */}
      <Card className="mb-4">
        <View style={styles.syncRow}>
          <View style={[styles.syncIcon, { backgroundColor: '#f0fdf4' }]}>
            <CheckCircle size={18} color="#16a34a" />
          </View>
          <View style={styles.syncContent}>
            <Text style={styles.syncLabel}>Última sincronización</Text>
            <Text style={styles.syncValue}>Hace unos momentos</Text>
          </View>
        </View>
      </Card>

      {/* Pending */}
      <Card className="mb-4">
        <View style={styles.syncRow}>
          <View style={[styles.syncIcon, { backgroundColor: '#fef3c7' }]}>
            <Clock size={18} color="#d97706" />
          </View>
          <View style={styles.syncContent}>
            <Text style={styles.syncLabel}>Pendientes de sincronizar</Text>
            <Text style={styles.syncValue}>0 registros</Text>
          </View>
        </View>
      </Card>

      {/* Sync Button */}
      <Button
        title="Sincronizar Ahora"
        onPress={handleSync}
        loading={syncing}
        fullWidth
        icon={<RefreshCcw size={18} color="#ffffff" />}
      />
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
});
