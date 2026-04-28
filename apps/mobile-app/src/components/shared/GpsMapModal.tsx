import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { MapPin, Phone, Globe, Clock, X, Navigation } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import { api } from '@/api/client';

interface PlaceDetails {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  openNow?: boolean;
  placeId?: string;
}

interface GpsMapModalProps {
  visible: boolean;
  initialCoord: { latitude: number; longitude: number };
  title?: string;
  clientName?: string;
  onConfirm: (coord: { latitude: number; longitude: number }, placeInfo?: { address?: string; name?: string; phone?: string }) => void;
  onCancel: () => void;
}

// All Google Maps calls routed through backend proxy (API key never exposed to client)

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  try {
    const fields = 'name,formatted_address,formatted_phone_number,website,opening_hours';
    const res = await api.get<{ result?: { name?: string; formatted_address?: string; formatted_phone_number?: string; website?: string; opening_hours?: { open_now?: boolean } } }>('/api/geo/places/details', { params: { placeId, fields } });
    const r = res.data.result;
    if (!r) return {};
    return {
      name: r.name,
      address: r.formatted_address,
      phone: r.formatted_phone_number,
      website: r.website,
      openNow: r.opening_hours?.open_now,
      placeId,
    };
  } catch { return {}; }
}

async function reverseGeocode(lat: number, lng: number): Promise<PlaceDetails> {
  try {
    const res = await api.get<{ results?: Array<{ formatted_address?: string }> }>('/api/geo/geocode/reverse', { params: { latlng: `${lat},${lng}` } });
    const result = res.data.results?.[0];
    if (!result) return {};
    return { address: result.formatted_address };
  } catch { return {}; }
}

