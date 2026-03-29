import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderDraftStore } from '@/stores';
import { useAuthStore } from '@/stores';
import { createPedidoOffline, createVentaDirectaOffline } from '@/db/actions';
import { database } from '@/db/database';
import RutaDetalle from '@/db/models/RutaDetalle';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { Card, Button, ConfirmModal } from '@/components/ui';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { COLORS } from '@/theme/colors';
import { formatCurrency } from '@/utils/format';
import { User, Package, Send, Zap, Banknote, Building2, FileText, CreditCard, Wallet, MoreHorizontal } from 'lucide-react-native';
import { SbOrders } from '@/components/icons/DashboardIcons';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

const METODO_PAGO_OPTIONS = [
  { value: 0, label: 'Efectivo', icon: Banknote },
  { value: 1, label: 'Transferencia', icon: Building2 },
  { value: 2, label: 'Cheque', icon: FileText },
  { value: 3, label: 'T. Crédito', icon: CreditCard },
  { value: 4, label: 'T. Débito', icon: Wallet },
  { value: 5, label: 'Otro', icon: MoreHorizontal },
];

export default function CrearPedidoStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const [sending, setSending] = useState(false);
  const [showConfirmPedido, setShowConfirmPedido] = useState(false);

  const {
    clienteId,
    clienteServerId,
    clienteNombre,
    items,
    notas,
    tipoVenta,
    metodoPago,
    updateQuantity,
    removeItem,
    setNotas,
    setMetodoPago,
    subtotal,
    impuestos,
    total,
    reset,
  } = useOrderDraftStore();

  const isDirecta = tipoVenta === 1;

  const handleEnviar = () => {
    if (!clienteId || items.length === 0) return;
    setShowConfirmPedido(true);
  };

  const executeEnviarPedido = async () => {
    setShowConfirmPedido(false);
    setSending(true);
    try {
      const mappedItems = items.map((item) => ({
        productoId: item.productoId,
        productoServerId: item.productoServerId,
        productoNombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      }));

      if (isDirecta) {
        const montoTotal = total();
        const metodo = metodoPago ?? 0;
        const nombre = clienteNombre || 'Cliente';
        const { pedido } = await createVentaDirectaOffline(
          clienteId || '',
          clienteServerId,
          user?.id ? Number(user.id) : 0,
          mappedItems,
          metodo,
          montoTotal,
          undefined,
          notas || undefined
        );
        // Mark parada as completed if this came from a route stop (WDB sync pushes to server)
        const paradaId = useOrderDraftStore.getState().fromParadaId;
        if (paradaId) {
          try {
            // database imported at top
            const stopRecord = await database.get<RutaDetalle>('ruta_detalles').find(paradaId);
            if (stopRecord) await stopRecord.depart();
          } catch { /* ignore */ }
        }

        // Navigate to cobro receipt for printing (VD = sale + immediate payment)
        router.replace({
          pathname: '/(tabs)/cobrar/recibo',
          params: {
            clienteNombre: encodeURIComponent(nombre),
            monto: String(montoTotal),
            metodoPago: String(metodo),
            referencia: encodeURIComponent(pedido.id.slice(0, 8)),
            notas: encodeURIComponent(notas || ''),
            fecha: new Date().toISOString(),
            fromVentaDirecta: '1',
            fromEntrega: paradaId ? '1' : '',
            pedidoId: pedido.id,
          },
        } as any);
        reset();
        // WDB sync will push pedido to server automatically via withChangesForTables
      } else {
        const pedido = await createPedidoOffline(
          clienteId || '',
          clienteServerId,
          user?.id ? Number(user.id) : 0,
          mappedItems,
          notas || undefined,
          0, // tipoVenta = Preventa
          2  // estado = Confirmado (simplified flow: skip Enviado)
        );
        // Mark parada as completed if this came from a route stop
        const paradaId = useOrderDraftStore.getState().fromParadaId;
        if (paradaId) {
          try {
            // database imported at top
            const stopRecord = await database.get<RutaDetalle>('ruta_detalles').find(paradaId);
            if (stopRecord) await stopRecord.depart();
          } catch { /* ignore */ }
        }
        router.replace(`/(tabs)/vender/crear/exito?numero=${pedido.id.slice(0, 8)}&id=${pedido.id}${paradaId ? '&fromRuta=1' : ''}` as any);
        reset();
        // WDB sync will push pedido + ruta_detalle to server automatically
      }
    } catch {
      Alert.alert('Error', 'No se pudo crear el pedido. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.blueHeaderTitle}>Revisar Pedido</Text>
      </View>
      <ProgressSteps steps={STEPS} currentStep={2} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client */}
        <Card className="mx-4 mb-3">
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <User size={18} color={COLORS.textTertiary} />
            </View>
            <View>
              <Text style={styles.clientLabel}>Cliente</Text>
              <Text style={styles.clientName}>{clienteNombre}</Text>
            </View>
          </View>
        </Card>

        {/* Products */}
        <View style={styles.sectionHeader}>
          <Package size={16} color={COLORS.textTertiary} />
          <Text style={styles.sectionTitle}>Productos ({items.length})</Text>
        </View>

        {items.map((item) => (
          <View key={item.productoId} style={styles.lineItem}>
            <View style={styles.lineContent}>
              <Text style={styles.lineName} numberOfLines={1}>{item.nombre}</Text>
              <Text style={styles.linePrice}>
                {formatCurrency(item.precioUnitario)} c/u
              </Text>
            </View>
            <QuantityStepper
              value={item.cantidad}
              onChange={(val) => {
                if (val <= 0) removeItem(item.productoId);
                else updateQuantity(item.productoId, val);
              }}
            />
            <Text style={styles.lineTotal}>
              {formatCurrency(item.precioUnitario * item.cantidad)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <Card className="mx-4 mt-3 mb-3">
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA (16%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(impuestos())}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total())}</Text>
          </View>
        </Card>

        {/* Payment Method (Venta Directa only) */}
        {isDirecta && (
          <Card className="mx-4 mb-3">
            <Text style={styles.paymentLabel}>Método de Pago</Text>
            <View style={styles.paymentGrid}>
              {METODO_PAGO_OPTIONS.map((option) => {
                const isSelected = metodoPago === option.value;
                const Icon = option.icon;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.paymentOption,
                      isSelected && styles.paymentOptionSelected,
                    ]}
                    onPress={() => setMetodoPago(option.value)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      size={20}
                      color={isSelected ? '#16a34a' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        isSelected && styles.paymentOptionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Notes */}
        <Card className="mx-4 mb-4">
          <Text style={styles.notesLabel}>Notas (opcional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Instrucciones especiales, dirección, etc."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            value={notas}
            onChangeText={setNotas}
            textAlignVertical="top"
          />
        </Card>
      </ScrollView>

      {/* Send Button */}
      <View style={styles.footer}>
        <Button
          title={sending ? 'Procesando...' : isDirecta ? 'Cobrar y Entregar' : 'Levantar Pedido'}
          onPress={handleEnviar}
          loading={sending}
          disabled={items.length === 0 || sending}
          fullWidth
          icon={!sending ? (isDirecta
            ? <Zap size={18} color="#ffffff" />
            : <Send size={18} color="#ffffff" />
          ) : undefined}
        />
      </View>

      <ConfirmModal
        visible={showConfirmPedido}
        title={isDirecta ? 'Venta Directa' : 'Levantar Pedido'}
        message={isDirecta
          ? `¿Confirmar venta directa para ${clienteNombre}?\n\nTotal: ${formatCurrency(total())}`
          : `¿Confirmar pedido para ${clienteNombre}?\n\nTotal: ${formatCurrency(total())}`}
        confirmText={isDirecta ? 'Cobrar' : 'Enviar'}
        onConfirm={executeEnviarPedido}
        onCancel={() => setShowConfirmPedido(false)}
        icon={<SbOrders size={48} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' as const },
  blueHeaderTitle: { fontSize: 20, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const },
  content: { paddingTop: 12, paddingBottom: 100 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  lineContent: { flex: 1, marginRight: 8 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  linePrice: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen, marginLeft: 10, minWidth: 70, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: { fontSize: 13, color: '#94a3b8' },
  totalValue: { fontSize: 13, color: '#475569', fontWeight: '500' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.foreground },
  grandTotalValue: { fontSize: 16, fontWeight: '800', color: COLORS.salesGreen },
  paymentLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  paymentOptionSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentOptionTextSelected: {
    color: '#16a34a',
  },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});
