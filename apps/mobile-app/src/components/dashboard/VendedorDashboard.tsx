import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, useJornadaStore } from '@/stores';
import { useOfflineTodayVisits, useOfflineRutaHoy, useOfflineOrders, useOfflineCobros, useOfflineRutaPedidos, useOfflineRutaCarga } from '@/hooks';
import { database } from '@/db/database';
import { Q } from '@nozbe/watermelondb';
import { Card, LoadingSpinner, UserAvatar, ConfirmModal } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import ProgressCard from '@/components/shared/ProgressCard';
import RutaCarga from '@/db/models/RutaCarga';
import RutaPedido from '@/db/models/RutaPedido';
import { useTenantLocale, useUnreadNotificationCount } from '@/hooks';
import { getGreetingForTz } from '@/utils/greeting';
import { startOfDayInTz } from '@/utils/dateTz';
import { MapPin } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { performSync } from '@/sync/syncEngine';
import { COLORS } from '@/theme/colors';
import { api } from '@/api/client';
import { Target } from 'lucide-react-native';
import { JornadaCard } from './JornadaCard';
import { useCreateOrderFlow } from '@/hooks/useCreateOrderFlow';

export function VendedorDashboard() {
  const insets = useSafeAreaInsets();
  const { money: formatCurrency, tz } = useTenantLocale();
  const greeting = getGreetingForTz(tz);
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Bug #6 (audit 2026-05-07): reemplazo del botón "Ver Mapa" (duplicado
  // con tab inferior "Mapa") por "Cerrar jornada". Calza con los 4
  // mecanismos de notif local del cierre — vendedor tiene acceso fácil
  // al cierre manual además de las notifs automáticas.
  const jornadaActiva = useJornadaStore(s => s.activa);
  const finalizarJornada = useJornadaStore(s => s.finalizarJornada);
  const [showCerrarJornadaConfirm, setShowCerrarJornadaConfirm] = useState(false);

  // Hook compartido — abre BottomSheet "¿Preventa o Autoventa?" si la
  // empresa tiene modoVentaDefault='Preguntar'; sino salta directo. Antes
  // este quick action navegaba a /vender/crear sin preguntar tipo (bug
  // reportado por vendedor1@jeyma.com 2026-05-04).
  const { openCreateOrder, SheetComponent } = useCreateOrderFlow();

  // Route stats — single source of truth via direct query on focus
  const [routeStats, setRouteStats] = useState({ total: 0, atendidas: 0, routeName: '', routeEstado: 0 });

  useFocusEffect(useCallback(() => {
    const userId = Number(user?.id ?? 0);
    if (!userId) return;
    // Window simétrico de ±12h alrededor del midnight tenant TZ — alineado
    // con useOfflineRutaHoy. Antes usaba device TZ + +36h, lo que mostraba
    // rutas del día siguiente al vendedor (reportado 2026-05-05: aceptó
    // por error la ruta del miércoles cuando aún era martes).
    const tenantMidnight = startOfDayInTz(tz || 'America/Mexico_City').getTime();
    const windowStart = tenantMidnight - 12 * 3600000;
    const windowEnd = tenantMidnight + 12 * 3600000;
    database.get('rutas').query(
      Q.where('usuario_id', userId), Q.where('activo', true),
      Q.where('fecha', Q.gte(windowStart)),
      Q.where('fecha', Q.lt(windowEnd)),
      // Excluir terminales/no-accionables: Completada=2, Cancelada=3, Cerrada=6 —
      // alineado con useOfflineRutaHoy. Las completadas van al historial; si el
      // dashboard las mostraba y el vendedor recibía notif de ruta nueva, el
      // tap abría la vieja completada en vez de la nueva (reportado 2026-05-05).
      Q.where('estado', Q.notIn([2, 3, 6])),
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
  }, [user?.id, tz]));

  // Local WDB data (for other KPIs)
  const { data: todayVisits } = useOfflineTodayVisits();
  const { data: rutas, isLoading: loadingRuta } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;
  const { data: pedidos } = useOfflineOrders();
  const { data: cobros } = useOfflineCobros();

  // Carga (productos asignados al camión) y pedidos pre-asignados a la
  // ruta — consumidos para los 3 ProgressCards del card "Ruta del día".
  // Mismo patrón que app/(tabs)/ruta/index.tsx — el home muestra los
  // 3 progresos para que el vendedor vea actividad real aún si la ruta
  // se creó sin paradas (ej. ruta solo de venta directa con carga inicial).
  const { data: pedidosCargados } = useOfflineRutaPedidos(route?.id ?? '');
  const { data: cargaProductos } = useOfflineRutaCarga(route?.id ?? '');

  const pedidosEntregados = useMemo(() => {
    return ((pedidosCargados as RutaPedido[] | undefined) ?? [])
      .filter((rp) => rp.estado === 1).length; // EstadoPedidoRuta.Entregado
  }, [pedidosCargados]);
  const totalPedidosCargados = (pedidosCargados as RutaPedido[] | undefined)?.length ?? 0;

  const { cargaTotalUnidades, cargaConsumidasUnidades } = useMemo(() => {
    const carga = (cargaProductos as RutaCarga[] | undefined) ?? [];
    let total = 0;
    let consumidas = 0;
    for (const c of carga) {
      total += c.cantidadTotal ?? 0;
      consumidas += (c.cantidadVendida ?? 0) + (c.cantidadEntregada ?? 0);
    }
    return { cargaTotalUnidades: total, cargaConsumidasUnidades: consumidas };
  }, [cargaProductos]);

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

  // Badge de notif sin leer — al lado de la foto/iniciales en el header.
  // Tap al avatar abre /profile que tiene link directo a /notificaciones.
  const { count: unreadNotifs } = useUnreadNotificationCount();

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };


  return (
    <>
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
              {greeting}, {user?.name?.split(' ')[0] || 'Vendedor'}
            </Text>
          </View>
          <UserAvatar
            name={user?.name}
            avatarUrl={user?.avatarUrl}
            size={40}
            unreadCount={unreadNotifs}
            onPress={() => router.push('/(tabs)/profile')}
            badgeRingColor={COLORS.headerBg}
            testID="header-avatar"
          />
        </View>
      </View>

      {/* KPI Cards — white bg, no pastel, no icon circles */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text style={styles.sectionLabel}>RESUMEN DEL DÍA</Text>
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
      <Animated.View entering={FadeInDown.delay(280).duration(400)}>
        <Text style={styles.sectionLabel}>MIS METAS</Text>
        {metas.length > 0 ? (
          metas.map((meta: any) => {
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
          })
        ) : (
          <View style={styles.metaCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={16} color="#94a3b8" />
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>Sin metas asignadas</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Jornada — control manual del tracking GPS. Ocultamos cuando hay
          ruta EnProgreso porque el watcher de ruta ya gestiona el estado y
          el card de ruta es el primary action en ese caso. */}
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <JornadaCard hideForActiveRoute={!!route && route.estado === 1} />
      </Animated.View>

      {/* Route Progress */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={styles.sectionLabel}>RUTA DEL DÍA</Text>
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
            {/* 3 ProgressCards: Paradas / Pedidos / Productos. Idéntico
                a /ruta — coherencia visual y mismo cómputo. Si la ruta
                se creó sin paradas (caso reportado 2026-05-07 vendedor
                Rodrigo) la barra de Productos sigue mostrando avance
                real porque la carga inicial decrementa con cada
                venta directa confirmada. */}
            <ProgressCard
              label="Paradas atendidas"
              current={stats.atendidas}
              total={stats.total}
              color={COLORS.primary}
              emptyCaption="Esta ruta no tiene paradas asignadas"
            />
            <ProgressCard
              label="Pedidos entregados"
              current={pedidosEntregados}
              total={totalPedidosCargados}
              color={COLORS.success}
              emptyCaption="Esta ruta no tiene pedidos pre-asignados"
            />
            <ProgressCard
              label="Productos (vendidos + entregados)"
              current={cargaConsumidasUnidades}
              total={cargaTotalUnidades}
              color="#d97706"
              emptyCaption="Esta ruta no tiene productos cargados"
            />
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
        <Text style={styles.sectionLabel}>ACCIONES RÁPIDAS</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => openCreateOrder()}
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
            style={[styles.quickAction, !jornadaActiva && styles.quickActionDisabled]}
            onPress={() => jornadaActiva && setShowCerrarJornadaConfirm(true)}
            activeOpacity={jornadaActiva ? 0.85 : 1}
            disabled={!jornadaActiva}
            accessibilityLabel="Cerrar jornada"
            accessibilityRole="button"
            accessibilityState={{ disabled: !jornadaActiva }}
          >
            <Text style={[styles.quickActionText, !jornadaActiva && styles.quickActionTextDisabled]}>
              Cerrar jornada
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Activity Feed Placeholder */}
      <Text style={styles.sectionLabel}>ACTIVIDAD RECIENTE</Text>
      <Card className="mb-4">
        <View style={styles.activityEmpty}>
          <Text style={styles.activityEmptyText}>
            Aquí verás los últimos eventos del día
          </Text>
        </View>
      </Card>
    </ScrollView>
    {/* BottomSheet "Preventa / Venta Directa" — provisto por useCreateOrderFlow */}
    {SheetComponent}
    {/* Bug #6: confirm dialog antes de cerrar jornada manualmente */}
    <ConfirmModal
      visible={showCerrarJornadaConfirm}
      title="¿Cerrar jornada?"
      message="Tu tracking GPS se detendrá. Podrás iniciar una nueva jornada confirmando una venta o desde el botón de iniciar."
      confirmText="Cerrar jornada"
      cancelText="Cancelar"
      destructive
      onConfirm={async () => {
        setShowCerrarJornadaConfirm(false);
        await finalizarJornada('manual');
      }}
      onCancel={() => setShowCerrarJornadaConfirm(false)}
    />
    </>
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
  // Bug #6: estilos para botón "Cerrar jornada" deshabilitado cuando
  // jornadaActiva=false (no hay nada que cerrar).
  quickActionDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  quickActionTextDisabled: { color: '#94a3b8' },
  activityEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  activityEmptyText: { fontSize: 13, color: COLORS.textTertiary },
});
