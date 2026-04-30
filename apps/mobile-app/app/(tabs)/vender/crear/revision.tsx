import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderDraftStore, useOrderSubtotal } from '@/stores';
import { useAuthStore } from '@/stores';
import { createPedidoOffline, createVentaDirectaOffline } from '@/db/actions';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { Card, Button, ConfirmModal } from '@/components/ui';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { COLORS } from '@/theme/colors';
import { useTenantLocale } from '@/hooks';
import { round2 } from '@/utils/money';
import { calculateLineAmounts } from '@/utils/lineAmountCalculator';
import { useOfflineProducts } from '@/hooks';
import { User, Package, Send, Zap, Banknote, Building2, FileText, CreditCard, Wallet, MoreHorizontal, ChevronLeft } from 'lucide-react-native';
import { SbOrders } from '@/components/icons/DashboardIcons';
import { usePricingMap } from '@/hooks/usePricing';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

const METODO_PAGO_OPTIONS = [
  { value: 0, label: 'Efectivo', icon: Banknote },
  { value: 1, label: 'Transferencia', icon: Building2 },
  { value: 2, label: 'Cheque', icon: FileText },
  { value: 3, label: 'T. Crédito', icon: CreditCard },
  { value: 4, label: 'T. Débito', icon: Wallet },
  { value: 5, label: 'Otro', icon: MoreHorizontal },
];

function CrearPedidoStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { money: formatCurrency } = useTenantLocale();
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
    reset,
  } = useOrderDraftStore();

  const subtotalRaw = useOrderSubtotal();

  const isDirecta = tipoVenta === 1;
  const clienteListaPreciosId = useOrderDraftStore(s => s.clienteListaPreciosId);
  const { getPricing } = usePricingMap(clienteListaPreciosId);
  const hasSpecialPricing = !!clienteListaPreciosId;

  // Productos del WDB para resolver `precioIncluyeIva` y `tasa` per item.
  // Los productos vienen del último sync — read-only en mobile.
  const { data: allProducts } = useOfflineProducts();
  const productByServerId = useMemo(() => {
    const map = new Map<number, { precioIncluyeIva: boolean; tasa: number }>();
    for (const p of allProducts ?? []) {
      if (p.serverId != null) {
        map.set(p.serverId, {
          precioIncluyeIva: p.precioIncluyeIva ?? true,
          tasa: p.tasa ?? 0.16,
        });
      }
    }
    return map;
  }, [allProducts]);

  // Aplicar descuentos por cantidad + promociones por línea, con cálculo IVA
  // branched per item (v16 — catálogo de impuestos). Cada item resuelve su tasa
  // y flag precioIncluyeIva desde el producto en WDB; fallback a IVA 16% incluido.
  const pricedItems = useMemo(() =>
    items.map((item) => {
      const pricing = getPricing(item.productoServerId ?? 0, item.precioUnitario, item.cantidad);
      const prodTax = productByServerId.get(item.productoServerId ?? 0) ?? { precioIncluyeIva: true, tasa: 0.16 };
      const descuentoLinea = round2((item.precioUnitario - pricing.precioConDescuento) * item.cantidad);
      // El precioConDescuento es el que se cobra al cliente. Si precioIncluyeIva,
      // ese ya tiene IVA; descomponemos. Si no, le sumamos IVA.
      const lineAmounts = calculateLineAmounts(
        pricing.precioConDescuento,
        item.cantidad,
        0, // descuento ya aplicado en precioConDescuento
        prodTax.tasa,
        prodTax.precioIncluyeIva,
      );
      return { item, pricing, lineAmounts, descuentoLinea };
    }),
    [items, getPricing, productByServerId],
  );

  // Sumar redondeando cada línea (consistente con backend). Sin round2 per-item,
  // float drift produce totales off-by-cent.
  const subtotal = round2(pricedItems.reduce((s, p) => s + p.lineAmounts.subtotal, 0));
  const impuestos = round2(pricedItems.reduce((s, p) => s + p.lineAmounts.impuesto, 0));
  const total = round2(pricedItems.reduce((s, p) => s + p.lineAmounts.total, 0));
  const descuentoTotal = round2(subtotalRaw - pricedItems.reduce((s, p) => s + p.pricing.precioConDescuento * p.item.cantidad, 0));

  const handleEnviar = () => {
    if (!clienteId || items.length === 0) return;
    setShowConfirmPedido(true);
  };

  const executeEnviarPedido = async () => {
    setShowConfirmPedido(false);
    setSending(true);
    try {
      // Backend re-valida precio_unitario contra Producto.PrecioBase por seguridad,
      // así que enviamos el precio base + descuento por separado (no precio descontado).
      const mappedItems = pricedItems.map(({ item, pricing }) => {
        // round2 antes de mandar al backend: el server compara con su propio
        // cálculo y rechaza con error "monto no coincide" si hay drift.
        const descuentoLinea = round2((item.precioUnitario - pricing.precioConDescuento) * item.cantidad);
        const prodTax = productByServerId.get(item.productoServerId ?? 0) ?? {
          precioIncluyeIva: true,
          tasa: 0.16,
        };
        return {
          productoId: item.productoId,
          productoServerId: item.productoServerId,
          productoNombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: descuentoLinea > 0 ? descuentoLinea : 0,
          // v16: pasar tax info per-item para que el cálculo offline en
          // createPedidoOffline / createVentaDirectaOffline use el branched.
          precioIncluyeIva: prodTax.precioIncluyeIva,
          tasa: prodTax.tasa,
          // v18 BOGO: cantidad regalada + promo aplicada (server valida).
          cantidadBonificada: pricing.promoRegalo?.cantidadBonificada ?? 0,
          promocionId: pricing.promoRegalo?.promocionId ?? null,
        };
      });

      if (isDirecta) {
        const montoTotal = total;
        const metodo = metodoPago ?? 0;
        const nombre = clienteNombre || 'Cliente';
        const paradaId = useOrderDraftStore.getState().fromParadaId;
        // Pedido + Cobro + parada.Completada en una sola transacción WDB:
        // si cualquier paso falla, nada se persiste (evita parada colgada).
        const { pedido } = await createVentaDirectaOffline(
          clienteId || '',
          clienteServerId,
          user?.id ? Number(user.id) : 0,
          mappedItems,
          metodo,
          montoTotal,
          undefined,
          notas || undefined,
          paradaId
        );

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
        const paradaId = useOrderDraftStore.getState().fromParadaId;
        // Pedido + parada.Completada atómicos en una sola transacción WDB.
        const pedido = await createPedidoOffline(
          clienteId || '',
          clienteServerId,
          user?.id ? Number(user.id) : 0,
          mappedItems,
          notas || undefined,
          0, // tipoVenta = Preventa
          0, // estado = Borrador → admin/supervisor confirma desde web antes de meter a ruta
          paradaId
        );
        router.replace(`/(tabs)/vender/crear/exito?numero=${pedido.id.slice(0, 8)}&id=${pedido.id}${paradaId ? '&fromRuta=1' : ''}` as any);
        reset();
        // WDB sync will push pedido + ruta_detalle to server automatically
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo crear el pedido. Intenta de nuevo.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>Revisar Pedido</Text>
        <View style={{ width: 32 }} />
      </View>
      <ProgressSteps steps={STEPS} currentStep={2} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client */}
        <Card className="mx-4 mb-3">
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <User size={18} color={COLORS.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientLabel}>Cliente</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.clientName}>{clienteNombre}</Text>
                {hasSpecialPricing && (
                  <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600', backgroundColor: '#dcfce7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    Precio especial
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Products */}
        <View style={styles.sectionHeader}>
          <Package size={16} color={COLORS.textTertiary} />
          <Text style={styles.sectionTitle}>Productos ({items.length})</Text>
        </View>

        {pricedItems.map(({ item, pricing, lineAmounts }) => {
          const lineTotal = lineAmounts.total;
          const tieneDescuento = pricing.mejorDescuento > 0;
          return (
            <View key={item.productoId} style={styles.lineItem}>
              <View style={styles.lineContent}>
                <Text style={styles.lineName} numberOfLines={1}>{item.nombre}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.linePrice, (tieneDescuento || pricing.tieneListaPrecios) && { color: '#16a34a' }]}>
                    {formatCurrency(pricing.precioConDescuento)} c/u
                  </Text>
                  {tieneDescuento && (
                    <Text style={{ fontSize: 11, color: '#94a3b8', textDecorationLine: 'line-through' }}>
                      {formatCurrency(item.precioUnitario)}
                    </Text>
                  )}
                  {pricing.promo && (
                    <Text style={{ fontSize: 9, color: '#d97706', fontWeight: '600', backgroundColor: '#fef3c7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                      Promo -{pricing.promo.porcentaje}%
                    </Text>
                  )}
                  {pricing.promoRegalo && (
                    <Text style={{ fontSize: 9, color: '#92400e', fontWeight: '700', backgroundColor: '#fde68a', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                      🎁 +{pricing.promoRegalo.cantidadBonificada} regalo
                    </Text>
                  )}
                  {pricing.descuentoVolumen && (
                    <Text style={{ fontSize: 9, color: '#7c3aed', fontWeight: '600', backgroundColor: '#ede9fe', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                      Vol -{pricing.descuentoVolumen.porcentaje}%
                    </Text>
                  )}
                </View>
              </View>
              <QuantityStepper
                value={item.cantidad}
                onChange={(val) => {
                  if (val <= 0) removeItem(item.productoId);
                  else updateQuantity(item.productoId, val);
                }}
              />
              <Text style={styles.lineTotal}>
                {formatCurrency(lineTotal)}
              </Text>
            </View>
          );
        })}

        {/* Totals */}
        <Card className="mx-4 mt-3 mb-3">
          {descuentoTotal > 0.005 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal sin descuento</Text>
                <Text style={[styles.totalValue, { color: '#94a3b8', textDecorationLine: 'line-through' }]}>{formatCurrency(subtotalRaw)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#16a34a' }]}>Descuentos</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>−{formatCurrency(descuentoTotal)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA (16%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(impuestos)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
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
                    accessibilityLabel={`Método de pago: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
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
            accessibilityLabel="Notas del pedido"
          />
        </Card>
      </ScrollView>

      {/* Send Button */}
      <View style={styles.footer}>
        <Button
          title={sending ? 'Procesando...' : isDirecta ? 'Cobrar y Entregar' : 'Registrar Pedido'}
          onPress={handleEnviar}
          loading={sending}
          disabled={items.length === 0 || sending}
          fullWidth
          icon={!sending ? <Send size={18} color="#ffffff" /> : undefined}
        />
      </View>

      <ConfirmModal
        visible={showConfirmPedido}
        title={isDirecta ? 'Venta Directa' : 'Registrar Pedido'}
        message={isDirecta
          ? `¿Confirmar venta directa para ${clienteNombre}?\n\nTotal: ${formatCurrency(total)}`
          : `¿Confirmar pedido para ${clienteNombre}?\n\nTotal: ${formatCurrency(total)}`}
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
  blueHeader: { backgroundColor: COLORS.headerBg, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingBottom: 14 },
  blueHeaderTitle: { fontSize: 17, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const, flex: 1 },
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

export default withErrorBoundary(CrearPedidoStep3, 'CrearPedidoStep3');
