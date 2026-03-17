import { useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { useOfflineTodayVisits, useOfflineRutaHoy, useOfflineRutaDetalles, useOfflineOrders, useOfflineCobros } from '@/hooks';
import { Card, LoadingSpinner } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/utils/format';
import {
  ShoppingBag,
  Wallet,
  Map,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { SbVisit, SbChart, SbMoney, SbRoute, SbTeam } from '@/components/icons/DashboardIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { performSync } from '@/sync/syncEngine';
import { useSupervisorDashboard } from '@/hooks/useSupervisor';

function HoyScreenContent() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const isSupervisor = user?.role === 'SUPERVISOR';
  const { data: supDash, refetch: refetchSupDash } = useSupervisorDashboard();

  // Local WDB data
  const { data: todayVisits } = useOfflineTodayVisits();
  const { data: rutas, isLoading: loadingRuta } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;
  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const { data: pedidos } = useOfflineOrders();
  const { data: cobros } = useOfflineCobros();

  // Compute KPIs
  const visitasCompletadas = todayVisits?.filter((v) => v.checkOutAt != null).length ?? 0;
  const visitasConVenta = todayVisits?.length ?? 0; // simplified: count all today visits

  const totalPendiente = useMemo(() => {
    const facturado = (pedidos ?? [])
      .filter((p) => p.estado >= 1 && p.estado !== 4)
      .reduce((sum, p) => sum + (p.total || 0), 0);
    const cobrado = (cobros ?? []).reduce((sum, c) => sum + (c.monto || 0), 0);
    return facturado - cobrado;
  }, [pedidos, cobros]);

  // Route progress from detalles
  const stats = useMemo(() => {
    const total = detalles?.length ?? 0;
    const completadas = detalles?.filter((d) => d.estado === 2).length ?? 0;
    return { total, completadas };
  }, [detalles]);
  const progress = stats.total > 0 ? (stats.completadas / stats.total) * 100 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    if (isSupervisor) await refetchSupDash();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563eb"
          colors={['#2563eb']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting Header */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'V'}
            </Text>
          </View>
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Vendedor'}
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <HandyLogo size={32} />
        </View>
      </View>

      {/* Supervisor Team KPIs */}
      {isSupervisor && supDash && (
        <TouchableOpacity
          style={styles.supervisorBanner}
          onPress={() => router.push('/(tabs)/equipo')}
          activeOpacity={0.85}
          testID="supervisor-team-banner"
        >
          <View style={styles.supervisorBannerHeader}>
            <SbTeam size={18} />
            <Text style={styles.supervisorBannerTitle}>Mi Equipo</Text>
            <Text style={styles.supervisorBannerArrow}>→</Text>
          </View>
          <View style={styles.supervisorKpiRow}>
            <View style={styles.supervisorKpi}>
              <Text style={styles.supervisorKpiValue}>{supDash.totalVendedores}</Text>
              <Text style={styles.supervisorKpiLabel}>Vendedores</Text>
            </View>
            <View style={styles.supervisorKpiDivider} />
            <View style={styles.supervisorKpi}>
              <Text style={styles.supervisorKpiValue}>{supDash.pedidosHoy}</Text>
              <Text style={styles.supervisorKpiLabel}>Pedidos hoy</Text>
            </View>
            <View style={styles.supervisorKpiDivider} />
            <View style={styles.supervisorKpi}>
              <Text style={styles.supervisorKpiValue}>
                {supDash.ventasMes >= 1000 ? `$${(supDash.ventasMes / 1000).toFixed(1)}K` : `$${supDash.ventasMes.toFixed(0)}`}
              </Text>
              <Text style={styles.supervisorKpiLabel}>Ventas mes</Text>
            </View>
            <View style={styles.supervisorKpiDivider} />
            <View style={styles.supervisorKpi}>
              <Text style={styles.supervisorKpiValue}>{supDash.visitasCompletadasHoy}/{supDash.visitasHoy}</Text>
              <Text style={styles.supervisorKpiLabel}>Visitas</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* KPI Cards */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
      <Text style={styles.sectionTitle}>{isSupervisor ? 'Mi Actividad Personal' : 'Resumen del Día'}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#eff6ff' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#dbeafe' }]}>
            <SbVisit size={18} />
          </View>
          <Text style={styles.kpiValue}>{visitasConVenta}</Text>
          <Text style={styles.kpiLabel}>Visitas</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#dcfce7' }]}>
            <SbChart size={18} />
          </View>
          <Text style={styles.kpiValue}>{visitasCompletadas}</Text>
          <Text style={styles.kpiLabel}>Completadas</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fef2f2' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#fee2e2' }]}>
            <SbMoney size={18} />
          </View>
          <Text style={styles.kpiValue}>
            {formatCurrency(totalPendiente > 0 ? totalPendiente : 0)}
          </Text>
          <Text style={styles.kpiLabel}>Pendiente</Text>
        </View>
      </Animated.View>

      {/* Route Progress */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <Text style={styles.sectionTitle}>Ruta del Día</Text>
      {loadingRuta ? (
        <LoadingSpinner size="small" />
      ) : route ? (
        <Card
          className="mb-5"
          onPress={() => router.push('/(tabs)/ruta' as any)}
        >
          <View style={styles.routeHeader}>
            <View style={styles.routeIconBox}>
              <SbRoute size={20} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeName}>{route.nombre}</Text>
            </View>
            <StatusBadge type="route" status={route.estado} />
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {stats.completadas}/{stats.total} paradas
              </Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card className="mb-5">
          <View style={styles.emptyRoute}>
            <MapPin size={24} color="#cbd5e1" />
            <Text style={styles.emptyRouteText}>
              No tienes ruta asignada para hoy
            </Text>
          </View>
        </Card>
      )}

      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: '#2563eb' }]}
          onPress={() => router.push('/(tabs)/vender/crear' as any)}
          activeOpacity={0.85}
        >
          <ShoppingBag size={22} color="#ffffff" />
          <Text style={styles.quickActionTextLight}>Nuevo Pedido</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: '#16a34a' }]}
          onPress={() => router.push('/(tabs)/cobrar' as any)}
          activeOpacity={0.85}
        >
          <Wallet size={22} color="#ffffff" />
          <Text style={styles.quickActionTextLight}>Registrar Cobro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: '#7c3aed' }]}
          onPress={() => router.push('/(tabs)/mapa')}
          activeOpacity={0.85}
        >
          <Map size={22} color="#ffffff" />
          <Text style={styles.quickActionTextLight}>Ver Mapa</Text>
        </TouchableOpacity>
      </View>

      </Animated.View>

      {/* Activity Feed Placeholder */}
      <Text style={styles.sectionTitle}>Actividad Reciente</Text>
      <Card className="mb-4">
        <View style={styles.activityEmpty}>
          <Clock size={20} color="#cbd5e1" />
          <Text style={styles.activityEmptyText}>
            Aquí verás los últimos eventos del día
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  greetingSection: { paddingVertical: 20 },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  greetingText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  dateText: { fontSize: 13, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  kpiCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  kpiLabel: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 },
  routeHeader: { flexDirection: 'row', alignItems: 'center' },
  routeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  progressSection: { marginTop: 14, gap: 6 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#2563eb' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  progressPercent: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  emptyRoute: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyRouteText: { fontSize: 14, color: '#94a3b8' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionTextLight: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  activityEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  activityEmptyText: { fontSize: 13, color: '#94a3b8' },
  supervisorBanner: {
    backgroundColor: '#fffbeb', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#fef3c7',
  },
  supervisorBannerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  supervisorBannerTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', flex: 1 },
  supervisorBannerArrow: { fontSize: 18, color: '#d97706', fontWeight: '700' },
  supervisorKpiRow: { flexDirection: 'row', alignItems: 'center' },
  supervisorKpi: { flex: 1, alignItems: 'center' },
  supervisorKpiValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  supervisorKpiLabel: { fontSize: 10, color: '#78716c', fontWeight: '500', marginTop: 2 },
  supervisorKpiDivider: { width: 1, height: 28, backgroundColor: '#fde68a' },
});

export default function HoyScreen() {
  return (
    <ErrorBoundary componentName="TabHoy">
      <HoyScreenContent />
    </ErrorBoundary>
  );
}
