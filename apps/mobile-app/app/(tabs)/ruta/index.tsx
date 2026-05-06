import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineRutaHoy, useOfflineRutaDetalles, useOfflineRutaPedidos, useOfflineRutaCarga, useClientNameMap, useOfflineClients, useOfflineProducts } from '@/hooks';
import { rutasApi } from '@/api';
import Toast from 'react-native-toast-message';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { COLORS, STATUS_PALETTES } from '@/theme/colors';
import { ChevronLeft, Navigation, Map as MapIcon, CheckCircle, Clock } from 'lucide-react-native';
import Ruta from '@/db/models/Ruta';
import { useTenantLocale } from '@/hooks';
import { performSync } from '@/sync/syncEngine';
import { database } from '@/db/database';
import { Q } from '@nozbe/watermelondb';
import Animated, { FadeInDown } from 'react-native-reanimated';
// Carga lazy de react-native-maps + guard de API key. El mini-map en
// esta pantalla solo se renderiza si AMBOS son verdaderos. Sin la key
// MapView crashea al primer tile (reportado 2026-04-27).
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps.MapView;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
} catch { /* maps not available */ }
import { isGoogleMapsConfigured } from '@/utils/maps';
const MAPS_OK = isGoogleMapsConfigured();
import RutaDetalle from '@/db/models/RutaDetalle';
import RutaPedido from '@/db/models/RutaPedido';
import RutaCarga from '@/db/models/RutaCarga';
import Cliente from '@/db/models/Cliente';
import Producto from '@/db/models/Producto';
import Pedido from '@/db/models/Pedido';
import { Package } from 'lucide-react-native';

const STOP_DOT_COLORS: Record<number, string> = {
  0: '#e2e8f0', // Pendiente — gray
  1: COLORS.headerBg, // En Progreso — blue
  2: '#22c55e', // Completada — green
  3: '#ef4444', // Omitida — red
};
const STOP_DOT_TEXT: Record<number, string> = {
  0: '#94a3b8', 1: '#ffffff', 2: '#ffffff', 3: '#ffffff',
};
const STOP_STATUS_NAMES: Record<number, string> = {
  0: 'Pendiente', 1: 'En Progreso', 2: 'Completada', 3: 'Omitida',
};
const STOP_STATUS_TEXT_COLORS: Record<number, string> = {
  0: '#94a3b8', // gray
  1: '#d97706', // amber
  2: '#16a34a', // green
  3: '#ef4444', // red
};

/**
 * Card de progreso para paradas/pedidos/productos. Si la ruta no tiene
 * elementos en esa categoría (`total === 0`), renderiza una versión gris
 * con caption explicativo en vez de "0 de 0 (NaN%)" — decisión UX owner
 * 2026-05-05: más informativo que ocultar y menos engañoso que mostrar 100%.
 */
interface ProgressCardProps {
  label: string;
  current: number;
  total: number;
  color: string;
  emptyCaption: string;
}

