import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useOrderDetail, useEnviarPedido, useCancelarPedido } from '@/hooks';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/format';
import { Calendar, Truck, Send, XCircle, Package } from 'lucide-react-native';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading } = useOrderDetail(Number(id));
  const enviarMutation = useEnviarPedido();
  const cancelarMutation = useCancelarPedido();

  if (isLoading || !order) {
    return <View style={styles.container}><LoadingSpinner message="Cargando pedido..." /></View>;
  }

  const isBorrador = order.estado === 0;
  const canCancel = order.estado < 5 && order.estado !== 6;

  const handleEnviar = () => {
    Alert.alert('Enviar Pedido', '¿Estás seguro de enviar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => enviarMutation.mutate(order.id) },
    ]);
  };

  const handleCancelar = () => {
    Alert.alert('Cancelar Pedido', '¿Estás seguro de cancelar este pedido?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelarMutation.mutate({ id: order.id, razon: 'Cancelado desde app móvil' }) },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.orderNumber}>#{order.numeroPedido}</Text>
            <Text style={styles.clientName}>{order.clienteNombre}</Text>
          </View>
          <StatusBadge type="order" status={order.estado} />
        </View>
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={13} color="#94a3b8" />
            <Text style={styles.dateText}>{formatDate(order.fechaPedido)}</Text>
          </View>
          {order.fechaEntregaEstimada && (
            <View style={styles.dateItem}>
              <Truck size={13} color="#94a3b8" />
              <Text style={styles.dateText}>{formatDate(order.fechaEntregaEstimada)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Line Items */}
      <Card className="mx-4 mb-4">
        <View style={styles.sectionHeader}>
          <Package size={16} color="#2563eb" />
          <Text style={styles.sectionTitle}>Productos ({order.detalles?.length || 0})</Text>
        </View>
        {order.detalles?.map((item) => (
          <View key={item.id} style={styles.lineItem}>
            <View style={styles.lineItemContent}>
              <Text style={styles.productName}>{item.productoNombre}</Text>
              <Text style={styles.productQty}>{item.cantidad} x {formatCurrency(item.precioUnitario)}</Text>
            </View>
            <Text style={styles.lineTotal}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.descuento > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Descuento</Text>
              <Text style={styles.discountValue}>-{formatCurrency(order.descuento)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Impuestos</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.impuestos)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>
      </Card>

      {order.notas && (
        <Card className="mx-4 mb-4">
          <Text style={styles.notesTitle}>Notas</Text>
          <Text style={styles.notesText}>{order.notas}</Text>
        </Card>
      )}

      <View style={styles.actions}>
        {isBorrador && (
          <Button title="Enviar Pedido" onPress={handleEnviar} loading={enviarMutation.isPending} fullWidth icon={<Send size={18} color="#ffffff" />} />
        )}
        {canCancel && (
          <Button title="Cancelar Pedido" onPress={handleCancelar} variant="danger" loading={cancelarMutation.isPending} fullWidth icon={<XCircle size={18} color="#ffffff" />} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  clientName: { fontSize: 15, color: '#64748b', marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 16 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  lineItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  lineItemContent: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  productQty: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  totalsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 13, color: '#94a3b8' },
  totalValue: { fontSize: 13, color: '#475569', fontWeight: '500' },
  discountValue: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  grandTotalValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  notesTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  notesText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  actions: { paddingHorizontal: 16, gap: 10 },
});
