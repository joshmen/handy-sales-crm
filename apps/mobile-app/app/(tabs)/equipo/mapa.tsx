import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useUbicacionesEquipo } from '@/hooks/useSupervisor';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MapPin, Clock, ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { COLORS } from '@/theme/colors';
import type { UbicacionVendedor } from '@/api/schemas/supervisor';

// Using standard MapView instead of MapView for Expo Go compatibility

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

function MapaEquipoContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: ubicaciones, isLoading } = useUbicacionesEquipo();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>Mapa del Equipo</Text>
        <View style={{ width: 32 }} />
      </View>

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsPointsOfInterest
      >
        {/* showsUserLocation removido: el supervisor ve el mapa de su equipo, NO
            necesita su propio dot. Mantenerlo disparaba un permission prompt
            inesperado (Android) en una pantalla que no requiere GPS local. */}
        {ubicaciones?.map(u => (
          <Marker
            key={u.usuarioId}
            coordinate={{ latitude: u.latitud, longitude: u.longitud }}
            title={u.nombre}
            description={u.clienteNombre ? `En: ${u.clienteNombre} — ${formatTimeAgo(u.fechaUbicacion)}` : formatTimeAgo(u.fechaUbicacion)}
            pinColor={COLORS.headerBg}
            onPress={() => setSelectedId(u.usuarioId)}
          />
        ))}
      </MapView>

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
                accessibilityLabel={`Ver detalle de ${u.nombre}`}
                accessibilityRole="button"
              >
                <View style={styles.bottomAvatar}>
                  <Text style={styles.bottomAvatarText}>
                    {u.nombre.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
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
            <MapPin size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Sin ubicaciones</Text>
            <Text style={styles.emptySubtext}>Los vendedores apareceran aqui cuando registren visitas con GPS</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingBottom: 14 },
  blueHeaderTitle: { fontSize: 17, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const, flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  map: { flex: 1 },
  bottomCard: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  bottomCardContent: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
  },
  bottomAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomAvatarText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  bottomInfo: { flex: 1 },
  bottomName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  bottomSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  bottomArrow: { fontSize: 20, color: COLORS.primary, fontWeight: '700' },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtext: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', maxWidth: 240 },
});

export default function MapaEquipoScreen() {
  return (
    <ErrorBoundary componentName="MapaEquipo">
      <MapaEquipoContent />
    </ErrorBoundary>
  );
}