function ProgressCard({ label, current, total, color, emptyCaption }: ProgressCardProps) {
  const isEmpty = total === 0;
  const pct = isEmpty ? 0 : Math.min(100, (current / total) * 100);
  const fillColor = isEmpty ? '#cbd5e1' : color;
  const labelColor = isEmpty ? COLORS.textSecondary : COLORS.foreground;
  return (
    <View style={progressCardStyles.container}>
      <View style={progressCardStyles.headerRow}>
        <Text style={[progressCardStyles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[progressCardStyles.count, { color: labelColor }]}>
          {isEmpty ? '—' : `${current} / ${total}`}
        </Text>
      </View>
      <View style={progressCardStyles.track}>
        <View
          style={[
            progressCardStyles.fill,
            { width: `${pct}%`, backgroundColor: fillColor },
            isEmpty && progressCardStyles.trackEmpty,
          ]}
        />
      </View>
      {isEmpty && (
        <Text style={progressCardStyles.emptyCaption}>{emptyCaption}</Text>
      )}
    </View>
  );
}

const progressCardStyles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  trackEmpty: {
    opacity: 0.6,
  },
  emptyCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default function RutaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { time: formatTime } = useTenantLocale();

  const { data: rutas, isLoading } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;

  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const { data: pedidosCargados } = useOfflineRutaPedidos(route?.id ?? '');
  const { data: cargaProductos } = useOfflineRutaCarga(route?.id ?? '');
  const clienteIds = useMemo(
    () => Array.from(new Set((detalles ?? []).map(s => s.clienteId))),
    [detalles]
  );
  const clientNames = useClientNameMap(clienteIds);
  const { data: allClients } = useOfflineClients();
  const { data: allProducts } = useOfflineProducts();

  // Lookups por id local de WDB (evita hacer N queries por cada item).
  const productNames = useMemo(() => {
    const map = new Map<string, string>();
    (allProducts as Producto[] | undefined)?.forEach((p) => map.set(p.id, p.nombre));
    return map;
  }, [allProducts]);

  // Para los pedidos cargados, mostrar número y total. Hago lookup batch.
  const [pedidosLookup, setPedidosLookup] = useState<Map<string, { numero: string | null; total: number }>>(new Map());
  useFocusEffect(useCallback(() => {
    const ids = (pedidosCargados as RutaPedido[] | undefined)?.map((rp) => rp.pedidoId) ?? [];
    if (ids.length === 0) { setPedidosLookup(new Map()); return; }
    database.get<Pedido>('pedidos')
      .query(Q.where('id', Q.oneOf(ids)))
      .fetch()
      .then((peds) => {
        const map = new Map<string, { numero: string | null; total: number }>();
        for (const p of peds) map.set(p.id, { numero: p.numeroPedido, total: p.total });
        setPedidosLookup(map);
      })
      .catch(() => setPedidosLookup(new Map()));
  }, [pedidosCargados]));

  // Build coordinate lookup from clients and compute polyline coordinates
  const routeCoordinates = useMemo(() => {
    if (!detalles || !allClients) return [];
    const clientMap = new Map<string, { lat: number; lng: number }>();
    (allClients as Cliente[]).forEach((c) => {
      if (c.latitud != null && c.longitud != null) {
        clientMap.set(c.id, { lat: c.latitud, lng: c.longitud });
      }
    });
    return (detalles as RutaDetalle[])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((d) => clientMap.get(d.clienteId))
      .filter((c): c is { lat: number; lng: number } => c != null)
      .map((c) => ({ latitude: c.lat, longitude: c.lng }));
  }, [detalles, allClients]);

  // Direct query for stats on every focus (WDB observable unreliable in Expo Go/LokiJS)
  const [stats, setStats] = useState({ total: 0, atendidas: 0, pendientes: 0, omitidas: 0 });
  useFocusEffect(useCallback(() => {
    if (!route?.id) return;
    database.get<RutaDetalle>('ruta_detalles')
      .query(Q.where('ruta_id', route.id))
      .fetch()
      .then((stops) => {
        const total = stops.length;
        const visitadas = stops.filter((d) => d.displayEstado === 2).length;
        const omitidas = stops.filter((d) => d.displayEstado === 3).length;
        setStats({ total, atendidas: visitadas + omitidas, pendientes: total - visitadas - omitidas, omitidas });
      })
      .catch(() => {});
  }, [route?.id]));

  const progress = stats.total > 0 ? (stats.atendidas / stats.total) * 100 : 0;

  // ── Stats adicionales: pedidos entregados + carga vendida ──
  // Reportado 2026-05-05: ruta solo con productos (sin paradas/pedidos) mostraba
  // 0/0 sin reflejar la actividad real del vendedor. Ahora se muestran 3 barras
  // simétricas (Paradas / Pedidos / Productos); la que no aplique se muestra
  // gris con caption explicativa.
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

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };


  if (isLoading) {
    return <View style={styles.container}><LoadingSpinner message="Cargando ruta..." /></View>;
  }

  if (!route) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ruta del Día</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.button} colors={[COLORS.button]} />}
        >
          <EmptyState icon={<Navigation size={48} color="#cbd5e1" />} title="Sin ruta para hoy" message="No tienes una ruta asignada para el día de hoy" />
        </ScrollView>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Blue Header — back + title + map icon */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ruta del Día</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/mapa?mode=route' as any)}
          style={styles.backBtn}
          accessibilityLabel="Ver mapa de ruta"
          accessibilityRole="button"
        >
          <MapIcon size={22} color={COLORS.headerText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.button} colors={[COLORS.button]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Accept Route Banner — shown when route is Planificada o PendienteAceptar */}
        {(route.estado === 0 || route.estado === 4) && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.acceptBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.acceptTitle}>Nueva ruta asignada</Text>
                <Text style={styles.acceptSub}>Acepta la ruta para comenzar tu jornada</Text>
              </View>
              <TouchableOpacity
                style={styles.acceptBtn}
                disabled={accepting}
                activeOpacity={0.8}
                accessibilityLabel="Aceptar ruta"
                accessibilityRole="button"
                onPress={async () => {
                  setAccepting(true);
                  const serverId = route.serverId;
                  if (!serverId) {
                    // Ruta aún no sincronizó — solo update local, backend sincroniza después
                    try {
                      const freshRoute = await database.get<Ruta>('rutas').find(route.id);
                      await freshRoute.startRoute();
                      Toast.show({ type: 'info', text1: 'Aceptada localmente', text2: 'Sincronizará al recuperar conexión' });
                    } catch (e) {
                      if (__DEV__) console.warn('[Ruta] startRoute local sin serverId failed:', e);
                      Toast.show({ type: 'error', text1: 'No se pudo aceptar', text2: 'Intenta de nuevo' });
                    }
                    setAccepting(false);
                    return;
                  }
                  // Backend: /aceptar (captura timestamp + transiciona 0|4 → 5) — best-effort.
                  let backendOk = false;
                  try {
                    await rutasApi.aceptar(serverId);
                    backendOk = true;
                  } catch (e) {
                    if (__DEV__) console.warn('[Ruta] aceptar backend failed (continuando):', e);
                  }
                  // Local + backend /iniciar (5|0 → 1) — la fuente de verdad de la UI.
                  try {
                    await rutasApi.iniciar(serverId);
                    backendOk = true;
                  } catch (e) {
                    if (__DEV__) console.warn('[Ruta] iniciar backend failed (offline retry vía sync push):', e);
                  }
                  let localOk = false;
                  try {
                    const freshRoute = await database.get<Ruta>('rutas').find(route.id);
                    await freshRoute.startRoute();
                    localOk = true;
                  } catch (e) {
                    if (__DEV__) console.warn('[Ruta] startRoute local failed:', e);
                  }
                  // Toast: si AL MENOS local OK → success. Si todo falla → error explícito.
                  if (localOk) {
                    Toast.show({ type: 'success', text1: 'Ruta aceptada' });
                  } else if (!backendOk) {
                    Toast.show({ type: 'error', text1: 'No se pudo aceptar la ruta', text2: 'Verifica tu conexión' });
                  }
                  setAccepting(false);
                }}
              >
                <CheckCircle size={18} color="#ffffff" />
                <Text style={styles.acceptBtnText}>{accepting ? 'Aceptando...' : 'Aceptar'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Progress Section — white bg */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={styles.progressSection}>
            <Text style={styles.routeName}>{route.nombre}</Text>

            {/* Zonas que cubre la ruta — chips. Multi-zona alineado con SFA/CPG
                industria (Handy.la, SAP, Salesforce). Reportado 2026-04-27. */}
            {route.zonas && route.zonas.length > 0 && (
              <View style={styles.zonasRow}>
                {route.zonas.map((z: { id: number; nombre: string }) => (
                  <View key={z.id} style={styles.zonaChip}>
                    <Text style={styles.zonaChipText}>
                      {z.nombre || `Zona ${z.id}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Horario estimado */}
            {(route.horaInicioEstimada || route.horaFinEstimada) && (
              <View style={styles.horarioRow}>
                <Clock size={13} color="#94a3b8" />
                <Text style={styles.horarioText}>
                  {(route.horaInicioEstimada || '--:--').substring(0, 5)} - {(route.horaFinEstimada || '--:--').substring(0, 5)}
                </Text>
              </View>
            )}

            {/* 3 ProgressCards: Paradas / Pedidos / Productos.
                Si total === 0, render gris + caption (decisión owner 2026-05-05). */}
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

          </View>
        </Animated.View>

        {/* Mini Route Map with Polyline */}
        {MAPS_OK && MapView && routeCoordinates.length > 1 && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <View style={styles.miniMapContainer}>
              <MapView
                style={styles.miniMap}
                initialRegion={{
                  latitude: routeCoordinates[0].latitude,
                  longitude: routeCoordinates[0].longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsUserLocation
                onLayout={() => {
                  // Fit all markers after layout
                }}
              >
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={COLORS.primary}
                  strokeWidth={3}
                />
                {routeCoordinates.map((coord, idx) => (
                  <Marker
                    key={`stop-${idx}`}
                    coordinate={coord}
                    pinColor={idx === 0 ? COLORS.headerBg : '#22c55e'}
                  />
                ))}
              </MapView>
            </View>
          </Animated.View>
        )}

        {/* Pedidos cargados en el camión — solo si admin asignó al menos uno */}
        {(pedidosCargados as RutaPedido[] | undefined)?.length ? (
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <View style={styles.cargaSection}>
              <View style={styles.cargaHeader}>
                <Package size={16} color={COLORS.headerBg} />
                <Text style={styles.cargaTitle}>Pedidos cargados ({(pedidosCargados as RutaPedido[]).length})</Text>
              </View>
              {(pedidosCargados as RutaPedido[]).map((rp) => {
                const info = pedidosLookup.get(rp.pedidoId);
                const label = info?.numero ?? `Pedido #${rp.pedidoServerId}`;
                return (
                  <View key={rp.id} style={styles.cargaItem}>
                    <Text style={styles.cargaItemName}>{label}</Text>
                    {info?.total != null && (
                      <Text style={styles.cargaItemMeta}>${info.total.toFixed(2)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* Productos sueltos para venta directa */}
        {(cargaProductos as RutaCarga[] | undefined)?.length ? (
          <Animated.View entering={FadeInDown.duration(400).delay(275)}>
            <View style={styles.cargaSection}>
              <View style={styles.cargaHeader}>
                <Package size={16} color="#16a34a" />
                <Text style={styles.cargaTitle}>Productos para venta directa ({(cargaProductos as RutaCarga[]).length})</Text>
              </View>
              {(cargaProductos as RutaCarga[]).map((rc) => {
                const nombre = productNames.get(rc.productoId) ?? `Producto #${rc.productoServerId}`;
                return (
                  <View key={rc.id} style={styles.cargaItem}>
                    <Text style={styles.cargaItemName} numberOfLines={1}>{nombre}</Text>
                    <Text style={styles.cargaItemMeta}>{rc.cantidadTotal} u.</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* Stops — simple list with numbered dots */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <View style={styles.stopsSection}>
            {detalles?.map((stop: RutaDetalle) => {
              const eff = stop.displayEstado;
              const dotBg = STOP_DOT_COLORS[eff] ?? '#e2e8f0';
              const dotTextColor = STOP_DOT_TEXT[eff] ?? '#94a3b8';
              const statusColor = STOP_STATUS_TEXT_COLORS[eff] ?? '#94a3b8';
              const statusName = STOP_STATUS_NAMES[eff] ?? 'Pendiente';
              const isPending = eff === 0;
              const isInProgress = eff === 1;

              return (
                <TouchableOpacity
                  key={stop.id}
                  style={styles.stopItem}
                  onPress={() => router.push(`/(tabs)/ruta/parada/${stop.id}` as any)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Parada ${stop.orden}: ${clientNames.get(stop.clienteId) || 'Cliente'}, ${statusName}`}
                  accessibilityRole="button"
                >
                  {/* Numbered dot */}
                  <View style={[
                    styles.stopDot,
                    { backgroundColor: dotBg },
                    isInProgress && styles.stopDotActive,
                  ]}>
                    <Text style={[styles.stopDotText, { color: dotTextColor }]}>{stop.orden}</Text>
                  </View>

                  {/* Name + status */}
                  <View style={styles.stopInfo}>
                    <Text
                      style={[styles.stopName, isPending && { color: COLORS.textSecondary }]}
                      numberOfLines={1}
                    >
                      {clientNames.get(stop.clienteId) || 'Cliente'}
                    </Text>
                    <Text style={[styles.stopStatus, { color: statusColor }]}>
                      {statusName}
                      {stop.horaLlegada ? ` • ${formatTime(stop.horaLlegada)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },

  scrollContent: { paddingBottom: 32 },

  // Accept banner
  acceptBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    padding: 16, borderRadius: 14,
    backgroundColor: COLORS.headerBg,
  },
  acceptTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  acceptSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  // Progress section — white background
  progressSection: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  routeName: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  zonasRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 6 },
  zonaChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  zonaChipText: { fontSize: 11, fontWeight: '600', color: '#1e40af' },
  horarioRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 2 },
  horarioText: { fontSize: 12, color: '#94a3b8' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.headerBg },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 12 },
  pillText: { fontSize: 11, fontWeight: '600' },

  // Mini Map
  miniMapContainer: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  miniMap: { height: 160, borderRadius: 16 },

  // Carga (pedidos asignados + productos sueltos en el camión)
  cargaSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cargaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cargaTitle: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  cargaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cargaItemName: { flex: 1, fontSize: 13, color: COLORS.foreground, marginRight: 8 },
  cargaItemMeta: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Stops
  stopsSection: { paddingHorizontal: 20, paddingTop: 12 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  stopDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotActive: {
    borderWidth: 3,
    borderColor: '#93c5fd',
  },
  stopDotText: { fontSize: 11, fontWeight: '700' },
  stopInfo: { flex: 1, gap: 2 },
  stopName: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  stopStatus: { fontSize: 11 },
});
