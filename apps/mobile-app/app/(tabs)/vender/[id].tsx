import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineOrderById, useOfflineOrderDetalles, useClientNameMap, useConfirmarPedido, useEnRutaPedido, useEntregarPedido, useCancelarPedido, useOfflineClientById, useFacturacionEnabled, useCreateFactura, useTenantLocale } from '@/hooks';
import { LoadingSpinner, ConfirmModal } from '@/components/ui';
import { DatosFiscalesModal, type FiscalData } from '@/components/shared/DatosFiscalesModal';
import { XCircle, Package, CheckCircle, Truck, ArrowRight, ChevronLeft, FileText } from 'lucide-react-native';
import { SbOrders } from '@/components/icons/DashboardIcons';
import { ORDER_STATUS_COLORS } from '@/constants/colors';
import { COLORS } from '@/theme/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ── Stepper states (exclude Cancelado from linear flow) ──
const STEPPER_STATES = [0, 2, 4, 5];
const STEPPER_LABELS = ['Borrador', 'Confirmado', 'En Ruta', 'Entregado'];
// Map legacy states 1 (Enviado) and 3 (EnProceso) to Confirmado(2) for stepper display
const normalizeEstado = (e: number): number => (e === 1 || e === 3) ? 2 : e;

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency, dateTime: formatDateTime } = useTenantLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading } = useOfflineOrderById(id!);
  const { data: detalles } = useOfflineOrderDetalles(id!);
  const clientNames = useClientNameMap();
  const confirmarMutation = useConfirmarPedido();
  const enRutaMutation = useEnRutaPedido();
  const entregarMutation = useEntregarPedido();
  const cancelarMutation = useCancelarPedido();

  // Facturación (solo si el país del tenant soporta CFDI)
  const facturacionEnabled = useFacturacionEnabled();
  const { data: cliente } = useOfflineClientById(order?.clienteId);
  const crearFacturaMutation = useCreateFactura();
  const [showFacturarModal, setShowFacturarModal] = useState(false);

  const [notasEntrega, setNotasEntrega] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean; confirmText?: string; icon?: React.ReactNode }>({ visible: false, title: '', message: '', onConfirm: () => {} });


  if (isLoading) {
    return <View style={styles.container}><LoadingSpinner message="Cargando pedido..." /></View>;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.blueHeaderTitle}>Pedido</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#64748b' }}>Pedido no encontrado</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Este pedido ya no está disponible</Text>
        </View>
      </View>
    );
  }

  const estado = order.estado;
  const serverId = order.serverId ?? 0;
  const isSynced = serverId > 0;
  const canCancel = isSynced && estado >= 0 && estado <= 4;
  const clienteNombre = clientNames.get(order.clienteId) || 'Cliente';
  const estadoColor = ORDER_STATUS_COLORS[estado] ?? ORDER_STATUS_COLORS[0];

  // Facturar: solo visible si tenant soporta país + pedido entregado + sincronizado
  const canFacturar = facturacionEnabled && estado === 5 && isSynced;

  const handleFacturar = (data: FiscalData) => {
    crearFacturaMutation.mutate(
      { pedidoId: serverId, data },
      {
        onSuccess: () => {
          setShowFacturarModal(false);
          Toast.show({ type: 'success', text1: 'Factura generada', text2: 'CFDI timbrado correctamente' });
        },
        onError: (e: any) => {
          const msg = e?.response?.data?.message ?? e?.message ?? 'Error al facturar';
          Toast.show({ type: 'error', text1: 'Error al facturar', text2: msg });
        },
      }
    );
  };

  const handleTransition = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ visible: true, title, message, onConfirm, confirmText: 'Confirmar', icon: <SbOrders size={48} /> });
  };

  // Update local WatermelonDB immediately after successful transition
  const updateLocalStatus = async (nuevoEstado: number) => {
    try { await order.updateStatus(nuevoEstado); } catch (e) { if (__DEV__) console.warn('[Order] updateStatus failed:', e); }
  };

  const handleCancelar = () => {
    setConfirmModal({
      visible: true,
      title: 'Cancelar Pedido',
      message: '¿Estás seguro de cancelar este pedido?',
      confirmText: 'Sí, cancelar',
      destructive: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        cancelarMutation.mutate({ id: serverId, razon: 'Cancelado desde app móvil' }, { onSuccess: () => updateLocalStatus(6), onError: (e: any) => { if (!e?.response || e.code === 'ERR_NETWORK') { updateLocalStatus(6); Toast.show({ type: 'success', text1: 'Guardado offline', text2: 'Se sincronizará automáticamente' }); } } });
      },
    });
  };

  // Determine which action button to show (simplified 4-state flow)
  const renderActionButton = () => {
    const anyLoading = confirmarMutation.isPending || enRutaMutation.isPending || entregarMutation.isPending;
    const effectiveEstado = normalizeEstado(estado);

    // Transitions require serverId — show sync message if not yet synced
    if (!isSynced && estado > 0) {
      return (
        <View style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}>
          <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 14 }}>Sincronizando con servidor...</Text>
        </View>
      );
    }

    switch (effectiveEstado) {
      case 0: // Borrador → Confirmar
        return (
          <TouchableOpacity
            testID="btn-confirmar"
            style={[styles.actionBtn, { backgroundColor: COLORS.button }]}
            onPress={() => handleTransition('Confirmar Pedido', '¿Confirmar este pedido?', () => confirmarMutation.mutate(serverId, { onSuccess: () => updateLocalStatus(2), onError: (e: any) => { if (!e?.response || e.code === 'ERR_NETWORK') { updateLocalStatus(2); Toast.show({ type: 'success', text1: 'Guardado offline', text2: 'Se sincronizará automáticamente' }); } } }))}
            disabled={anyLoading}
            activeOpacity={0.8}
            accessibilityLabel="Confirmar Pedido"
            accessibilityRole="button"
          >
            <CheckCircle size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Confirmar Pedido</Text>
          </TouchableOpacity>
        );
      case 2: // Confirmado → En Ruta
        return (
          <TouchableOpacity
            testID="btn-en-ruta"
            style={[styles.actionBtn, { backgroundColor: '#ea580c' }]}
            onPress={() => handleTransition('Poner en Ruta', '¿Enviar a ruta de entrega?', () => enRutaMutation.mutate(serverId, { onSuccess: () => updateLocalStatus(4), onError: (e: any) => { if (!e?.response || e.code === 'ERR_NETWORK') { updateLocalStatus(4); Toast.show({ type: 'success', text1: 'Guardado offline', text2: 'Se sincronizará automáticamente' }); } } }))}
            disabled={anyLoading}
            activeOpacity={0.8}
            accessibilityLabel="Poner en Ruta"
            accessibilityRole="button"
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
              accessibilityLabel="Notas de entrega"
            />
            <TouchableOpacity
              testID="btn-entregar"
              style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
              onPress={() => handleTransition('Marcar Entregado', '¿Confirmar entrega del pedido?', () => entregarMutation.mutate({ id: serverId, notasEntrega }, { onSuccess: () => updateLocalStatus(5), onError: (e: any) => { if (!e?.response || e.code === 'ERR_NETWORK') { updateLocalStatus(5); Toast.show({ type: 'success', text1: 'Guardado offline', text2: 'Se sincronizará automáticamente' }); } } }))}
              disabled={anyLoading}
              activeOpacity={0.8}
              accessibilityLabel="Marcar Entregado"
              accessibilityRole="button"
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Marcar Entregado</Text>
            </TouchableOpacity>
          </View>
        );
      case 5: // Entregado → opción de Facturar (si país lo soporta)
        if (!canFacturar) return null;
        return (
          <TouchableOpacity
            testID="btn-facturar"
            style={[styles.actionBtn, { backgroundColor: COLORS.button }]}
            onPress={() => setShowFacturarModal(true)}
            disabled={crearFacturaMutation.isPending}
            activeOpacity={0.8}
            accessibilityLabel="Facturar pedido"
            accessibilityRole="button"
          >
            <FileText size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Facturar</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Blue Header — back + title + badge */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>
          {order.numeroPedido ? `Pedido #${order.numeroPedido}` : `Pedido #${order.serverId || order.id.slice(0, 6)}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: estadoColor.bg }]}>
          <Text style={[styles.statusText, { color: estadoColor.text }]}>{estadoColor.label}</Text>
        </View>
      </View>

      {/* Client & Date Info */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.clientSection}>
          <Text style={styles.clientName}>{clienteNombre}</Text>
          <Text style={styles.dateText}>{formatDateTime(order.fechaPedido || order.createdAt)}</Text>
        </View>
      </Animated.View>

      {/* Stepper Timeline */}
      {estado !== 6 && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.stepper}>
          {STEPPER_STATES.map((s, i) => {
            const normalized = normalizeEstado(estado);
            const isActive = s === normalized;
            const isPast = s < normalized;
            const isLastStep = i === STEPPER_STATES.length - 1;
            const isCompleted = isPast || (isActive && isLastStep);
            const dotColor = isCompleted ? '#16a34a' : isActive ? COLORS.button : isPast ? '#16a34a' : '#e2e8f0';
            const lineColor = (isPast || isActive) ? '#16a34a' : '#e2e8f0';
            return (
              <View key={s} style={styles.stepItem}>
                <View style={styles.stepDotRow}>
                  {i > 0 && <View style={[styles.stepLine, { backgroundColor: lineColor }]} />}
                  <View style={[styles.stepDot, { backgroundColor: dotColor }]}>
                    {isCompleted && <CheckCircle size={10} color="#fff" />}
                    {isActive && !isLastStep && <ArrowRight size={10} color="#fff" />}
                  </View>
                  {i < STEPPER_STATES.length - 1 && <View style={[styles.stepLine, { backgroundColor: s < normalized ? '#16a34a' : '#e2e8f0' }]} />}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isCompleted && styles.stepLabelPast]}>{STEPPER_LABELS[i]}</Text>
              </View>
            );
          })}
        </Animated.View>
      )}

      {estado === 6 && (
        <View style={styles.cancelledBanner}>
          <XCircle size={16} color="#dc2626" />
          <Text style={styles.cancelledText}>Pedido cancelado</Text>
        </View>
      )}

      {/* Productos */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <Text style={styles.sectionLabel}>Productos</Text>
        <View style={styles.productsCard}>
          {detalles?.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineItemContent}>
                <Text style={styles.productName}>{item.productoNombre}</Text>
                <Text style={styles.productQty}>{item.cantidad} x {formatCurrency(item.precioUnitario)}</Text>
              </View>
              <Text style={styles.lineTotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Totals */}
      <Animated.View entering={FadeInDown.duration(400).delay(400)}>
        <View style={styles.totalsCard}>
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
            <Text style={styles.totalLabel}>IVA (16%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.impuesto)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>
      </Animated.View>

      {order.notas && (
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <Text style={styles.sectionLabel}>Notas</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{order.notas}</Text>
          </View>
        </Animated.View>
      )}

      {/* Action Buttons */}
      <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.actions}>
        {renderActionButton()}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelar}
            disabled={cancelarMutation.isPending}
            activeOpacity={0.8}
            accessibilityLabel="Cancelar Pedido"
            accessibilityRole="button"
          >
            <Text style={styles.cancelBtnText}>Cancelar Pedido</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={() => {
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          confirmModal.onConfirm();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        destructive={confirmModal.destructive}
        icon={confirmModal.icon}
      />

      <DatosFiscalesModal
        visible={showFacturarModal}
        onConfirm={handleFacturar}
        onCancel={() => setShowFacturarModal(false)}
        loading={crearFacturaMutation.isPending}
        initialRfc={cliente?.rfcFiscal || cliente?.rfc || ''}
        initialNombre={cliente?.razonSocial || cliente?.nombre || ''}
        initialRegimen={cliente?.regimenFiscal || ''}
        initialUsoCfdi={cliente?.usoCfdi || 'G03'}
        initialCp={cliente?.cpFiscal || ''}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  // Header
  blueHeader: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  blueHeaderTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  // Client section
  clientSection: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 4,
  },
  clientName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  dateText: { fontSize: 12, color: COLORS.textTertiary },
  // Stepper
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, height: 3, borderRadius: 2 },
  stepLabel: { fontSize: 10, color: '#cbd5e1', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  stepLabelActive: { color: COLORS.headerBg, fontWeight: '700' },
  stepLabelPast: { color: '#16a34a' },
  // Cancelled
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.destructiveLight, paddingVertical: 12 },
  cancelledText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  // Products
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  productsCard: {
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
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lineItemContent: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  productQty: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen },
  // Totals
  totalsCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 13, color: COLORS.foreground, fontWeight: '500' },
  discountValue: { fontSize: 13, color: '#16a34a', fontWeight: '500' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.foreground },
  grandTotalValue: { fontSize: 16, fontWeight: '800', color: COLORS.salesGreen },
  // Notes
  notesCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  // Actions
  actions: { paddingHorizontal: 20, gap: 10, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cancelBtn: {
    backgroundColor: COLORS.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  notasInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14, color: '#1e293b', minHeight: 60, textAlignVertical: 'top' },
});
