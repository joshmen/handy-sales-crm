import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineClients } from '@/hooks';
import { useOrderDraftStore } from '@/stores';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { LoadingSpinner, EmptyState, Button } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { User, Search, Check, ChevronLeft } from 'lucide-react-native';
import type Cliente from '@/db/models/Cliente';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

function CrearPedidoStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busqueda, setBusqueda] = useState('');
  const { clienteId, setCliente, reset: resetDraft } = useOrderDraftStore();
  const params = useLocalSearchParams<{ clienteId?: string; clienteNombre?: string }>();

  // If coming from parada with clienteId, auto-select and skip to products
  // If coming normally (no params), reset the draft so old selection is cleared
  const tipoVenta = useOrderDraftStore(s => s.tipoVenta);
  useEffect(() => {
    if (params.clienteId) {
      const nombre = params.clienteNombre ? decodeURIComponent(params.clienteNombre) : 'Cliente';
      setCliente(params.clienteId, Number(params.clienteId), nombre);
      router.push('/(tabs)/vender/crear/productos' as any);
    }
    // Don't resetDraft here — tipoVenta was already set by the BottomSheet
  }, []);

  const { data: clientes, isLoading } = useOfflineClients(busqueda || undefined);

  const handleSelect = useCallback(
    (cliente: Cliente) => {
      setCliente(cliente.id, cliente.serverId, cliente.nombre, cliente.listaPreciosId);
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
          accessibilityLabel={`Cliente ${item.nombre}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.telefono && (
                <Text style={styles.clientPhone}>{item.telefono}</Text>
              )}
              {item.listaPreciosId ? (
                <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600', backgroundColor: '#dcfce7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                  Precio especial
                </Text>
              ) : null}
            </View>
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
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>Seleccionar Cliente</Text>
        <View style={{ width: 32 }} />
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
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
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
  blueHeader: { backgroundColor: COLORS.headerBg, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingBottom: 14 },
  blueHeaderTitle: { fontSize: 17, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const, flex: 1 },
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

export default withErrorBoundary(CrearPedidoStep1, 'CrearPedidoStep1');
