import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineRutaHoy, useOfflineRutaDetalles, useClientNameMap, useOfflineClients } from '@/hooks';
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
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps.MapView;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
} catch { /* maps not available */ }
import RutaDetalle from '@/db/models/RutaDetalle';
import Cliente from '@/db/models/Cliente';

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

export default function RutaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { time: formatTime } = useTenantLocale();

  const { data: rutas, isLoading } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;

  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const clienteIds = useMemo(
    () => Array.from(new Set((detalles ?? []).map(s => s.clienteId))),
    [detalles]
  );
  const clientNames = useClientNameMap(clienteIds);
  const { data: allClients } = useOfflineClients();

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

            {/* Horario estimado */}
            {(route.horaInicioEstimada || route.horaFinEstimada) && (
              <View style={styles.horarioRow}>
                <Clock size={13} color="#94a3b8" />
                <Text style={styles.horarioText}>
                  {(route.horaInicioEstimada || '--:--').substring(0, 5)} - {(route.horaFinEstimada || '--:--').substring(0, 5)}
                </Text>
              </View>
            )}

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {stats.atendidas} de {stats.total} atendidas • {Math.round(progress)}%
            </Text>

            {/* Stat pills */}
            <View style={styles.pillsRow}>
              <View style={[styles.pill, { backgroundColor: STATUS_PALETTES.delivered.bg }]}>
                <Text style={[styles.pillText, { color: COLORS.success }]}>{stats.atendidas} Atendidas</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: STATUS_PALETTES.pending.bg }]}>
                <Text style={[styles.pillText, { color: COLORS.warning }]}>{stats.pendientes} Pendientes</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.pillText, { color: COLORS.headerBg }]}>{stats.total} Total</Text>
              </View>
            </View>

          </View>
        </Animated.View>

        {/* Mini Route Map with Polyline */}
        {MapView && routeCoordinates.length > 1 && (
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
