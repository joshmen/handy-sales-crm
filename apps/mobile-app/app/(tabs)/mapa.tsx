import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useClientsList } from '@/hooks';
import { useUserLocation } from '@/hooks/useLocation';
import { MapPin, Navigation, Phone, ShoppingBag, X, Locate } from 'lucide-react-native';
import type { MobileCliente } from '@/types';

// Default: Mexico City
const DEFAULT_REGION: Region = {
  latitude: 19.4326,
  longitude: -99.1332,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function getMarkerColor(cliente: MobileCliente): string {
  if (!cliente.activo) return '#94a3b8'; // gray - inactive
  return '#2563eb'; // blue - active
}

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { location, loading: locLoading } = useUserLocation();
  const [selectedClient, setSelectedClient] = useState<MobileCliente | null>(null);

  // Load ALL clients (high page size to get all for map)
  const { data, isLoading } = useClientsList({ porPagina: 200 });
  const clients = data?.pages.flatMap((p) => p.data) ?? [];

  // Clients that have lat/lng
  const mappableClients = clients.filter((c) => c.latitud && c.longitud);

  const initialRegion: Region = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION;

  const handleMarkerPress = useCallback((client: MobileCliente) => {
    setSelectedClient(client);
    if (mapRef.current && client.latitud && client.longitud) {
      mapRef.current.animateToRegion({
        latitude: client.latitud,
        longitude: client.longitud,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 300);
    }
  }, []);

  const handleNavigate = useCallback(() => {
    if (!selectedClient?.latitud || !selectedClient?.longitud) return;
    const lat = selectedClient.latitud;
    const lng = selectedClient.longitud;
    const label = encodeURIComponent(selectedClient.nombre);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  }, [selectedClient]);

  const handleCall = useCallback(() => {
    if (!selectedClient?.telefono) return;
    Linking.openURL(`tel:${selectedClient.telefono}`);
  }, [selectedClient]);

  const handleCenterOnMe = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 300);
    }
  }, [location]);

  if (isLoading || locLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mapa</Text>
        <View style={styles.headerBadge}>
          <MapPin size={14} color="#2563eb" />
          <Text style={styles.headerBadgeText}>{mappableClients.length} clientes</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={() => setSelectedClient(null)}
        >
          {mappableClients.map((client) => (
            <Marker
              key={client.id}
              coordinate={{ latitude: client.latitud!, longitude: client.longitud! }}
              pinColor={getMarkerColor(client)}
              title={client.nombre}
              onPress={() => handleMarkerPress(client)}
            />
          ))}
        </MapView>

        {/* Center on me button */}
        {location && (
          <TouchableOpacity
            style={[styles.centerBtn, { top: 12, right: 12 }]}
            onPress={handleCenterOnMe}
            activeOpacity={0.8}
          >
            <Locate size={20} color="#2563eb" />
          </TouchableOpacity>
        )}

        {/* No clients with location */}
        {mappableClients.length === 0 && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyCard}>
              <MapPin size={24} color="#94a3b8" />
              <Text style={styles.emptyText}>
                Tus clientes no tienen ubicación registrada
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Selected Client Bottom Card */}
      {selectedClient && (
        <View style={[styles.clientCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.clientCardHeader}>
            <View style={styles.clientCardInfo}>
              <Text style={styles.clientName}>{selectedClient.nombre}</Text>
              {selectedClient.direccion ? (
                <Text style={styles.clientAddress} numberOfLines={1}>{selectedClient.direccion}</Text>
              ) : null}
              {selectedClient.zonaNombre && (
                <View style={styles.zoneBadge}>
                  <Text style={styles.zoneBadgeText}>{selectedClient.zonaNombre}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedClient(null)} style={styles.closeBtn}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.clientActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => router.push(`/(tabs)/clients/${selectedClient.id}` as any)}
              activeOpacity={0.85}
            >
              <MapPin size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Ver detalle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
              onPress={handleNavigate}
              activeOpacity={0.85}
            >
              <Navigation size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Navegar</Text>
            </TouchableOpacity>

            {selectedClient.telefono ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
                onPress={handleCall}
                activeOpacity={0.85}
              >
                <Phone size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Llamar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#d97706' }]}
                onPress={() => router.push('/(tabs)/vender/crear' as any)}
                activeOpacity={0.85}
              >
                <ShoppingBag size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Vender</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748b' },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
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
  clientCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  clientCardHeader: { flexDirection: 'row', marginBottom: 14 },
  clientCardInfo: { flex: 1 },
  clientName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  clientAddress: { fontSize: 13, color: '#64748b', marginTop: 2 },
  zoneBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  zoneBadgeText: { fontSize: 11, fontWeight: '600', color: '#7c3aed' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
