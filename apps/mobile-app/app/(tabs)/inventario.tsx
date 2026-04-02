import { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, RefreshControl, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOfflineProducts, useCategoriasProducto } from '@/hooks';
import { ChevronLeft, Package, Search, AlertTriangle } from 'lucide-react-native';
import { EmptyState } from '@/components/ui';
import { performSync } from '@/sync/syncEngine';
import { COLORS } from '@/theme/colors';
import type Producto from '@/db/models/Producto';

export default function InventarioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const { data: productos, isLoading } = useOfflineProducts(busqueda || undefined, categoriaId);
  const categorias = useCategoriasProducto();

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };

  const renderItem = useCallback(({ item }: { item: Producto }) => {
    const stock = item.stockDisponible ?? 0;
    const minimo = item.stockMinimo ?? 0;
    const isLow = stock > 0 && stock <= minimo;
    const isOut = stock <= 0;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.imagenUrl ? (
            <View style={styles.imageWrap}>
              <View style={styles.image}>
                <Text style={{ fontSize: 10, color: '#94a3b8' }}>IMG</Text>
              </View>
            </View>
          ) : (
            <View style={styles.iconWrap}>
              <Package size={20} color={COLORS.textTertiary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.sku}>{item.sku || item.codigoBarras || 'Sin SKU'}</Text>
          </View>
          <View style={styles.stockCol}>
            <Text style={[
              styles.stockValue,
              isOut && { color: '#dc2626' },
              isLow && { color: '#d97706' },
              !isOut && !isLow && { color: '#16a34a' },
            ]}>
              {stock}
            </Text>
            <Text style={styles.stockLabel}>
              {isOut ? 'Agotado' : isLow ? 'Bajo' : 'En stock'}
            </Text>
            {isLow && <AlertTriangle size={12} color="#d97706" />}
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' }}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventario</Text>
        <View style={{ width: 32 }} />
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
        {categorias.data && categorias.data.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
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
                <Text style={[styles.chipText, categoriaId === cat.id && styles.chipTextActive]}>{cat.nombre}</Text>
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
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          isLoading ? <View style={{ paddingTop: 40, alignItems: 'center' }}><Text style={{ color: '#94a3b8' }}>Cargando...</Text></View> : (
            <EmptyState
              icon={<Package size={48} color="#cbd5e1" />}
              title="Sin productos"
              message="No se encontraron productos"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.headerText, textAlign: 'center', flex: 1 },
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 14, height: 44, gap: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  chipScroll: { gap: 8, paddingTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: COLORS.button },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  listContent: { paddingTop: 8, paddingBottom: 32 },
  card: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#ffffff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  imageWrap: { marginRight: 12 },
  image: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  sku: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  stockCol: { alignItems: 'center', minWidth: 60 },
  stockValue: { fontSize: 20, fontWeight: '800' },
  stockLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
});
