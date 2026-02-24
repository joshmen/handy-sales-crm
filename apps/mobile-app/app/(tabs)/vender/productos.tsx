import { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, RefreshControl, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOfflineProducts, useCategoriasProducto } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { Package, Search, ChevronRight } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import type Producto from '@/db/models/Producto';

export default function ProductosListScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);

  const categorias = useCategoriasProducto();
  const { data: productos, isLoading } = useOfflineProducts(busqueda || undefined, categoriaId);

  const renderItem = useCallback(
    ({ item }: { item: Producto }) => (
      <Card
        className="mx-4 mb-3"
        onPress={() => router.push(`/(tabs)/vender/producto/${item.id}` as any)}
      >
        <View style={styles.productRow}>
          <View style={[styles.productIcon, { backgroundColor: '#eff6ff' }]}>
            <Package size={20} color="#2563eb" />
          </View>
          <View style={styles.productContent}>
            <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.productSku}>{item.codigoBarras || 'Sin SKU'}</Text>
            <View style={styles.productMeta}>
              <View style={[
                styles.stockBadge,
                item.stockDisponible <= (item.stockMinimo || 0)
                  ? styles.stockLow
                  : styles.stockOk,
              ]}>
                <Text style={[
                  styles.stockText,
                  item.stockDisponible <= (item.stockMinimo || 0)
                    ? styles.stockTextLow
                    : styles.stockTextOk,
                ]}>
                  Stock: {item.stockDisponible}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.productRight}>
            <Text style={styles.priceText}>{formatCurrency(item.precio)}</Text>
            <ChevronRight size={16} color="#cbd5e1" />
          </View>
        </View>
      </Card>
    ),
    [router]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando productos..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
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

        {/* Category Chips */}
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
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => performSync()} tintColor="#2563eb" colors={['#2563eb']} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={48} color="#cbd5e1" />}
            title="Sin productos"
            message="No se encontraron productos"
          />
        }
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
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  chipScroll: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  listContent: { paddingTop: 12, paddingBottom: 24 },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productContent: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  productSku: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  categoryText: { fontSize: 11, color: '#64748b' },
  stockBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  stockOk: { backgroundColor: '#dcfce7' },
  stockLow: { backgroundColor: '#fee2e2' },
  stockText: { fontSize: 10, fontWeight: '600' },
  stockTextOk: { color: '#16a34a' },
  stockTextLow: { color: '#ef4444' },
  productRight: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  priceText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  footer: { paddingVertical: 16, alignItems: 'center' },
});
