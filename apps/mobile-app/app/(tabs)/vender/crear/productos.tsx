import { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOfflineProducts, useCategoriasProducto } from '@/hooks';
import { useOrderDraftStore } from '@/stores';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { CartBar } from '@/components/shared/CartBar';
import { EmptyState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { Package, Search, Plus } from 'lucide-react-native';
import type Producto from '@/db/models/Producto';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

export default function CrearPedidoStep2() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);

  const { items, addItem, updateQuantity, removeItem, itemCount, total } = useOrderDraftStore();
  const categorias = useCategoriasProducto();

  const { data: productos, isLoading } = useOfflineProducts(busqueda || undefined, categoriaId);

  const getItemQuantity = (productoId: string) => {
    const item = items.find((i) => i.productoId === productoId);
    return item?.cantidad || 0;
  };

  const renderItem = useCallback(
    ({ item }: { item: Producto }) => {
      const qty = getItemQuantity(item.id);

      return (
        <View style={styles.productCard}>
          <View style={styles.productRow}>
            <View style={[styles.productIcon, { backgroundColor: '#eff6ff' }]}>
              <Package size={20} color="#2563eb" />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
              <Text style={styles.productPrice}>{formatCurrency(item.precio)}</Text>
              <Text
                style={[
                  styles.stockLabel,
                  item.stockDisponible <= (item.stockMinimo || 0)
                    ? styles.stockLow
                    : styles.stockOk,
                ]}
              >
                Stock: {item.stockDisponible}
              </Text>
            </View>
            <View style={styles.productActions}>
              {qty > 0 ? (
                <QuantityStepper
                  value={qty}
                  onChange={(val) => {
                    if (val <= 0) removeItem(item.id);
                    else updateQuantity(item.id, val);
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addItem(item)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    },
    [items, addItem, updateQuantity, removeItem]
  );

  return (
    <View style={styles.container}>
      <ProgressSteps steps={STEPS} currentStep={1} />

      {/* Search + Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor="#94a3b8"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
        {categorias.data && categorias.data.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            <TouchableOpacity
              style={[styles.chip, !categoriaId && styles.chipActive]}
              onPress={() => setCategoriaId(undefined)}
            >
              <Text style={[styles.chipText, !categoriaId && styles.chipTextActive]}>Todos</Text>
            </TouchableOpacity>
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
        )}
      </View>

      <FlatList
        data={productos ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Package size={48} color="#cbd5e1" />}
              title="Sin productos"
              message="No se encontraron productos"
            />
          ) : null
        }
      />

      <CartBar
        itemCount={itemCount()}
        total={total()}
        onPress={() => router.push('/(tabs)/vender/crear/revision' as any)}
        label="Revisar pedido"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  chipScroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  productCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#2563eb', marginTop: 2 },
  stockLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  stockOk: { color: '#16a34a' },
  stockLow: { color: '#ef4444' },
  productActions: { marginLeft: 8 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  footer: { paddingVertical: 16, alignItems: 'center' },
});
