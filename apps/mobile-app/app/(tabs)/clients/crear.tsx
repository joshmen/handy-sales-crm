import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '@/api';
import { useZonas, useCategoriasCliente } from '@/hooks';
import { Save, ChevronLeft, MapPin, ChevronDown, Search, X, Check } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import { GpsMapModal } from '@/components/shared/GpsMapModal';
import type { ClienteCreateRequest } from '@/types/client';

// ── Inline SearchableDropdown ────────────────────────────────
function SearchableDropdown({
  label, required, items, selectedId, onSelect, placeholder,
}: {
  label: string;
  required?: boolean;
  items: { id: number; nombre: string }[];
  selectedId: number | undefined;
  onSelect: (id: number | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = items.find(i => i.id === selectedId);
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.nombre.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.dropdownText, !selected && { color: COLORS.textTertiary }]}>
          {selected?.nombre || placeholder || 'Seleccionar...'}
        </Text>
        <ChevronDown size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}{required ? ' *' : ''}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Search size={16} color={COLORS.textTertiary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Buscar ${label.toLowerCase()}...`}
                placeholderTextColor={COLORS.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={i => String(i.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.id === selectedId && styles.modalItemActive]}
                  onPress={() => { onSelect(item.id); setOpen(false); setSearch(''); }}
                >
                  <Text style={[styles.modalItemText, item.id === selectedId && { color: COLORS.headerBg, fontWeight: '700' }]}>
                    {item.nombre}
                  </Text>
                  {item.id === selectedId && <Check size={16} color={COLORS.headerBg} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Sin resultados</Text>}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Validation helpers ───────────────────────────────────────
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

// ── Error label ──────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.errorText}>{message}</Text>;
}

// ══════════════════════════════════════════════════════════════

export default function CrearClienteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const zonas = useZonas();
  const categorias = useCategoriasCliente();
  const { editId } = require('expo-router').useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [rfc, setRfc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [numeroExterior, setNumeroExterior] = useState('');
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // GPS — no auto-detect, user picks from map
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Load existing client data when editing
  useEffect(() => {
    if (!editId || loaded) return;
    (async () => {
      try {
        const client = await clientesApi.getById(Number(editId));
        setNombre(client.nombre || '');
        setTelefono(client.telefono || '');
        setCorreo(client.correo || '');
        setRfc(client.rfc || '');
        setDireccion(client.direccion || '');
        setZonaId(client.idZona || undefined);
        setCategoriaId(client.categoriaClienteId || undefined);
        if (client.latitud && client.longitud) {
          setLocation({ lat: client.latitud, lng: client.longitud });
        }
      } catch { /* ignore load errors */ }
      setLoaded(true);
    })();
  }, [editId, loaded]);

  const crearMutation = useMutation({
    mutationFn: (data: ClienteCreateRequest) =>
      isEditing ? clientesApi.update(Number(editId), data) : clientesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      Toast.show({ type: 'success', text1: isEditing ? 'Cliente actualizado' : 'Cliente creado', text2: 'Se guardó exitosamente' });
      router.back();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join('\n')
        : 'No se pudo crear el cliente. Verifica los datos.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    },
  });

  // Validation — correo and telefono are optional
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!nombre.trim() || nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    if (telefono && !isValidPhone(telefono)) e.telefono = 'Debe ser 10 dígitos';
    if (correo && !isValidEmail(correo)) e.correo = 'Formato inválido';
    if (rfc && (rfc.length < 12 || rfc.length > 13)) e.rfc = 'Debe ser 12-13 caracteres';
    if (!direccion.trim()) e.direccion = 'Obligatorio';
    if (!numeroExterior.trim()) e.numeroExterior = 'Obligatorio';
    if (!zonaId) e.zona = 'Selecciona una zona';
    if (!categoriaId) e.categoria = 'Selecciona una categoría';
    return e;
  }, [nombre, telefono, correo, rfc, direccion, numeroExterior, zonaId, categoriaId]);

  const isValid = Object.keys(errors).length === 0;

  const handleGuardar = () => {
    setTouched(true);
    if (!isValid) return;
    crearMutation.mutate({
      nombre: nombre.trim(),
      telefono: telefono || undefined,
      correo: correo ? correo.trim().toLowerCase() : undefined,
      rfc: rfc || undefined,
      direccion: direccion.trim(),
      numeroExterior: numeroExterior.trim(),
      idZona: zonaId as number,
      categoriaClienteId: categoriaId as number,
      latitud: location?.lat,
      longitud: location?.lng,
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={24} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Cliente' : 'Crear Cliente'}</Text>
        <View style={styles.headerBack} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ═══ UBICACIÓN — first so vendor can search client on map ═══ */}
        <Text style={styles.sectionLabel}>UBICACIÓN</Text>

        <View style={styles.field}>
          {location ? (
            <TouchableOpacity style={styles.gpsPreview} onPress={() => setShowMapModal(true)} activeOpacity={0.8} accessibilityLabel="Cambiar ubicación en mapa" accessibilityRole="button">
              <View style={styles.gpsPreviewIcon}>
                <MapPin size={20} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsPreviewText}>Ubicación registrada</Text>
                <Text style={styles.gpsPreviewCoords}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>Cambiar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.gpsAddBtn} onPress={() => setShowMapModal(true)} activeOpacity={0.8} accessibilityLabel="Buscar en mapa" accessibilityRole="button">
              <MapPin size={18} color={COLORS.primary} />
              <Text style={[styles.gpsAddText, { color: COLORS.primary }]}>Buscar en mapa</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.gpsHint}>Busca al cliente en el mapa para llenar la dirección automáticamente</Text>
        </View>

        {/* ═══ DIRECCIÓN ═══ */}
        <Text style={styles.sectionLabel}>DIRECCIÓN</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Calle *</Text>
          <TextInput style={[styles.input, touched && errors.direccion && styles.inputError]} placeholder="Nombre de la calle" placeholderTextColor={COLORS.textTertiary} value={direccion} onChangeText={setDireccion} accessibilityLabel="Calle" />
          {touched && <FieldError message={errors.direccion} />}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Número exterior *</Text>
          <TextInput style={[styles.input, { width: 120 }, touched && errors.numeroExterior && styles.inputError]} placeholder="# Ext" placeholderTextColor={COLORS.textTertiary} maxLength={20} value={numeroExterior} onChangeText={setNumeroExterior} accessibilityLabel="Número exterior" />
          {touched && <FieldError message={errors.numeroExterior} />}
        </View>

        {/* ═══ INFORMACIÓN GENERAL ═══ */}
        <Text style={styles.sectionLabel}>INFORMACIÓN GENERAL</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput style={[styles.input, touched && errors.nombre && styles.inputError]} placeholder="Nombre del cliente o negocio" placeholderTextColor={COLORS.textTertiary} value={nombre} onChangeText={setNombre} accessibilityLabel="Nombre del cliente" />
          {touched && <FieldError message={errors.nombre} />}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput style={[styles.input, touched && errors.telefono && styles.inputError]} placeholder="10 dígitos (opcional)" placeholderTextColor={COLORS.textTertiary} keyboardType="phone-pad" maxLength={10} value={telefono} onChangeText={setTelefono} accessibilityLabel="Teléfono" />
          {touched && <FieldError message={errors.telefono} />}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput style={[styles.input, touched && errors.correo && styles.inputError]} placeholder="correo@ejemplo.com (opcional)" placeholderTextColor={COLORS.textTertiary} keyboardType="email-address" autoCapitalize="none" value={correo} onChangeText={setCorreo} accessibilityLabel="Correo electrónico" />
          {touched && <FieldError message={errors.correo} />}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>RFC</Text>
          <TextInput style={[styles.input, touched && errors.rfc && styles.inputError]} placeholder="12 o 13 caracteres (opcional)" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" maxLength={13} value={rfc} onChangeText={setRfc} accessibilityLabel="RFC" />
          {touched && <FieldError message={errors.rfc} />}
        </View>

        {/* ═══ CLASIFICACIÓN ═══ */}
        <Text style={styles.sectionLabel}>CLASIFICACIÓN</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Zona *</Text>
          <SearchableDropdown label="Zona" required items={zonas.data || []} selectedId={zonaId} onSelect={setZonaId} placeholder="Seleccionar zona..." />
          {touched && <FieldError message={errors.zona} />}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Categoría *</Text>
          <SearchableDropdown label="Categoría" required items={categorias.data || []} selectedId={categoriaId} onSelect={setCategoriaId} placeholder="Seleccionar categoría..." />
          {touched && <FieldError message={errors.categoria} />}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid && touched) && styles.submitButtonDisabled]}
          onPress={handleGuardar}
          disabled={crearMutation.isPending}
          activeOpacity={0.8}
          accessibilityLabel={isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
          accessibilityRole="button"
        >
          <Save size={18} color={COLORS.headerText} />
          <Text style={styles.submitButtonText}>
            {crearMutation.isPending ? 'Guardando...' : isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
          </Text>
        </TouchableOpacity>
      </View>

      <GpsMapModal
        visible={showMapModal}
        initialCoord={location ? { latitude: location.lat, longitude: location.lng } : { latitude: 25.79, longitude: -108.99 }}
        clientName={nombre || undefined}
        onConfirm={(coord, placeInfo) => {
          setLocation({ lat: coord.latitude, lng: coord.longitude });
          setShowMapModal(false);
          if (placeInfo?.address) {
            const addr = placeInfo.address;
            const numMatch = addr.match(/\b(\d{1,6})\b/);
            if (numMatch) {
              setNumeroExterior(numMatch[1]);
              const street = addr.split(',')[0].replace(numMatch[0], '').trim();
              setDireccion(street || addr.split(',')[0]);
            } else {
              setDireccion(addr.split(',')[0]);
            }
          }
          if (placeInfo?.name) {
            setNombre(placeInfo.name);
          }
          if (placeInfo?.phone) {
            setTelefono(placeInfo.phone);
          }
        }}
        onCancel={() => setShowMapModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.headerBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  headerBack: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.headerText, textAlign: 'center', flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: COLORS.card, height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.foreground, borderWidth: 1, borderColor: COLORS.borderMedium },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },

  // Dropdown
  dropdown: { backgroundColor: COLORS.card, height: 48, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.borderMedium, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 15, color: COLORS.foreground },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8, marginBottom: 8 },
  modalSearchInput: { flex: 1, fontSize: 14, color: COLORS.foreground },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemActive: { backgroundColor: `${COLORS.headerBg}10` },
  modalItemText: { fontSize: 15, color: COLORS.foreground },
  modalEmpty: { textAlign: 'center', color: COLORS.textTertiary, paddingVertical: 20, fontSize: 14 },

  // GPS
  gpsPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: COLORS.onlineBg, borderWidth: 1, borderColor: COLORS.brandLight },
  gpsPreviewIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.brandLight, alignItems: 'center', justifyContent: 'center' },
  gpsPreviewText: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  gpsPreviewCoords: { fontSize: 11, color: COLORS.textTertiary, marginTop: 1 },
  gpsAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderMedium, borderStyle: 'dashed' },
  gpsAddText: { fontSize: 14, fontWeight: '600', color: COLORS.textTertiary },
  gpsHint: { fontSize: 12, color: COLORS.textTertiary, marginTop: 6, textAlign: 'center' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitButton: { backgroundColor: COLORS.headerBg, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: COLORS.headerText, fontSize: 16, fontWeight: '700' },
});
