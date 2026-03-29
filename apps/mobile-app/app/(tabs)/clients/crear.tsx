import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { clientesApi } from '@/api';
import { useZonas, useCategoriasCliente } from '@/hooks';
import { Save, ChevronLeft, MapPin } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import type { ClienteCreateRequest } from '@/types/client';

export default function CrearClienteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const zonas = useZonas();
  const categorias = useCategoriasCliente();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [rfc, setRfc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);

  // GPS auto-capture
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'denied' | 'error'>('loading');
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCoord, setMapCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const placeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = (query: string) => {
    setPlaceSearch(query);
    if (placeTimer.current) clearTimeout(placeTimer.current);
    if (query.length < 3) { setPlaceResults([]); return; }
    placeTimer.current = setTimeout(async () => {
      try {
        const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        const loc = mapCoord ? `${mapCoord.latitude},${mapCoord.longitude}` : '';
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${loc}&radius=5000&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        setPlaceResults(data.results?.slice(0, 5) ?? []);
      } catch { setPlaceResults([]); }
    }, 500);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationStatus('success');
      } catch {
        setLocationStatus('error');
      }
    })();
  }, []);

  const crearMutation = useMutation({
    mutationFn: (data: ClienteCreateRequest) => clientesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      Alert.alert('Cliente Creado', 'El cliente se registró exitosamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo crear el cliente');
    },
  });

  const isValid = nombre.trim().length >= 2;

  const handleGuardar = () => {
    if (!isValid) return;
    crearMutation.mutate({
      nombre: nombre.trim(),
      telefono: telefono || undefined,
      correo: correo || undefined,
      rfc: rfc || undefined,
      direccion: direccion || undefined,
      idZona: zonaId,
      categoriaClienteId: categoriaId,
      latitud: location?.lat,
      longitud: location?.lng,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <ChevronLeft size={24} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Cliente</Text>
        <View style={styles.headerBack} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section: Información General */}
        <Text style={styles.sectionLabel}>INFORMACIÓN GENERAL</Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del cliente"
            placeholderTextColor={COLORS.textTertiary}
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="10 dígitos"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
          />
        </View>

        {/* RFC */}
        <View style={styles.field}>
          <Text style={styles.label}>RFC (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="RFC del cliente"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="characters"
            value={rfc}
            onChangeText={setRfc}
          />
        </View>

        {/* Zone Picker */}
        {zonas.data && zonas.data.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Zona</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {zonas.data.map((zona) => (
                <TouchableOpacity
                  key={zona.id}
                  style={[styles.chip, zonaId === zona.id && styles.chipActive]}
                  onPress={() => setZonaId(zona.id === zonaId ? undefined : zona.id)}
                >
                  <Text style={[styles.chipText, zonaId === zona.id && styles.chipTextActive]}>
                    {zona.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category Picker */}
        {categorias.data && categorias.data.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {categorias.data.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, categoriaId === cat.id && styles.chipActive]}
                  onPress={() => setCategoriaId(cat.id === categoriaId ? undefined : cat.id)}
                >
                  <Text style={[styles.chipText, categoriaId === cat.id && styles.chipTextActive]}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section: Dirección */}
        <Text style={styles.sectionLabel}>DIRECCIÓN</Text>

        {/* Address */}
        <View style={styles.field}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Calle, número, colonia, ciudad"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={2}
            value={direccion}
            onChangeText={setDireccion}
            textAlignVertical="top"
          />
        </View>

        {/* GPS Location Button */}
        <TouchableOpacity
          style={[styles.gpsButton, location && styles.gpsButtonSuccess]}
          onPress={() => {
            const coord = location
              ? { latitude: location.lat, longitude: location.lng }
              : { latitude: 25.79, longitude: -108.99 }; // Default Los Mochis
            setMapCoord(coord);
            setShowMapModal(true);
          }}
          activeOpacity={0.7}
        >
          <MapPin size={16} color={location ? '#16a34a' : '#64748b'} />
          {locationStatus === 'loading' ? (
            <>
              <ActivityIndicator size="small" color={COLORS.textTertiary} style={{ marginRight: 4 }} />
              <Text style={styles.gpsButtonText}>Obteniendo ubicacion...</Text>
            </>
          ) : location ? (
            <Text style={[styles.gpsButtonText, { color: '#16a34a' }]}>Ubicacion capturada — toca para ajustar</Text>
          ) : (
            <Text style={styles.gpsButtonText}>Agregar ubicacion en mapa</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleGuardar}
          disabled={!isValid || crearMutation.isPending}
          activeOpacity={0.8}
        >
          <Save size={18} color={COLORS.headerText} />
          <Text style={styles.submitButtonText}>
            {crearMutation.isPending ? 'Guardando...' : 'Guardar Cliente'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => { setShowMapModal(false); setPlaceSearch(''); setPlaceResults([]); }}
      >
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerBack} />
            <Text style={styles.headerTitle}>Ubicacion del cliente</Text>
            <View style={styles.headerBack} />
          </View>

          {/* Search */}
          <View style={styles.mapSearchBar}>
            <TextInput
              style={styles.mapSearchInput}
              placeholder="Buscar tienda, direccion..."
              placeholderTextColor="#94a3b8"
              value={placeSearch}
              onChangeText={searchPlaces}
              returnKeyType="search"
            />
            {placeSearch.length > 0 && (
              <TouchableOpacity onPress={() => { setPlaceSearch(''); setPlaceResults([]); }} style={{ padding: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search results */}
          {placeResults.length > 0 && (
            <View style={styles.mapResultsList}>
              {placeResults.map((place: any) => (
                <TouchableOpacity
                  key={place.place_id}
                  style={styles.mapResultItem}
                  onPress={() => {
                    const loc = place.geometry?.location;
                    if (loc) {
                      const coord = { latitude: loc.lat, longitude: loc.lng };
                      setMapCoord(coord);
                      mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
                    }
                    setPlaceSearch(place.name);
                    setPlaceResults([]);
                  }}
                >
                  <MapPin size={14} color="#64748b" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapResultName} numberOfLines={1}>{place.name}</Text>
                    <Text style={styles.mapResultAddr} numberOfLines={1}>{place.formatted_address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Map */}
          {mapCoord && (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{ ...mapCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
              onPress={(e) => { setMapCoord(e.nativeEvent.coordinate); setPlaceResults([]); }}
              onPoiClick={(e) => {
                const { coordinate, name } = e.nativeEvent;
                setMapCoord(coordinate);
                setPlaceSearch(name ?? '');
                setPlaceResults([]);
                mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
              }}
              showsUserLocation
              showsPointsOfInterest
              showsBuildings
              showsMyLocationButton
            >
              <Marker coordinate={mapCoord} draggable onDragEnd={(e) => setMapCoord(e.nativeEvent.coordinate)}>
                <View style={styles.mapCustomMarker}>
                  <MapPin size={20} color="#ffffff" />
                </View>
              </Marker>
            </MapView>
          )}

          {/* Actions */}
          <View style={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => {
                if (mapCoord) {
                  setLocation({ lat: mapCoord.latitude, lng: mapCoord.longitude });
                  setLocationStatus('success');
                }
                setShowMapModal(false);
                setPlaceSearch(''); setPlaceResults([]);
              }}
              activeOpacity={0.8}
            >
              <MapPin size={18} color={COLORS.headerText} />
              <Text style={styles.submitButtonText}>Guardar ubicacion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { setShowMapModal(false); setPlaceSearch(''); setPlaceResults([]); }}
            >
              <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* Header */
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBack: { width: 32, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.headerText,
    textAlign: 'center',
    flex: 1,
  },

  /* Content */
  content: { padding: 16, paddingBottom: 100 },

  /* Section labels */
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },

  /* Fields */
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  textArea: { minHeight: 60, height: undefined, paddingVertical: 12 },

  /* Chips */
  chipScroll: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.headerText },

  /* GPS button */
  gpsButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderRadius: 12, marginBottom: 16,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  gpsButtonSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  gpsButtonText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  /* Map modal */
  mapSearchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 12, height: 44, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  mapSearchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  mapResultsList: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  mapResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  mapResultName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  mapResultAddr: { fontSize: 12, color: '#64748b' },
  mapCustomMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.headerBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.headerBg,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: COLORS.headerText,
    fontSize: 16,
    fontWeight: '700',
  },
});
