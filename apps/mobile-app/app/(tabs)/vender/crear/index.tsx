import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineClients } from '@/hooks';
import { useOrderDraftStore } from '@/stores';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { LoadingSpinner, EmptyState, Button } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { User, Search, Check } from 'lucide-react-native';
import type Cliente from '@/db/models/Cliente';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

export default function CrearPedidoStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busqueda, setBusqueda] = useState('');
  const { clienteId, setCliente } = useOrderDraftStore();
  const params = useLocalSearchParams<{ clienteId?: string; clienteNombre?: string }>();

  // Auto-select client if passed from visita/parada — skip to products
  useEffect(() => {
    if (params.clienteId && !clienteId) {
      const nombre = params.clienteNombre ? decodeURIComponent(params.clienteNombre) : 'Cliente';
      setCliente(params.clienteId, Number(params.clienteId), nombre);
      router.push('/(tabs)/vender/crear/productos' as any);
    }
  }, [params.clienteId]);

  const { data: clientes, isLoading } = useOfflineClients(busqueda || undefined);

  const handleSelect = useCallback(
    (cliente: Cliente) => {
      setCliente(cliente.id, cliente.serverId, cliente.nombre);
    },
    [setCliente]
  );

  const handleContinue = () => {
    if (clienteId) {
      router.push('/(tabs)/vender/crear/productos' as any);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Cliente }) => {
      const isSelected = clienteId === item.id;
      return (
        <TouchableOpacity
          style={[styles.clientItem, isSelected && styles.clientItemSelected]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.clientAvatar, isSelected && styles.clientAvatarSelected]}>
            {isSelected ? (
              <Check size={18} color="#ffffff" />
            ) : (
              <User size={18} color="#64748b" />
            )}
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, isSelected && styles.clientNameSelected]}>
              {item.nombre}
            </Text>
            {item.telefono && (
              <Text style={styles.clientPhone}>{item.telefono}</Text>
            )}
          </View>
          {isSelected && (
            <View style={styles.checkBadge}>
              <Text style={styles.checkText}>Seleccionado</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [clienteId, handleSelect]
  );

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.blueHeaderTitle}>Seleccionar Cliente</Text>
      </View>
      <ProgressSteps steps={STEPS} currentStep={0} />

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor="#94a3b8"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Cargando clientes..." />
      ) : (
        <FlatList
          data={clientes ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon={<User size={48} color="#cbd5e1" />}
              title="Sin clientes"
              message="No se encontraron clientes"
            />
          }
        />
      )}

      <View style={styles.footer}>
        <Button
          title="Continuar"
          onPress={handleContinue}
          disabled={!clienteId}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' as const },
  blueHeaderTitle: { fontSize: 20, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  clientItemSelected: {
    borderColor: COLORS.button,
    backgroundColor: COLORS.buttonLight,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarSelected: {
    backgroundColor: COLORS.button,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  clientNameSelected: { color: COLORS.button },
  clientPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  checkBadge: {
    backgroundColor: COLORS.buttonLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  checkText: { fontSize: 11, fontWeight: '600', color: COLORS.button },
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
