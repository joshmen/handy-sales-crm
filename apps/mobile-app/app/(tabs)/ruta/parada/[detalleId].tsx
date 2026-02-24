import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Linking, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Circle } from 'react-native-maps';
import {
  useOfflineRutaHoy,
  useOfflineRutaDetalles,
  useOfflineClientById,
} from '@/hooks';
import { useUserLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores';
import { performCheckIn, formatDistance } from '@/services/geoCheckin';
import { createVisitaOffline } from '@/db/actions';
import { performSync } from '@/sync/syncEngine';
import { getGeofenceColor } from '@/utils/mapColors';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { Badge } from '@/components/ui';
import { formatTime } from '@/utils/format';
import {
  MapPin,
  Clock,
  Navigation,
  Play,
  ShoppingBag,
  Wallet,
} from 'lucide-react-native';

const STOP_STATUS_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#f59e0b', 2: '#22c55e', 3: '#ef4444',
};
const STOP_STATUS_NAMES: Record<number, string> = {
  0: 'Pendiente', 1: 'En Progreso', 2: 'Completada', 3: 'Omitida',
};

export default function ParadaDetailScreen() {
  const { detalleId } = useLocalSearchParams<{ detalleId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { location } = useUserLocation();

  const [checkingIn, setCheckingIn] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  // Get route + stop from WDB
  const { data: rutas, isLoading: rutaLoading } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;
  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const stop = detalles?.find((d) => d.id === detalleId) ?? null;

  // Get client from WDB
  const { data: client } = useOfflineClientById(stop?.clienteId ?? '');

  const clientLat = client?.latitud ?? null;
  const clientLng = client?.longitud ?? null;

  // Compute distance when location and client coords available
  const userDistance = (() => {
    if (distance != null) return distance;
    if (!location || !clientLat || !clientLng) return null;
    const { haversineDistance } = require('@/services/geoCheckin');
    return Math.round(haversineDistance(location, { latitude: clientLat, longitude: clientLng }));
  })();
  const distanceColor = userDistance != null ? getGeofenceColor(userDistance) : '#94a3b8';

  const handleNavegar = useCallback(() => {
    if (clientLat && clientLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${clientLat},${clientLng}`;
      Linking.openURL(url);
    }
  }, [clientLat, clientLng]);

  const handleLlegar = useCallback(() => {
    if (!stop || !client) return;
    Alert.alert('Iniciar Visita', `¿Llegaste a ${client.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, llegué',
        onPress: async () => {
          setCheckingIn(true);
          try {
            if (!clientLat || !clientLng) {
              Alert.alert('Error', 'El cliente no tiene ubicación registrada');
              return;
            }

            const result = await performCheckIn({ latitude: clientLat, longitude: clientLng });
            setDistance(result.distance);

            await createVisitaOffline(
              stop.clienteId,
              client.serverId,
              Number(user?.id ?? 0),
              result.coords.latitude,
              result.coords.longitude,
              result.distance,
              route?.id
            );

            await stop.arrive(result.coords.latitude, result.coords.longitude);
            performSync().catch(() => {});
            router.push('/(tabs)/ruta/visita-activa' as any);
          } catch {
            Alert.alert('Error', 'No se pudo iniciar la visita');
          } finally {
            setCheckingIn(false);
          }
        },
      },
    ]);
  }, [stop, client, clientLat, clientLng, user, route, router]);

  if (rutaLoading || !route) {
    return <View style={styles.container}><LoadingSpinner message="Cargando..." /></View>;
  }

  if (!stop) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Parada no encontrada</Text>
        </View>
      </View>
    );
  }

  const isPendiente = stop.estado === 0;
  const isEnProgreso = stop.estado === 1;
  const statusColor = STOP_STATUS_COLORS[stop.estado] || '#6b7280';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Mini Map */}
      {clientLat && clientLng && (
        <View style={styles.miniMapContainer}>
          <MapView
            style={styles.miniMap}
            initialRegion={{
              latitude: clientLat,
              longitude: clientLng,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation
          >
            <Marker coordinate={{ latitude: clientLat, longitude: clientLng }} pinColor="#2563eb" />
            <Circle
              center={{ latitude: clientLat, longitude: clientLng }}
              radius={200}
              fillColor="rgba(37,99,235,0.08)"
              strokeColor="rgba(37,99,235,0.25)"
              strokeWidth={1}
            />
          </MapView>
          {userDistance != null && (
            <View style={[styles.distanceBadge, { backgroundColor: distanceColor + '15', borderColor: distanceColor + '40' }]}>
              <MapPin size={12} color={distanceColor} />
              <Text style={[styles.distanceText, { color: distanceColor }]}>
                A {formatDistance(userDistance)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
        <Badge
          label={STOP_STATUS_NAMES[stop.estado] || 'Desconocido'}
          color={statusColor}
          bgColor={`${statusColor}25`}
          size="md"
        />
        <Text style={[styles.statusOrder, { color: statusColor }]}>
          Parada #{stop.orden}
        </Text>
      </View>

      {/* Client Info */}
      <Card className="mx-4 mb-3">
        <Text style={styles.cardLabel}>Cliente</Text>
        <Text style={styles.clientName}>{client?.nombre ?? 'Cargando...'}</Text>

        {client?.direccion && (
          <View style={styles.infoRow}>
            <MapPin size={14} color="#94a3b8" />
            <Text style={styles.infoText}>{client.direccion}</Text>
          </View>
        )}

        {stop.horaLlegada && (
          <View style={styles.infoRow}>
            <Clock size={14} color="#94a3b8" />
            <Text style={styles.infoText}>Llegada: {formatTime(stop.horaLlegada)}</Text>
          </View>
        )}
      </Card>

      {/* Navigation */}
      {clientLat && clientLng && (
        <Card className="mx-4 mb-3">
          <Button
            title="Navegar con Google Maps"
            onPress={handleNavegar}
            variant="secondary"
            fullWidth
            icon={<Navigation size={18} color="#2563eb" />}
          />
        </Card>
      )}

      {/* Quick Actions */}
      {(isPendiente || isEnProgreso) && (
        <View style={styles.quickActions}>
          <Button
            title="Nuevo Pedido"
            onPress={() => router.push('/(tabs)/vender/crear' as any)}
            variant="secondary"
            fullWidth
            icon={<ShoppingBag size={18} color="#2563eb" />}
          />
          <Button
            title="Registrar Cobro"
            onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${stop.clienteId}&clienteNombre=${encodeURIComponent(client?.nombre ?? '')}&saldo=0` as any)}
            variant="secondary"
            fullWidth
            icon={<Wallet size={18} color="#2563eb" />}
          />
        </View>
      )}

      {/* Check-in Button */}
      {isPendiente && (
        <View style={styles.mainActions}>
          <Button
            title="Llegué — Iniciar Visita"
            onPress={handleLlegar}
            loading={checkingIn}
            fullWidth
            icon={<Play size={18} color="#ffffff" />}
          />
        </View>
      )}

      {stop.notas && (
        <Card className="mx-4 mb-3">
          <Text style={styles.cardLabel}>Notas</Text>
          <Text style={styles.notesText}>{stop.notas}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  miniMapContainer: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  miniMap: { height: 160, borderRadius: 16 },
  distanceBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  distanceText: { fontSize: 12, fontWeight: '700' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusOrder: { fontSize: 14, fontWeight: '700' },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  infoText: { fontSize: 13, color: '#64748b', flex: 1 },
  quickActions: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  mainActions: { paddingHorizontal: 16, marginBottom: 12 },
  notesText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
});