export function GpsMapModal({ visible, initialCoord, title, clientName, onConfirm, onCancel }: GpsMapModalProps) {
  const insets = useSafeAreaInsets();
  const [coord, setCoord] = useState(initialCoord);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [preview, setPreview] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup pending debounce timer on unmount — sin esto, si el usuario cierra
  // el modal mientras hay un setTimeout pendiente, el callback dispara setState
  // sobre componente unmounted (warning + posible memory leak con búsquedas rápidas).
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  // Reset when modal opens with new initialCoord
  const [lastInit, setLastInit] = useState(initialCoord);
  if (visible && (lastInit.latitude !== initialCoord.latitude || lastInit.longitude !== initialCoord.longitude)) {
    setCoord(initialCoord);
    setLastInit(initialCoord);
    setPreview(null);
  }

  // Request GPS permission and auto-center when modal opens
  const [gpsGranted, setGpsGranted] = useState(false);
  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const Location = require('expo-location') as typeof import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setGpsGranted(false); return; }
        setGpsGranted(true);
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const userCoord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        // Auto-center if using fallback coords (no real saved location)
        if (initialCoord.latitude === 25.79 || initialCoord.latitude === 0) {
          setCoord(userCoord);
          mapRef.current?.animateToRegion({ ...userCoord, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
        }
      } catch { setGpsGranted(false); }
    })();
  }, [visible]);

  const searchPlaces = useCallback((query: string) => {
    setSearch(query);
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const loc = `${coord.latitude},${coord.longitude}`;
        const res = await api.get<{ results?: Array<Record<string, unknown>> }>('/api/geo/places/autocomplete', {
          params: { query, location: loc, radius: 5000 },
        });
        setResults(res.data.results?.slice(0, 5) ?? []);
      } catch { setResults([]); }
    }, 500);
  }, [coord]);

  const selectPlace = useCallback(async (place: any) => {
    const loc = place.geometry?.location;
    if (loc) {
      const c = { latitude: loc.lat, longitude: loc.lng };
      setCoord(c);
      mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
    }
    setSearch(place.name);
    setResults([]);
    // Fetch full details
    if (place.place_id) {
      setLoadingDetails(true);
      const details = await fetchPlaceDetails(place.place_id);
      setPreview(details);
      setLoadingDetails(false);
    }
  }, []);

  // Handle POI click on map (tap on business icon)
  const handlePoiClick = useCallback(async (e: any) => {
    const { coordinate, name, placeId } = e.nativeEvent;
    setCoord(coordinate);
    setSearch(name ?? '');
    setResults([]);
    mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
    if (placeId) {
      setLoadingDetails(true);
      const details = await fetchPlaceDetails(placeId);
      setPreview(details);
      setLoadingDetails(false);
    } else {
      setPreview({ name: name ?? undefined });
    }
  }, []);

  // Handle map tap (empty area)
  const handleMapPress = useCallback(async (e: any) => {
    const c = e.nativeEvent.coordinate;
    setCoord(c);
    setResults([]);
    setLoadingDetails(true);
    const details = await reverseGeocode(c.latitude, c.longitude);
    setPreview(details.address ? details : null);
    setLoadingDetails(false);
  }, []);

  const handleClose = useCallback(() => {
    setSearch('');
    setResults([]);
    setPreview(null);
    onCancel();
  }, [onCancel]);

  const handleConfirm = useCallback(async () => {
    const p = preview;
    setSearch('');
    setResults([]);
    setPreview(null);

    const phone = p?.phone?.replace(/\D/g, '').slice(-10);
    onConfirm(coord, p ? { address: p.address, name: p.name, phone } : undefined);
  }, [coord, preview, onConfirm]);

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{title ?? 'Ubicación del cliente'}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tienda, dirección..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={searchPlaces}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }} style={{ padding: 4 }}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {results.length > 0 && (
          <View style={styles.resultsList}>
            {results.map((place: any) => (
              <TouchableOpacity key={place.place_id} style={styles.resultItem} onPress={() => selectPlace(place)}>
                <MapPin size={14} color="#64748b" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>{place.name}</Text>
                  <Text style={styles.resultAddr} numberOfLines={1}>{place.formatted_address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Map */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{ ...initialCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
          onPress={handleMapPress}
          onPoiClick={handlePoiClick}
          showsUserLocation
          showsPointsOfInterest
          showsBuildings
          showsMyLocationButton
        >
          <Marker coordinate={coord} draggable onDragEnd={handleMapPress} title={clientName}>
            <View style={styles.customMarker}>
              <MapPin size={20} color="#ffffff" />
            </View>
          </Marker>
        </MapView>

        {/* GPS permission warning */}
        {!gpsGranted && (
          <View style={styles.gpsBanner}>
            <Navigation size={14} color="#ea580c" />
            <Text style={styles.gpsBannerText}>Activa la ubicación en ajustes para ver tu posición en el mapa</Text>
          </View>
        )}

        {/* Place Preview Card — shows details of selected place */}
        {(preview || loadingDetails) && (
          <View style={styles.previewCard}>
            {loadingDetails ? (
              <View style={styles.previewLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.previewLoadingText}>Obteniendo información...</Text>
              </View>
            ) : preview && (
              <>
                {preview.name && (
                  <Text style={styles.previewName}>{preview.name}</Text>
                )}
                {preview.address && (
                  <Text style={styles.previewAddress} numberOfLines={2}>{preview.address}</Text>
                )}
                <View style={styles.previewDetails}>
                  {preview.phone && (
                    <View style={styles.previewRow}>
                      <Phone size={13} color="#16a34a" />
                      <Text style={styles.previewText}>{preview.phone}</Text>
                    </View>
                  )}
                  {preview.website && (
                    <View style={styles.previewRow}>
                      <Globe size={13} color="#2563eb" />
                      <Text style={[styles.previewText, { color: '#2563eb' }]} numberOfLines={1}>
                        {preview.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
                      </Text>
                    </View>
                  )}
                  {preview.openNow !== undefined && (
                    <View style={styles.previewRow}>
                      <Clock size={13} color={preview.openNow ? '#16a34a' : '#ef4444'} />
                      <Text style={[styles.previewText, { color: preview.openNow ? '#16a34a' : '#ef4444' }]}>
                        {preview.openNow ? 'Abierto ahora' : 'Cerrado'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <MapPin size={18} color="#ffffff" />
            <Text style={styles.confirmText}>Guardar ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    backgroundColor: COLORS.headerBg, paddingHorizontal: 16, paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 12, height: 44, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  resultsList: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  resultName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  resultAddr: { fontSize: 12, color: '#64748b' },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: -4,
    borderRadius: 8,
  },
  gpsBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '500',
  },
  customMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },

  // Preview card
  previewCard: {
    position: 'absolute', bottom: 140, left: 16, right: 16,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  previewLoading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4,
  },
  previewLoadingText: { fontSize: 13, color: '#94a3b8' },
  previewName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  previewAddress: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 6 },
  previewDetails: { gap: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewText: { fontSize: 13, color: '#475569' },

  // Actions
  actions: { paddingHorizontal: 16, paddingTop: 12, gap: 8, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  confirmBtn: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.button,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
