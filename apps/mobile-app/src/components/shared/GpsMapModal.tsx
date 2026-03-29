import { useState, useRef, useCallback } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';

interface GpsMapModalProps {
  visible: boolean;
  initialCoord: { latitude: number; longitude: number };
  title?: string;
  clientName?: string;
  onConfirm: (coord: { latitude: number; longitude: number }) => void;
  onCancel: () => void;
}

export function GpsMapModal({ visible, initialCoord, title, clientName, onConfirm, onCancel }: GpsMapModalProps) {
  const insets = useSafeAreaInsets();
  const [coord, setCoord] = useState(initialCoord);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const mapRef = useRef<MapView | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset coord when modal opens with new initialCoord
  const [lastInit, setLastInit] = useState(initialCoord);
  if (visible && (lastInit.latitude !== initialCoord.latitude || lastInit.longitude !== initialCoord.longitude)) {
    setCoord(initialCoord);
    setLastInit(initialCoord);
  }

  const searchPlaces = useCallback((query: string) => {
    setSearch(query);
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        const loc = `${coord.latitude},${coord.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${loc}&radius=5000&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results?.slice(0, 5) ?? []);
      } catch { setResults([]); }
    }, 500);
  }, [coord]);

  const selectPlace = useCallback((place: any) => {
    const loc = place.geometry?.location;
    if (loc) {
      const c = { latitude: loc.lat, longitude: loc.lng };
      setCoord(c);
      mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
    }
    setSearch(place.name);
    setResults([]);
  }, []);

  const handleClose = useCallback(() => {
    setSearch('');
    setResults([]);
    onCancel();
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    setSearch('');
    setResults([]);
    onConfirm(coord);
  }, [coord, onConfirm]);

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{title ?? 'Ubicacion del cliente'}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tienda, direccion..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={searchPlaces}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }} style={{ padding: 4 }}>
              <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
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
          onPress={(e) => { setCoord(e.nativeEvent.coordinate); setResults([]); }}
          onPoiClick={(e) => {
            const { coordinate, name } = e.nativeEvent;
            setCoord(coordinate);
            setSearch(name ?? '');
            setResults([]);
            mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
          }}
          showsUserLocation
          showsPointsOfInterest
          showsBuildings
          showsMyLocationButton
        >
          <Marker coordinate={coord} draggable onDragEnd={(e) => setCoord(e.nativeEvent.coordinate)} title={clientName}>
            <View style={styles.customMarker}>
              <MapPin size={20} color="#ffffff" />
            </View>
          </Marker>
        </MapView>

        {/* Actions */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <MapPin size={18} color="#ffffff" />
            <Text style={styles.confirmText}>Guardar ubicacion</Text>
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
  customMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  actions: { paddingHorizontal: 16, paddingTop: 12, gap: 8, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  confirmBtn: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.button,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
