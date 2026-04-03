import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { useOfflineTodayVisits, useOfflineRutaHoy, useOfflineOrders, useOfflineCobros } from '@/hooks';
import { database } from '@/db/database';
import { Q } from '@nozbe/watermelondb';
import { Card, LoadingSpinner } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/utils/format';
import { MapPin } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { performSync } from '@/sync/syncEngine';
import { COLORS } from '@/theme/colors';
import { api } from '@/api/client';
import { Target } from 'lucide-react-native';

export function VendedorDashboard() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Route stats — single source of truth via direct query on focus
  const [routeStats, setRouteStats] = useState({ total: 0, atendidas: 0, routeName: '', routeEstado: 0 });

  useFocusEffect(useCallback(() => {
    const userId = Number(user?.id ?? 0);
    if (!userId) return;
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    database.get('rutas').query(
      Q.where('usuario_id', userId), Q.where('activo', true),
      Q.where('fecha', Q.gte(localMidnight - 12 * 3600000)),
      Q.where('fecha', Q.lt(localMidnight + 36 * 3600000))
    ).fetch().then(async (rutas: any[]) => {
      const r = rutas[0];
      if (!r) { setRouteStats({ total: 0, atendidas: 0, routeName: '', routeEstado: 0 }); return; }
      const detalles = await database.get('ruta_detalles').query(Q.where('ruta_id', r.id)).fetch();
      setRouteStats({
        total: detalles.length,
        atendidas: detalles.filter((d: any) => d.estado === 2 || d.estado === 3).length,
        routeName: r.nombre || '',
        routeEstado: r.estado ?? 0,
      });
    }).catch(() => {});
  }, [user?.id]));

  // Local WDB data (for other KPIs)
  const { data: todayVisits } = useOfflineTodayVisits();
  const { data: rutas, isLoading: loadingRuta } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;
  const { data: pedidos } = useOfflineOrders();
  const { data: cobros } = useOfflineCobros();

  // Compute KPIs
  const visitasCompletadas = todayVisits?.filter((v) => v.checkOutAt != null).length ?? 0;
  const visitasConVenta = todayVisits?.length ?? 0;

  const totalPendiente = useMemo(() => {
    const facturado = (pedidos ?? [])
      .filter((p) => p.estado >= 1 && p.estado !== 6)
      .reduce((sum, p) => sum + (p.total || 0), 0);
    const cobrado = (cobros ?? []).reduce((sum, c) => sum + (c.monto || 0), 0);
    return facturado - cobrado;
  }, [pedidos, cobros]);

  // Metas activas — use direct fetch with abort on unfocus
  const [metas, setMetas] = useState<any[]>([]);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    api.get<any>('/api/mobile/metas', { signal: controller.signal })
      .then(res => setMetas(res.data?.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []));

  const stats = routeStats;
  const progress = stats.total > 0 ? (stats.atendidas / stats.total) * 100 : 0;

  // Additional KPIs — orders and sales today
  const pedidosHoy = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (pedidos ?? []).filter(p => {
      const created = p.createdAt ? new Date(p.createdAt) : null;
      return created && created >= today;
    }).length;
  }, [pedidos]);

  const ventasHoy = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (pedidos ?? [])
      .filter(p => {
        const created = p.createdAt ? new Date(p.createdAt) : null;
        return created && created >= today && p.estado >= 1 && p.estado !== 6;
      })
      .reduce((sum, p) => sum + (p.total || 0), 0);
  }, [pedidos]);

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
          <Text style={styles.kpiValue}>{pedidosHoy}</Text>
          <Text style={styles.kpiLabel}>Pedidos hoy</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: COLORS.salesGreen }]}>
            {formatCurrency(ventasHoy)}
          </Text>
          <Text style={styles.kpiLabel}>Ventas hoy</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#d97706' }]}>
            {formatCurrency(totalPendiente > 0 ? totalPendiente : 0)}
          </Text>
          <Text style={styles.kpiLabel}>Pendiente</Text>
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{visitasConVenta}</Text>
          <Text style={styles.kpiLabel}>Visitas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{visitasCompletadas}</Text>
          <Text style={styles.kpiLabel}>Completadas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{stats.atendidas}/{stats.total}</Text>
          <Text style={styles.kpiLabel}>Paradas</Text>
        </View>
      </Animated.View>

      {/* Metas — compact inline cards */}
      {metas.length > 0 && (
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <Text style={styles.sectionLabel}>MIS METAS</Text>
          {metas.map((meta: any) => {
            const isVentas = meta.tipo === 'ventas';
            const progressPct = `${Math.min(100, meta.porcentaje)}%`;
            const color = meta.porcentaje >= 100 ? '#16a34a' : isVentas ? COLORS.salesGreen : '#2563eb';
            return (
              <View key={meta.id} style={styles.metaCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Target size={14} color={color} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.foreground }}>
                      {meta.tipo === 'ventas' ? 'Ventas' : meta.tipo === 'pedidos' ? 'Pedidos' : 'Visitas'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>{meta.diasRestantes}d</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color }}>{meta.porcentaje}%</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 3, backgroundColor: color, width: progressPct as any }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                    {isVentas ? formatCurrency(meta.progreso) : Math.round(meta.progreso)}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                    Meta: {isVentas ? formatCurrency(meta.meta) : Math.round(meta.meta)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Route Progress */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={styles.sectionLabel}>RUTA DEL DIA</Text>
        {loadingRuta ? (
          <LoadingSpinner size="small" />
        ) : route ? (
          <Card
            className="mb-5"
            onPress={() => router.navigate('/(tabs)/ruta' as any)}
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
                  {stats.atendidas}/{stats.total} paradas
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
  metaCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
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
