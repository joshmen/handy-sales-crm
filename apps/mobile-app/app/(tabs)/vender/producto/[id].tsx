import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useProductDetail, useProductStock } from '@/hooks';
import { useOrderDraftStore } from '@/stores';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { formatCurrency } from '@/utils/format';
import { Package, Layers, Tag, Ruler, AlertTriangle, ShoppingBag } from 'lucide-react-native';

export default function ProductoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const { data: product, isLoading } = useProductDetail(productId);
  const { data: stock } = useProductStock(productId);
  const { items, addItem, updateQuantity, removeItem } = useOrderDraftStore();

  const draftItem = items.find((i) => i.productoId === productId);
  const qty = draftItem?.cantidad || 0;

  if (isLoading || !product) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando producto..." />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Package size={40} color="#2563eb" />
        </View>
        <Text style={styles.productName}>{product.nombre}</Text>
        <Text style={styles.productSku}>{product.codigoBarra || 'Sin código'}</Text>
        <Text style={styles.productPrice}>{formatCurrency(product.precioBase)}</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        {product.descripcion && (
          <Card className="mb-3">
            <Text style={styles.infoLabel}>Descripción</Text>
            <Text style={styles.infoText}>{product.descripcion}</Text>
          </Card>
        )}

        <View style={styles.infoGrid}>
          {product.categoriaNombre && (
            <View style={styles.infoItem}>
              <Tag size={16} color="#7c3aed" />
              <View>
                <Text style={styles.infoItemLabel}>Categoría</Text>
                <Text style={styles.infoItemValue}>{product.categoriaNombre}</Text>
              </View>
            </View>
          )}
          {product.familiaNombre && (
            <View style={styles.infoItem}>
              <Layers size={16} color="#2563eb" />
              <View>
                <Text style={styles.infoItemLabel}>Familia</Text>
                <Text style={styles.infoItemValue}>{product.familiaNombre}</Text>
              </View>
            </View>
          )}
          {product.unidadNombre && (
            <View style={styles.infoItem}>
              <Ruler size={16} color="#d97706" />
              <View>
                <Text style={styles.infoItemLabel}>Unidad</Text>
                <Text style={styles.infoItemValue}>{product.unidadNombre}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Stock */}
        {stock && (
          <Card className="mb-3">
            <View style={styles.stockRow}>
              <View>
                <Text style={styles.infoLabel}>Stock Disponible</Text>
                <Text style={[styles.stockValue, stock.enAlerta ? styles.stockAlert : styles.stockGood]}>
                  {stock.stock} unidades
                </Text>
              </View>
              {stock.enAlerta && (
                <View style={styles.alertBadge}>
                  <AlertTriangle size={14} color="#ef4444" />
                  <Text style={styles.alertText}>Stock bajo</Text>
                </View>
              )}
            </View>
          </Card>
        )}
      </View>

      {/* Add to Order */}
      <View style={styles.addSection}>
        {qty > 0 ? (
          <View style={styles.addedRow}>
            <ShoppingBag size={20} color="#2563eb" />
            <Text style={styles.addedText}>En tu pedido:</Text>
            <QuantityStepper
              value={qty}
              onChange={(val) => {
                if (val <= 0) removeItem(productId);
                else updateQuantity(productId, val);
              }}
            />
          </View>
        ) : (
          <Button
            title="Agregar al Pedido"
            onPress={() => addItem(product)}
            fullWidth
            icon={<ShoppingBag size={18} color="#ffffff" />}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  productName: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  productSku: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  productPrice: { fontSize: 24, fontWeight: '800', color: '#2563eb', marginTop: 8 },
  infoSection: { padding: 16 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  infoGrid: { gap: 10, marginBottom: 12 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoItemLabel: { fontSize: 11, color: '#94a3b8' },
  infoItemValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  stockGood: { color: '#16a34a' },
  stockAlert: { color: '#ef4444' },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  alertText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  addSection: { paddingHorizontal: 16 },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
  },
  addedText: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
});
