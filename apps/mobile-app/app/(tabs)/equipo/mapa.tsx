import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Marker, type Region } from 'react-native-maps';
import _ClusteredMapView from 'react-native-map-clustering';
import { useUbicacionesEquipo } from '@/hooks/useSupervisor';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MapPin, Clock } from 'lucide-react-native';
import { useState } from 'react';
import type { UbicacionVendedor } from '@/api/schemas/supervisor';

const ClusteredMapView = _ClusteredMapView as any;

// Default: Mexico City center
const DEFAULT_REGION: Region = {
  latitude: 20.6597,
  longitude: -103.3496,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function VendedorCallout({ ubicacion }: { ubicacion: UbicacionVendedor }) {
  return (
    <View style={styles.callout}>
      <Text style={styles.calloutName}>{ubicacion.nombre}</Text>
      {ubicacion.clienteNombre && (
        <View style={styles.calloutRow}>
          <MapPin size={12} color="#64748b" />
          <Text style={styles.calloutDetail}>{ubicacion.clienteNombre}</Text>
        </View>
      )}
      <View style={styles.calloutRow}>
        <Clock size={12} color="#64748b" />
        <Text style={styles.calloutDetail}>{formatTimeAgo(ubicacion.fechaUbicacion)}</Text>
      </View>
    </View>
  );
}

function MapaEquipoContent() {
  const router = useRouter();
  const { data: ubicaciones, isLoading } = useUbicacionesEquipo();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
      </View>
    );
  }

  const initialRegion = ubicaciones && ubicaciones.length > 0
    ? {
        latitude: ubicaciones.reduce((sum, u) => sum + u.latitud, 0) / ubicaciones.length,
        longitude: ubicaciones.reduce((sum, u) => sum + u.longitud, 0) / ubicaciones.length,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <ClusteredMapView
        style={styles.map}
        initialRegion={initialRegion}
        clusterColor="#2563eb"
        clusterTextColor="#ffffff"
        clusterFontFamily="System"
        animationEnabled={false}
      >
        {ubicaciones?.map(u => (
          <Marker
            key={u.usuarioId}
            coordinate={{ latitude: u.latitud, longitude: u.longitud }}
            title={u.nombre}
            description={u.clienteNombre ? `En: ${u.clienteNombre} — ${formatTimeAgo(u.fechaUbicacion)}` : formatTimeAgo(u.fechaUbicacion)}
            pinColor="#2563eb"
            onPress={() => setSelectedId(u.usuarioId)}
          />
        ))}
      </ClusteredMapView>

      {/* Bottom card for selected vendedor */}
      {selectedId && ubicaciones && (
        <View style={styles.bottomCard}>
          {(() => {
            const u = ubicaciones.find(v => v.usuarioId === selectedId);
            if (!u) return null;
            return (
              <Pressable
                style={styles.bottomCardContent}
                onPress={() => router.push(`/(tabs)/equipo/vendedor/${u.usuarioId}` as any)}
              >
                <View style={styles.bottomAvatar}>
                  <Text style={styles.bottomAvatarText}>
                    {u.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.bottomInfo}>
                  <Text style={styles.bottomName}>{u.nombre}</Text>
                  <Text style={styles.bottomSub}>
                    {u.clienteNombre ? `En: ${u.clienteNombre}` : 'Sin visita reciente'}
                    {' · '}{formatTimeAgo(u.fechaUbicacion)}
                  </Text>
                </View>
                <Text style={styles.bottomArrow}>→</Text>
              </Pressable>
            );
          })()}
        </View>
      )}

      {(!ubicaciones || ubicaciones.length === 0) && (
        <View style={styles.emptyOverlay}>
          <View style={styles.emptyCard}>
            <MapPin size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>Sin ubicaciones</Text>
            <Text style={styles.emptySubtext}>Los vendedores aparecerán aquí cuando registren visitas con GPS</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  map: { flex: 1 },
  callout: { padding: 8, minWidth: 140 },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  calloutRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  calloutDetail: { fontSize: 12, color: '#64748b' },
  bottomCard: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#ffffff', borderRadius: 16, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  bottomCardContent: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
  },
  bottomAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
  },
  bottomAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  bottomInfo: { flex: 1 },
  bottomName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  bottomSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  bottomArrow: { fontSize: 20, color: '#2563eb', fontWeight: '700' },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 240 },
});

export default function MapaEquipoScreen() {
  return (
    <ErrorBoundary componentName="MapaEquipo">
      <MapaEquipoContent />
    </ErrorBoundary>
  );
}
