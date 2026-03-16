import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Clock } from 'lucide-react-native';
import { SbOrders, SbVisit, SbMoney, SbClients, SbTeam } from '@/components/icons/DashboardIcons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useVendedorResumen } from '@/hooks/useSupervisor';
import { useState } from 'react';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Icon size={18} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)} días`;
}

function VendedorDetalleContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendedorId = parseInt(id, 10);
  const insets = useSafeAreaInsets();
  const { data: resumen, isLoading, refetch } = useVendedorResumen(vendedorId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!resumen) {
    return (
      <View style={[styles.container, styles.center]}>
        <SbTeam size={40} />
        <Text style={styles.errorText}>Vendedor no encontrado</Text>
      </View>
    );
  }

  const { vendedor, hoy, totalClientes, ultimaUbicacion } = resumen;
  const initials = vendedor.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{vendedor.nombre}</Text>
        <Text style={styles.profileEmail}>{vendedor.email}</Text>
        <View style={[styles.statusBadge, { backgroundColor: vendedor.activo ? '#dcfce7' : '#fee2e2' }]}>
          <View style={[styles.statusDotSmall, { backgroundColor: vendedor.activo ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.statusText, { color: vendedor.activo ? '#16a34a' : '#dc2626' }]}>
            {vendedor.activo ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      {/* Today's stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen del día</Text>
        <View style={styles.statGrid} testID="vendedor-stats">
          <StatCard icon={SbOrders} label="Pedidos" value={hoy.pedidos} color="#2563eb" />
          <StatCard icon={SbMoney} label="Ventas" value={formatMoney(hoy.ventas)} color="#16a34a" />
          <StatCard icon={SbVisit} label="Visitas" value={`${hoy.visitasCompletadas}/${hoy.visitas}`} color="#7c3aed" />
          <StatCard icon={SbMoney} label="Cobros" value={formatMoney(hoy.cobros)} color="#d97706" />
          <StatCard icon={SbClients} label="Clientes" value={totalClientes} color="#0891b2" />
        </View>
      </View>

      {/* Last known location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Última ubicación</Text>
        {ultimaUbicacion ? (
          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <MapPin size={18} color="#2563eb" />
              <Text style={styles.locationClient}>{ultimaUbicacion.clienteNombre ?? 'Ubicación desconocida'}</Text>
            </View>
            <View style={styles.locationRow}>
              <Clock size={14} color="#94a3b8" />
              <Text style={styles.locationTime}>{formatTimeAgo(ultimaUbicacion.fecha)}</Text>
            </View>
            <Text style={styles.locationCoords}>
              {ultimaUbicacion.latitud.toFixed(4)}, {ultimaUbicacion.longitud.toFixed(4)}
            </Text>
          </View>
        ) : (
          <View style={styles.locationCard}>
            <MapPin size={24} color="#94a3b8" />
            <Text style={styles.noLocationText}>Sin ubicación registrada hoy</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingTop: 8 },
  errorText: { marginTop: 12, fontSize: 15, color: '#64748b' },
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarLargeText: { fontSize: 24, fontWeight: '700', color: '#2563eb' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  profileEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10,
  },
  statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  section: { marginTop: 16, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  statGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14, width: '47%', flexGrow: 1,
    borderTopWidth: 3, gap: 4,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  locationCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 8,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationClient: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  locationTime: { fontSize: 13, color: '#64748b' },
  locationCoords: { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' },
  noLocationText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
});

export default function VendedorDetalleScreen() {
  return (
    <ErrorBoundary componentName="VendedorDetalle">
      <VendedorDetalleContent />
    </ErrorBoundary>
  );
}
