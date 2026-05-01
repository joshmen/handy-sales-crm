import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import _ClusteredMapView from 'react-native-map-clustering';
import { Marker, Polyline, type Region } from 'react-native-maps';

// react-native-map-clustering exports a class component incompatible with React 19 JSX types
const ClusteredMapView: any = _ClusteredMapView;
import { MapPin, Locate, Route as RouteIcon } from 'lucide-react-native';

import { useMapData, type MapClient } from '@/hooks/useMapData';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useUserLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores';
import { haversineDistance, performCheckIn } from '@/services/geoCheckin';
import { createVisitaOffline } from '@/db/actions';
import { performSync } from '@/sync/syncEngine';
import { getClientMarkerColor, MAP_COLORS, STOP_ESTADO } from '@/utils/mapColors';

import { MapModeToggle, type MapMode } from '@/components/map/MapModeToggle';
import { StopMarker } from '@/components/map/StopMarker';
import { ClusterMarker } from '@/components/map/ClusterMarker';
import { ClientDetailPanel } from '@/components/map/ClientDetailPanel';
import { isGoogleMapsConfigured } from '@/utils/maps';
import { NextStopPanel } from '@/components/map/NextStopPanel';
import { CheckInPanel } from '@/components/map/CheckInPanel';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { COLORS } from '@/theme/colors';

