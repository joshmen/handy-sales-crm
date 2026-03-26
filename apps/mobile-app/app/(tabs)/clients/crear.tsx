import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
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

        {/* GPS Status Indicator */}
        <View style={styles.gpsRow}>
          <MapPin size={14} color={
            locationStatus === 'success' ? '#16a34a' :
            locationStatus === 'loading' ? COLORS.textTertiary :
            '#94a3b8'
          } />
          {locationStatus === 'loading' && (
            <>
              <ActivityIndicator size="small" color={COLORS.textTertiary} style={styles.gpsSpinner} />
              <Text style={styles.gpsTextLoading}>Obteniendo ubicación...</Text>
            </>
          )}
          {locationStatus === 'success' && (
            <Text style={styles.gpsTextSuccess}>Ubicación capturada</Text>
          )}
          {(locationStatus === 'denied' || locationStatus === 'error') && (
            <Text style={styles.gpsTextDenied}>Sin ubicación</Text>
          )}
        </View>
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

  /* GPS indicator */
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 16,
  },
  gpsSpinner: { marginRight: 2 },
  gpsTextLoading: { fontSize: 12, color: COLORS.textTertiary },
  gpsTextSuccess: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  gpsTextDenied: { fontSize: 12, color: '#94a3b8' },

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
