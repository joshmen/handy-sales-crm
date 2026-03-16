import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useOfflineOrderById, useOfflineOrderDetalles, useClientNameMap, useEnviarPedido, useConfirmarPedido, useProcesarPedido, useEnRutaPedido, useEntregarPedido, useCancelarPedido } from '@/hooks';
import { Card, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';
import { Calendar, Send, XCircle, Package, CheckCircle, Truck, ClipboardCheck, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

// ── Status config ──
const ESTADO_LABELS = ['Borrador', 'Enviado', 'Confirmado', 'En Proceso', 'En Ruta', 'Entregado', 'Cancelado'] as const;
const ESTADO_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: '#f1f5f9', text: '#475569' },
  1: { bg: '#fef3c7', text: '#92400e' },
  2: { bg: '#dbeafe', text: '#1e40af' },
  3: { bg: '#ede9fe', text: '#6b21a8' },
  4: { bg: '#ffedd5', text: '#9a3412' },
  5: { bg: '#dcfce7', text: '#166534' },
  6: { bg: '#fee2e2', text: '#991b1b' },
};

// ── Stepper states (exclude Cancelado from linear flow) ──
const STEPPER_STATES = [0, 1, 2, 3, 4, 5];
const STEPPER_LABELS = ['Borrador', 'Enviado', 'Confirmado', 'Proceso', 'En Ruta', 'Entregado'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading } = useOfflineOrderById(id!);
  const { data: detalles } = useOfflineOrderDetalles(id!);
  const clientNames = useClientNameMap();
  const user = useAuthStore((s) => s.user);
  const isSupervisor = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';

  const enviarMutation = useEnviarPedido();
  const confirmarMutation = useConfirmarPedido();
  const procesarMutation = useProcesarPedido();
  const enRutaMutation = useEnRutaPedido();
  const entregarMutation = useEntregarPedido();
  const cancelarMutation = useCancelarPedido();

  const [notasEntrega, setNotasEntrega] = useState('');

  if (isLoading || !order) {
    return <View style={styles.container}><LoadingSpinner message="Cargando pedido..." /></View>;
  }

  const estado = order.estado;
  const serverId = order.serverId ?? 0;
  const isSynced = serverId > 0;
  const canCancel = isSynced && estado >= 0 && estado <= 4;
  const clienteNombre = clientNames.get(order.clienteId) || 'Cliente';
  const estadoColor = ESTADO_COLORS[estado] ?? ESTADO_COLORS[0];

  const handleTransition = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        onConfirm();
      }},
    ]);
  };

  // Update local WatermelonDB immediately after successful transition
  const updateLocalStatus = async (nuevoEstado: number) => {
    try { await order.updateStatus(nuevoEstado); } catch { /* sync will fix */ }
  };

  const handleCancelar = () => {
    Alert.alert('Cancelar Pedido', '¿Estás seguro de cancelar este pedido?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelarMutation.mutate({ id: serverId, razon: 'Cancelado desde app móvil' }, { onSuccess: () => updateLocalStatus(6) }) },
    ]);
  };

  // Determine which action button to show
  const renderActionButton = () => {
    const anyLoading = enviarMutation.isPending || confirmarMutation.isPending || procesarMutation.isPending || enRutaMutation.isPending || entregarMutation.isPending;

    // Transitions require serverId — show sync message if not yet synced
    if (!isSynced && estado > 0) {
      return (
        <View style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}>
          <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 14 }}>Sincronizando con servidor...</Text>
        </View>
      );
    }

    switch (estado) {
      case 0: // Borrador → Enviar
        return (
          <TouchableOpacity
            testID="btn-enviar"
            style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
            onPress={() => handleTransition('Enviar Pedido', '¿Enviar este pedido?', () => enviarMutation.mutate(serverId, { onSuccess: () => updateLocalStatus(1) }))}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <Send size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Enviar Pedido</Text>
          </TouchableOpacity>
        );
      case 1: // Enviado → Confirmar (solo supervisor)
        if (!isSupervisor) return null;
        return (
          <TouchableOpacity
            testID="btn-confirmar"
            style={[styles.actionBtn, { backgroundColor: '#1e40af' }]}
            onPress={() => handleTransition('Confirmar Pedido', '¿Confirmar este pedido?', () => confirmarMutation.mutate(serverId, { onSuccess: () => updateLocalStatus(2) }))}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <CheckCircle size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Confirmar Pedido</Text>
          </TouchableOpacity>
        );
      case 2: // Confirmado → Procesar (solo supervisor)
        if (!isSupervisor) return null;
        return (
          <TouchableOpacity
            testID="btn-procesar"
            style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
            onPress={() => handleTransition('Procesar Pedido', '¿Iniciar procesamiento?', () => procesarMutation.mutate(serverId, { onSuccess: () => updateLocalStatus(3) }))}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <ClipboardCheck size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Procesar Pedido</Text>
          </TouchableOpacity>
        );
      case 3: // EnProceso → En Ruta
        return (
          <TouchableOpacity
            testID="btn-en-ruta"
            style={[styles.actionBtn, { backgroundColor: '#ea580c' }]}
            onPress={() => handleTransition('Poner en Ruta', '¿Enviar a ruta de entrega?', () => enRutaMutation.mutate(serverId, { onSuccess: () => updateLocalStatus(4) }))}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <Truck size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Poner en Ruta</Text>
          </TouchableOpacity>
        );
      case 4: // EnRuta → Entregar
        return (
          <View>
            <TextInput
              style={styles.notasInput}
              placeholder="Notas de entrega (opcional)"
              placeholderTextColor="#94a3b8"
              value={notasEntrega}
              onChangeText={setNotasEntrega}
              multiline
            />
            <TouchableOpacity
              testID="btn-entregar"
              style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
              onPress={() => handleTransition('Marcar Entregado', '¿Confirmar entrega del pedido?', () => entregarMutation.mutate({ id: serverId, notasEntrega }, { onSuccess: () => updateLocalStatus(5) }))}
              disabled={anyLoading}
              activeOpacity={0.8}
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Marcar Entregado</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header + Status Badge */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.orderNumber}>
              {order.numeroPedido ? `#${order.numeroPedido}` : `#${order.serverId || order.id.slice(0, 6)}`}
            </Text>
            <Text style={styles.clientName}>{clienteNombre}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.statusText, { color: estadoColor.text }]}>{ESTADO_LABELS[estado]}</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={13} color="#94a3b8" />
            <Text style={styles.dateText}>{formatDate(order.fechaPedido || order.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Stepper Timeline */}
      {estado !== 6 && (
        <View style={styles.stepper}>
          {STEPPER_STATES.map((s, i) => {
            const isActive = s === estado;
            const isPast = s < estado;
            const dotColor = isActive ? '#2563eb' : isPast ? '#16a34a' : '#e2e8f0';
            const lineColor = isPast ? '#16a34a' : '#e2e8f0';
            return (
              <View key={s} style={styles.stepItem}>
                <View style={styles.stepDotRow}>
                  {i > 0 && <View style={[styles.stepLine, { backgroundColor: lineColor }]} />}
                  <View style={[styles.stepDot, { backgroundColor: dotColor }]}>
                    {isPast && <CheckCircle size={10} color="#fff" />}
                    {isActive && <ArrowRight size={10} color="#fff" />}
                  </View>
                  {i < STEPPER_STATES.length - 1 && <View style={[styles.stepLine, { backgroundColor: s < estado ? '#16a34a' : '#e2e8f0' }]} />}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isPast && styles.stepLabelPast]}>{STEPPER_LABELS[i]}</Text>
              </View>
            );
          })}
        </View>
      )}

      {estado === 6 && (
        <View style={styles.cancelledBanner}>
          <XCircle size={16} color="#dc2626" />
          <Text style={styles.cancelledText}>Pedido cancelado</Text>
        </View>
      )}

      {/* Line Items */}
      <Card className="mx-4 mb-4">
        <View style={styles.sectionHeader}>
          <Package size={16} color="#2563eb" />
          <Text style={styles.sectionTitle}>Productos ({detalles?.length || 0})</Text>
        </View>
        {detalles?.map((item) => (
          <View key={item.id} style={styles.lineItem}>
            <View style={styles.lineItemContent}>
              <Text style={styles.productName}>{item.productoNombre}</Text>
              <Text style={styles.productQty}>{item.cantidad} x {formatCurrency(item.precioUnitario)}</Text>
            </View>
            <Text style={styles.lineTotal}>{formatCurrency(item.subtotal)}</Text>
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
            <Text style={styles.totalValue}>{formatCurrency(order.impuesto)}</Text>
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

      {/* Action Buttons */}
      <View style={styles.actions}>
        {renderActionButton()}
        {canCancel && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn]}
            onPress={handleCancelar}
            disabled={cancelarMutation.isPending}
            activeOpacity={0.8}
          >
            <XCircle size={18} color="#dc2626" />
            <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Cancelar Pedido</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  clientName: { fontSize: 15, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 13, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 16 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  // Stepper
  stepper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingVertical: 16, paddingHorizontal: 8, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 16 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, height: 3, borderRadius: 2 },
  stepLabel: { fontSize: 9, color: '#cbd5e1', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  stepLabelActive: { color: '#2563eb', fontWeight: '700' },
  stepLabelPast: { color: '#16a34a' },
  // Cancelled
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', paddingVertical: 12, marginBottom: 16 },
  cancelledText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  // Products
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
  // Actions
  actions: { paddingHorizontal: 16, gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cancelBtn: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca' },
  notasInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14, color: '#1e293b', minHeight: 60, textAlignVertical: 'top' },
});
