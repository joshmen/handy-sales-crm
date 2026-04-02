import { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, RefreshControl, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineProducts, useCategoriasProducto } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { formatCurrency } from '@/utils/format';
import { Package, Search, ChevronRight } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import type Producto from '@/db/models/Producto';

export default function ProductosListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          {item.imagenUrl ? (
            <Image source={{ uri: item.imagenUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productIcon}>
              <Package size={20} color={COLORS.textTertiary} />
            </View>
          )}
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
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.blueHeaderTitle}>Productos</Text>
      </View>

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
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => performSync()} tintColor={COLORS.primary} colors={[COLORS.primary]} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' as const },
  blueHeaderTitle: { fontSize: 20, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const },
  searchSection: {
    backgroundColor: COLORS.card,
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
  chipActive: { backgroundColor: COLORS.button },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  listContent: { paddingTop: 12, paddingBottom: 24 },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 100, height: 100, borderRadius: 14, marginRight: 12, backgroundColor: '#f1f5f9' },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
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
  stockLow: { backgroundColor: '#fef2f2' },
  stockText: { fontSize: 10, fontWeight: '600' },
  stockTextOk: { color: '#16a34a' },
  stockTextLow: { color: '#ef4444' },
  productRight: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  priceText: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen },
  footer: { paddingVertical: 16, alignItems: 'center' },
});
