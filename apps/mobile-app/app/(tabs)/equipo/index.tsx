import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, ShoppingBag, Eye, DollarSign, MapPin, TrendingUp, UserCheck } from 'lucide-react-native';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useSupervisorDashboard, useMisVendedores } from '@/hooks/useSupervisor';
import { useState } from 'react';
import type { VendedorEquipo } from '@/api/schemas/supervisor';

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Icon size={20} color={color} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function VendedorRow({ vendedor, onPress }: { vendedor: VendedorEquipo; onPress: () => void }) {
  const initials = vendedor.nombre
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable style={styles.vendedorRow} onPress={onPress} testID={`vendedor-${vendedor.id}`}>
      <View style={[styles.avatar, { backgroundColor: vendedor.activo ? '#dbeafe' : '#fee2e2' }]}>
        <Text style={[styles.avatarText, { color: vendedor.activo ? '#2563eb' : '#dc2626' }]}>{initials}</Text>
      </View>
      <View style={styles.vendedorInfo}>
        <Text style={styles.vendedorName}>{vendedor.nombre}</Text>
        <Text style={styles.vendedorEmail}>{vendedor.email}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: vendedor.activo ? '#22c55e' : '#ef4444' }]} />
    </Pressable>
  );
}

function EquipoContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: dashboard, isLoading: loadingDash, refetch: refetchDash } = useSupervisorDashboard();
  const { data: vendedores, isLoading: loadingVend, refetch: refetchVend } = useMisVendedores();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDash(), refetchVend()]);
    setRefreshing(false);
  };

  const formatMoney = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  if (loadingDash && loadingVend) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando equipo...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mi Equipo</Text>
        <Pressable style={styles.mapButton} onPress={() => router.push('/(tabs)/equipo/mapa')} testID="ver-mapa">
          <MapPin size={18} color="#2563eb" />
          <Text style={styles.mapButtonText}>Ver mapa</Text>
        </Pressable>
      </View>

      {/* KPIs */}
      {dashboard && (
        <View style={styles.kpiGrid} testID="supervisor-kpis">
          <KpiCard icon={Users} label="Vendedores" value={dashboard.totalVendedores} color="#2563eb" />
          <KpiCard icon={ShoppingBag} label="Pedidos hoy" value={dashboard.pedidosHoy} color="#16a34a" />
          <KpiCard icon={DollarSign} label="Ventas mes" value={formatMoney(dashboard.ventasMes)} color="#d97706" />
          <KpiCard icon={Eye} label="Visitas hoy" value={`${dashboard.visitasCompletadasHoy}/${dashboard.visitasHoy}`} color="#7c3aed" />
          <KpiCard icon={TrendingUp} label="Pedidos mes" value={dashboard.pedidosMes} color="#0891b2" />
          <KpiCard icon={UserCheck} label="Clientes" value={dashboard.totalClientes} color="#e11d48" />
        </View>
      )}

      {/* Vendedores list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vendedores ({vendedores?.length ?? 0})</Text>
        {vendedores && vendedores.length > 0 ? (
          vendedores.map(v => (
            <VendedorRow
              key={v.id}
              vendedor={v}
              onPress={() => router.push(`/(tabs)/equipo/vendedor/${v.id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Users size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>No tienes vendedores asignados</Text>
            <Text style={styles.emptySubtext}>Pide al administrador que te asigne vendedores</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  mapButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  mapButtonText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginTop: 12,
  },
  kpiCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    width: '47%', flexGrow: 1,
    borderLeftWidth: 3, gap: 4,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  kpiValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  kpiLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  vendedorRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    padding: 14, borderRadius: 12, marginBottom: 8, gap: 12,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  vendedorInfo: { flex: 1 },
  vendedorName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  vendedorEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});

export default function EquipoScreen() {
  return (
    <ErrorBoundary componentName="TabEquipo">
      <EquipoContent />
    </ErrorBoundary>
  );
}
