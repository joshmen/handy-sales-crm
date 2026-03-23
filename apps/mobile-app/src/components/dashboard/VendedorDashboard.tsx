import { useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { useOfflineTodayVisits, useOfflineRutaHoy, useOfflineRutaDetalles, useOfflineOrders, useOfflineCobros } from '@/hooks';
import { Card, LoadingSpinner } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/utils/format';
import { MapPin, ChevronDown } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { performSync } from '@/sync/syncEngine';
import { COLORS } from '@/theme/colors';

export function VendedorDashboard() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Local WDB data
  const { data: todayVisits } = useOfflineTodayVisits();
  const { data: rutas, isLoading: loadingRuta } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;
  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const { data: pedidos } = useOfflineOrders();
  const { data: cobros } = useOfflineCobros();

  // Compute KPIs
  const visitasCompletadas = todayVisits?.filter((v) => v.checkOutAt != null).length ?? 0;
  const visitasConVenta = todayVisits?.length ?? 0;

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

  const initials = (user?.name ?? 'V')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Vendedor'}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.preventaBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.preventaText}>Preventa</Text>
                <ChevronDown size={14} color={COLORS.headerText} />
              </View>
            </View>
          </View>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      {/* KPI Cards — white bg, no pastel, no icon circles */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text style={styles.sectionLabel}>RESUMEN DEL DIA</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{visitasConVenta}</Text>
          <Text style={styles.kpiLabel}>Visitas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{visitasCompletadas}</Text>
          <Text style={styles.kpiLabel}>Completadas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: COLORS.salesGreen }]}>
            {formatCurrency(totalPendiente > 0 ? totalPendiente : 0)}
          </Text>
          <Text style={styles.kpiLabel}>Pendiente</Text>
        </View>
      </Animated.View>

      {/* Route Progress */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={styles.sectionLabel}>RUTA DEL DIA</Text>
        {loadingRuta ? (
          <LoadingSpinner size="small" />
        ) : route ? (
          <Card
            className="mb-5"
            onPress={() => router.push('/(tabs)/ruta' as any)}
          >
            <View style={styles.routeHeader}>
              <View style={styles.routeIconBox}>
                <MapPin size={20} color="#6b7280" />
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
              <MapPin size={24} color={COLORS.textTertiary} />
              <Text style={styles.emptyRouteText}>
                No tienes ruta asignada para hoy
              </Text>
            </View>
          </Card>
        )}
      </Animated.View>

      {/* Quick Actions — white cards with gray icons */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <Text style={styles.sectionLabel}>ACCIONES RAPIDAS</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/vender/crear' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Nuevo Pedido</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/cobrar' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Registrar Cobro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/mapa')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Ver Mapa</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Activity Feed Placeholder */}
      <Text style={styles.sectionLabel}>ACTIVIDAD RECIENTE</Text>
      <Card className="mb-4">
        <View style={styles.activityEmpty}>
          <Text style={styles.activityEmptyText}>
            Aqui veras los ultimos eventos del dia
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    backgroundColor: COLORS.headerBg,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flex: 1 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '700', color: COLORS.headerText },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.headerText },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  preventaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  preventaText: { fontSize: 13, fontWeight: '600', color: COLORS.headerText },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: COLORS.foreground },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  routeHeader: { flexDirection: 'row', alignItems: 'center' },
  routeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  progressSection: { marginTop: 14, gap: 6 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderMedium,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  progressPercent: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  emptyRoute: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyRouteText: { fontSize: 14, color: COLORS.textTertiary },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: { fontSize: 12, fontWeight: '600', color: COLORS.foreground },
  activityEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  activityEmptyText: { fontSize: 13, color: COLORS.textTertiary },
});
