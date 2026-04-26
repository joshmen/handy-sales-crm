import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TextInput, ScrollView, TouchableOpacity, StyleSheet, BackHandler, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineProducts, useCategoriasProducto } from '@/hooks';
import { useOrderDraftStore, useOrderItemCount } from '@/stores';
import { usePricingMap } from '@/hooks/usePricing';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { CartBar } from '@/components/shared/CartBar';
import { EmptyState } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { useTenantLocale } from '@/hooks';
import { Package, Search, Plus, ChevronLeft } from 'lucide-react-native';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import type Producto from '@/db/models/Producto';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

function CrearPedidoStep2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { money: formatCurrency } = useTenantLocale();
  const { fromParada } = useLocalSearchParams<{ fromParada?: string }>();

  const handleBack = useCallback(() => {
    if (fromParada) {
      router.replace(`/(tabs)/ruta/parada/${fromParada}` as any);
    } else {
      router.back();
    }
  }, [fromParada, router]);

  // Intercept Android back button/gesture when coming from parada
  useEffect(() => {
    if (!fromParada) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true; // Prevent default back behavior
    });
    return () => handler.remove();
  }, [fromParada, handleBack]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);

  const items = useOrderDraftStore(s => s.items);
  const addItem = useOrderDraftStore(s => s.addItem);
  const updateQuantity = useOrderDraftStore(s => s.updateQuantity);
  const removeItem = useOrderDraftStore(s => s.removeItem);
  const tipoVenta = useOrderDraftStore(s => s.tipoVenta);
  const itemCount = useOrderItemCount();
  const isDirecta = tipoVenta === 1;
  const clienteListaPreciosId = useOrderDraftStore(s => s.clienteListaPreciosId);
  const { getPricing, loading: pricingLoading } = usePricingMap(clienteListaPreciosId);
  const categorias = useCategoriasProducto();

  // Total con descuentos por línea aplicados (alineado con la pantalla Revisar)
  const total = useMemo(() => {
    const sub = items.reduce((acc, item) => {
      const pricing = getPricing(item.productoServerId ?? 0, item.precioUnitario, item.cantidad);
      return acc + pricing.precioConDescuento * item.cantidad;
    }, 0);
    return sub * 1.16; // IVA 16%
  }, [items, getPricing]);

  const { data: productos, isLoading } = useOfflineProducts(busqueda || undefined, categoriaId);

  const getItemQuantity = (productoId: string) => {
    const item = items.find((i) => i.productoId === productoId);
    return item?.cantidad || 0;
  };

  const renderItem = useCallback(
    ({ item }: { item: Producto }) => {
      const qty = getItemQuantity(item.id);
      const stock = item.stockDisponible ?? 0;
      const noStock = stock <= 0;
      const lowStock = stock > 0 && stock <= (item.stockMinimo || 0);
      const blocked = isDirecta && noStock;
      const maxQty = isDirecta ? stock : undefined;

      // Dynamic pricing
      const pricing = getPricing(item.serverId ?? 0, item.precio, qty || 1);

      return (
        <View style={[styles.productCard, blocked && { opacity: 0.5 }]}>
          <View style={styles.productRow}>
            {item.imagenUrl ? (
              <Image source={{ uri: item.imagenUrl }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Package size={20} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {pricing.tieneListaPrecios ? (
                  <>
                    <Text style={[styles.productPrice, { color: '#16a34a' }]}>{formatCurrency(pricing.precioFinal)}</Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', textDecorationLine: 'line-through' }}>{formatCurrency(item.precio)}</Text>
                  </>
                ) : (
                  <Text style={styles.productPrice}>{formatCurrency(pricing.precioFinal)}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Text style={[styles.stockLabel, noStock ? styles.stockOut : lowStock ? styles.stockLow : styles.stockOk]}>
                  {noStock ? 'Sin stock' : `Stock: ${stock}`}
                </Text>
                {pricing.promo && (
                  <Text style={{ fontSize: 10, color: '#d97706', fontWeight: '600', backgroundColor: '#fef3c7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                    -{pricing.promo.porcentaje}% {pricing.promo.nombre}
                  </Text>
                )}
                {pricing.descuentoVolumen && (
                  <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '500' }}>
                    {pricing.descuentoVolumen.porcentaje}% x{pricing.descuentoVolumen.cantidadMinima}+
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.productActions}>
              {blocked ? (
                <Text style={styles.blockedText}>Sin stock</Text>
              ) : qty > 0 ? (
                <QuantityStepper
                  value={qty}
                  max={maxQty}
                  onChange={(val) => {
                    if (val <= 0) removeItem(item.id);
                    else updateQuantity(item.id, val);
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addItem(item, 1, pricing.precioFinal)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Agregar ${item.nombre}`}
                  accessibilityRole="button"
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
    [items, addItem, updateQuantity, removeItem, isDirecta, getPricing]
  );

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>Productos</Text>
        <View style={{ width: 22 }} />
      </View>
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
            accessibilityLabel="Buscar producto"
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
              accessibilityLabel="Filtro: Todos"
              accessibilityRole="button"
              accessibilityState={{ selected: !categoriaId }}
            >
              <Text style={[styles.chipText, !categoriaId && styles.chipTextActive]}>Todos</Text>
            </TouchableOpacity>
            {categorias.data.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, categoriaId === cat.id && styles.chipActive]}
                onPress={() => setCategoriaId(cat.id === categoriaId ? undefined : cat.id)}
                accessibilityLabel={`Filtro: ${cat.nombre}`}
                accessibilityRole="button"
                accessibilityState={{ selected: categoriaId === cat.id }}
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
        itemCount={itemCount}
        total={total}
        onPress={() => router.push('/(tabs)/vender/crear/revision' as any)}
        label="Revisar pedido"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  backBtn: { padding: 4 },
  blueHeaderTitle: { flex: 1, fontSize: 20, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const },
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
  chipActive: { backgroundColor: COLORS.button },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  productCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 100, height: 100, borderRadius: 14, marginRight: 12, backgroundColor: '#f1f5f9' },
  productImagePlaceholder: { width: 100, height: 100, borderRadius: 14, marginRight: 12, backgroundColor: '#f1f5f9', alignItems: 'center' as const, justifyContent: 'center' as const },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  productPrice: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen, marginTop: 3 },
  stockLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  stockOk: { color: '#16a34a' },
  stockLow: { color: '#d97706' },
  stockOut: { color: '#ef4444', fontWeight: '600' },
  blockedText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  productActions: { marginLeft: 8 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.button,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  footer: { paddingVertical: 16, alignItems: 'center' },
});

export default withErrorBoundary(CrearPedidoStep2, 'CrearPedidoStep2');