const DEFAULT_REGION: Region = {
  latitude: 19.4326,
  longitude: -99.1332,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function MapaScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const mapRef = useRef<any>(null);
  const user = useAuthStore((s) => s.user);

  // Map mode
  const [mapMode, setMapMode] = useState<MapMode>(
    initialMode === 'route' ? 'route' : 'clients'
  );

  // Selection state
  const [selectedClient, setSelectedClient] = useState<MapClient | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<{
    stopId: string;
    clienteId: string;
    clienteNombre: string;
    clienteServerId: number | null;
    distance: number;
    withinGeofence: boolean;
    lat: number;
    lng: number;
  } | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Data
  const {
    mappableClients,
    route,
    stops,
    routeCoordinates,
    routeStopMap,
    todayVisitSet,
    currentStopIndex,
    nextStop,
    routeProgress,
    isRouteActive,
    isLoading,
  } = useMapData();

  // Location
  const { location, loading: locLoading, error: locError } = useUserLocation();
  const { position: trackingPosition } = useLocationTracking(isRouteActive);

  // Si falla la ubicación inicial, mostrar Alert con shortcut a Settings (en vez de
  // dejar el mapa centrado en CDMX default sin contexto). Solo dispara una vez por mount.
  const [locErrorShown, setLocErrorShown] = useState(false);
  useEffect(() => {
    if (locError && !locLoading && !locErrorShown) {
      setLocErrorShown(true);
      Alert.alert(
        'Ubicación no disponible',
        'No pudimos acceder al GPS. Activa los permisos en Ajustes para ver tu ubicación y registrar visitas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings().catch(() => {}) },
        ]
      );
    }
  }, [locError, locLoading, locErrorShown]);
  const currentPos = trackingPosition || (location ? { latitude: location.latitude, longitude: location.longitude } : null);

  const initialRegion: Region = useMemo(() => {
    if (location) {
      return { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    return DEFAULT_REGION;
  }, [location]);

  // Distance from user to a given coordinate
  const distanceTo = useCallback(
    (lat: number, lng: number) => {
      if (!currentPos) return null;
      return Math.round(haversineDistance(currentPos, { latitude: lat, longitude: lng }));
    },
    [currentPos]
  );

  // --- Handlers ---
  const handleMarkerPress = useCallback((client: MapClient) => {
    setSelectedClient(client);
    setCheckInTarget(null);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: client.latitude, longitude: client.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        300
      );
    }
  }, []);

  const handleCenterOnMe = useCallback(() => {
    if (currentPos && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: currentPos.latitude, longitude: currentPos.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        300
      );
    }
  }, [currentPos]);

  const handleModeChange = useCallback(
    (mode: MapMode) => {
      setMapMode(mode);
      setSelectedClient(null);
      setCheckInTarget(null);
      if (mode === 'route' && routeCoordinates.length > 0 && mapRef.current) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: 120, right: 50, bottom: 200, left: 50 },
            animated: true,
          });
        }, 100);
      }
    },
    [routeCoordinates]
  );

  const handleStopPress = useCallback(
    async (stopIndex: number) => {
      const stopData = stops[stopIndex];
      if (!stopData || !stopData.latitude || !stopData.longitude) return;

      setSelectedClient(null);

      if (stopData.stop.estado === STOP_ESTADO.PENDIENTE) {
        try {
          const result = await performCheckIn({
            latitude: stopData.latitude,
            longitude: stopData.longitude,
          });
          setCheckInTarget({
            stopId: stopData.stop.id,
            clienteId: stopData.stop.clienteId,
            clienteNombre: stopData.clienteNombre,
            clienteServerId: stopData.clienteServerId,
            distance: result.distance,
            withinGeofence: result.withinGeofence,
            lat: result.coords.latitude,
            lng: result.coords.longitude,
          });
        } catch {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo obtener tu ubicación' });
        }
      } else {
        const client = mappableClients.find((c) => c.id === stopData.stop.clienteId);
        if (client) setSelectedClient(client);
      }
    },
    [stops, mappableClients]
  );

  const handleNextStopCheckIn = useCallback(async () => {
    if (!nextStop?.latitude || !nextStop?.longitude) return;

    try {
      const result = await performCheckIn({
        latitude: nextStop.latitude,
        longitude: nextStop.longitude,
      });
      setCheckInTarget({
        stopId: nextStop.stop.id,
        clienteId: nextStop.stop.clienteId,
        clienteNombre: nextStop.clienteNombre,
        clienteServerId: nextStop.clienteServerId,
        distance: result.distance,
        withinGeofence: result.withinGeofence,
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo obtener tu ubicación' });
    }
  }, [nextStop]);

  const handleConfirmCheckIn = useCallback(async () => {
    if (!checkInTarget || !user) return;
    setCheckInLoading(true);

    try {
      await createVisitaOffline(
        checkInTarget.clienteId,
        checkInTarget.clienteServerId,
        Number(user.id),
        checkInTarget.lat,
        checkInTarget.lng,
        checkInTarget.distance,
        route?.id
      );

      const stopData = stops.find((s) => s.stop.id === checkInTarget.stopId);
      if (stopData) {
        await stopData.stop.arrive(checkInTarget.lat, checkInTarget.lng);
      }

      // Tracking GPS: ping de visita (no-op si plan no aplica).
      const { recordPing, TipoPing } = await import('@/services/locationCheckpoint');
      recordPing(TipoPing.Visita).catch(() => {});

      setCheckInTarget(null);
      performSync().catch(() => {});
      router.push('/(tabs)/ruta/visita-activa' as any);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo iniciar la visita' });
    } finally {
      setCheckInLoading(false);
    }
  }, [checkInTarget, user, route, stops, router]);

  const handleMapPress = useCallback(() => {
    setSelectedClient(null);
  }, []);

  // Sin Google Maps API key configurada → MapView crashea al renderizar.
  // Mostramos placeholder con instrucción en vez de cerrar la app.
  if (!isGoogleMapsConfigured()) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <MapPin size={48} color={COLORS.primary} />
          <Text style={[styles.loadingText, { textAlign: 'center', marginTop: 12 }]}>Mapas no disponibles en esta versión</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 }}>El administrador debe configurar la API key de Google Maps en el build.</Text>
        </View>
      </View>
    );
  }

  // --- Loading ---
  if (isLoading || locLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </View>
    );
  }

  const hasRoute = !!route && stops.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mapa</Text>
        <View style={styles.headerTags}>
          {mapMode === 'route' && hasRoute && (
            <View style={styles.progressBadge}>
              <RouteIcon size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.progressText}>
                {routeProgress.completed}/{routeProgress.total}
              </Text>
            </View>
          )}
          <View style={styles.headerBadge}>
            <MapPin size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerBadgeText}>
              {mapMode === 'route' ? `${stops.length} paradas` : `${mappableClients.length} clientes`}
            </Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <ClusteredMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={handleMapPress}
          clusteringEnabled={mapMode === 'clients'}
          clusterColor={MAP_COLORS.CLUSTER}
          radius={50}
          maxZoom={16}
          renderCluster={(cluster: any) => (
            <ClusterMarker
              key={`cluster-${cluster.id}`}
              id={cluster.id}
              geometry={cluster.geometry}
              properties={cluster.properties}
              onPress={cluster.onPress}
            />
          )}
        >
          {/* Client markers (Clientes mode) */}
          {mapMode === 'clients' &&
            mappableClients.map((client) => (
              <Marker
                key={client.id}
                identifier={client.id}
                coordinate={{ latitude: client.latitude, longitude: client.longitude }}
                pinColor={getClientMarkerColor(client.id, routeStopMap, todayVisitSet, client.activo)}
                onPress={() => handleMarkerPress(client)}
                tracksViewChanges={false}
              />
            ))}

          {/* Route polyline */}
          {mapMode === 'route' && routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={MAP_COLORS.CLUSTER}
              strokeWidth={3}
            />
          )}

          {/* Stop markers (Route mode) */}
          {mapMode === 'route' &&
            stops.map((s, i) =>
              s.latitude && s.longitude ? (
                <StopMarker
                  key={s.stop.id}
                  orden={s.stop.orden}
                  estado={s.stop.estado}
                  latitude={s.latitude}
                  longitude={s.longitude}
                  onPress={() => handleStopPress(i)}
                  isActive={i === currentStopIndex}
                />
              ) : null
            )}
        </ClusteredMapView>

        {/* Mode toggle */}
        <MapModeToggle mode={mapMode} onModeChange={handleModeChange} hasRoute={hasRoute} />

        {/* Center on me */}
        {currentPos && (
          <TouchableOpacity
            style={[styles.centerBtn, { top: 12, right: 12 }]}
            onPress={handleCenterOnMe}
            activeOpacity={0.8}
            accessibilityLabel="Centrar en mi ubicación"
            accessibilityRole="button"
          >
            <Locate size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Empty states */}
        {mapMode === 'clients' && mappableClients.length === 0 && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyCard}>
              <MapPin size={24} color="#94a3b8" />
              <Text style={styles.emptyText}>Tus clientes no tienen ubicación registrada</Text>
            </View>
          </View>
        )}
        {mapMode === 'route' && stops.length === 0 && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyCard}>
              <RouteIcon size={24} color="#94a3b8" />
              <Text style={styles.emptyText}>No tienes ruta asignada para hoy</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom panels — priority: check-in > client detail > next stop */}
      {checkInTarget && (
        <CheckInPanel
          clienteNombre={checkInTarget.clienteNombre}
          distance={checkInTarget.distance}
          withinGeofence={checkInTarget.withinGeofence}
          loading={checkInLoading}
          bottomInset={insets.bottom}
          onConfirm={handleConfirmCheckIn}
          onCancel={() => setCheckInTarget(null)}
        />
      )}

      {!checkInTarget && selectedClient && (
        <ClientDetailPanel
          client={selectedClient}
          routeStopMap={routeStopMap}
          todayVisitSet={todayVisitSet}
          distance={distanceTo(selectedClient.latitude, selectedClient.longitude)}
          bottomInset={insets.bottom}
          onClose={() => setSelectedClient(null)}
          onViewDetail={() => router.push(`/(tabs)/clients/${selectedClient.id}` as any)}
          onSell={() => router.push('/(tabs)/vender/crear' as any)}
        />
      )}

      {!checkInTarget && !selectedClient && mapMode === 'route' && nextStop && nextStop.latitude != null && nextStop.longitude != null && (
        <NextStopPanel
          orden={nextStop.stop.orden}
          clienteNombre={nextStop.clienteNombre}
          clienteDireccion={nextStop.clienteDireccion}
          latitude={nextStop.latitude}
          longitude={nextStop.longitude}
          distance={distanceTo(nextStop.latitude, nextStop.longitude)}
          bottomInset={insets.bottom}
          onCheckIn={handleNextStopCheckIn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  headerTags: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.headerText },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  progressText: { fontSize: 12, fontWeight: '700', color: COLORS.headerText },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  centerBtn: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 200 },
});

export default function MapaScreen() {
  return (
    <ErrorBoundary componentName="TabMapa">
      <MapaScreenContent />
    </ErrorBoundary>
  );
}
