import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineProductById } from '@/hooks';
import { useOrderDraftStore } from '@/stores';
import { Button, LoadingSpinner } from '@/components/ui';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { COLORS } from '@/theme/colors';
import { formatCurrency } from '@/utils/format';
import { ChevronLeft, ImageIcon, ShoppingBag } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ProductoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: product, isLoading } = useOfflineProductById(id || '');
  const { items, addItem, updateQuantity, removeItem } = useOrderDraftStore();

  const draftItem = items.find((i) => i.productoId === id);
  const qty = draftItem?.cantidad || 0;

  if (isLoading || !product) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle Producto</Text>
          <View style={{ width: 22 }} />
        </View>
        <LoadingSpinner message="Cargando producto..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle Producto</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image placeholder */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.imagePlaceholder}>
            <ImageIcon size={48} color={COLORS.textTertiary} />
          </View>
        </Animated.View>

        {/* Product name + SKU + Price */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.nombre}</Text>
            <Text style={styles.productSku}>SKU: {product.codigoBarras || 'N/A'}</Text>
            <Text style={styles.productPrice}>{formatCurrency(product.precio)}</Text>
          </View>
        </Animated.View>

        {/* Details card */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Text style={styles.sectionLabel}>DETALLES</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stock</Text>
              <Text style={[
                styles.detailValue,
                product.stockDisponible <= (product.stockMinimo || 0) ? { color: '#ef4444' } : { color: COLORS.foreground },
              ]}>
                {product.stockDisponible} unidades
              </Text>
            </View>
            {product.unidadMedidaNombre ? (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Unidad</Text>
                <Text style={styles.detailValue}>{product.unidadMedidaNombre}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Description */}
        {product.descripcion ? (
          <Animated.View entering={FadeInDown.duration(300).delay(300)}>
            <Text style={styles.sectionLabel}>DESCRIPCIÓN</Text>
            <View style={styles.detailsCard}>
              <Text style={styles.descText}>{product.descripcion}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Add to Order */}
        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <View style={styles.addSection}>
            {qty > 0 ? (
              <View style={styles.addedRow}>
                <ShoppingBag size={20} color={COLORS.button} />
                <Text style={styles.addedText}>En tu pedido:</Text>
                <QuantityStepper
                  value={qty}
                  onChange={(val) => {
                    if (val <= 0) removeItem(id || '');
                    else updateQuantity(id || '', val);
                  }}
                />
              </View>
            ) : (
              <Button
                title="Agregar al Pedido"
                onPress={() => addItem(product)}
                fullWidth
              />
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Header
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  scrollContent: { paddingBottom: 32 },
  // Image placeholder
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  // Product info
  productInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  productName: { fontSize: 20, fontWeight: '700', color: COLORS.foreground },
  productSku: { fontSize: 12, color: COLORS.textTertiary, marginTop: 4 },
  productPrice: { fontSize: 24, fontWeight: '800', color: COLORS.salesGreen, marginTop: 8 },
  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Details card
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },
  descText: { fontSize: 13, color: '#475569', lineHeight: 20, padding: 16 },
  // Add to order
  addSection: { paddingHorizontal: 20, paddingTop: 20 },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.buttonLight,
    borderRadius: 14,
    padding: 14,
  },
  addedText: { fontSize: 15, fontWeight: '600', color: COLORS.button },
});
