import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '@/api';
import { useZonas, useCategoriasCliente } from '@/hooks';
import { Button } from '@/components/ui';
import { User, Save } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import type { ClienteCreateRequest } from '@/types/client';

export default function CrearClienteScreen() {
  const router = useRouter();
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
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del cliente"
            placeholderTextColor="#94a3b8"
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
            placeholderTextColor="#94a3b8"
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
            placeholderTextColor="#94a3b8"
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
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            value={rfc}
            onChangeText={setRfc}
          />
        </View>

        {/* Address */}
        <View style={styles.field}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Calle, número, colonia, ciudad"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={2}
            value={direccion}
            onChangeText={setDireccion}
            textAlignVertical="top"
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
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Guardar Cliente"
          onPress={handleGuardar}
          disabled={!isValid}
          loading={crearMutation.isPending}
          fullWidth
          icon={<Save size={18} color="#ffffff" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: { minHeight: 60 },
  chipScroll: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});
