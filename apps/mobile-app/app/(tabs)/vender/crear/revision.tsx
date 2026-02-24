import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrderDraftStore } from '@/stores';
import { useAuthStore } from '@/stores';
import { createPedidoOffline } from '@/db/actions';
import { performSync } from '@/sync/syncEngine';
import { ProgressSteps } from '@/components/shared/ProgressSteps';
import { Card, Button } from '@/components/ui';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { formatCurrency } from '@/utils/format';
import { User, Package, Send } from 'lucide-react-native';

const STEPS = ['Cliente', 'Productos', 'Revisar'];

export default function CrearPedidoStep3() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sending, setSending] = useState(false);

  const {
    clienteId,
    clienteServerId,
    clienteNombre,
    items,
    notas,
    updateQuantity,
    removeItem,
    setNotas,
    subtotal,
    impuestos,
    total,
    reset,
  } = useOrderDraftStore();

  const handleEnviar = () => {
    if (!clienteId || items.length === 0) return;

    Alert.alert(
      'Enviar Pedido',
      `¿Confirmar pedido para ${clienteNombre}?\n\nTotal: ${formatCurrency(total())}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setSending(true);
            try {
              const pedido = await createPedidoOffline(
                clienteId,
                clienteServerId,
                user?.id ? Number(user.id) : 0,
                items.map((item) => ({
                  productoId: item.productoId,
                  productoServerId: item.productoServerId,
                  productoNombre: item.nombre,
                  cantidad: item.cantidad,
                  precioUnitario: item.precioUnitario,
                })),
                notas || undefined
              );
              reset();
              // Try to sync immediately if online
              performSync().catch(() => {});
              router.replace(`/(tabs)/vender/crear/exito?numero=${pedido.id.slice(0, 8)}&id=${pedido.id}` as any);
            } catch {
              Alert.alert('Error', 'No se pudo crear el pedido. Intenta de nuevo.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ProgressSteps steps={STEPS} currentStep={2} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client */}
        <Card className="mx-4 mb-3">
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <User size={18} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.clientLabel}>Cliente</Text>
              <Text style={styles.clientName}>{clienteNombre}</Text>
            </View>
          </View>
        </Card>

        {/* Products */}
        <View style={styles.sectionHeader}>
          <Package size={16} color="#2563eb" />
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
          title="Enviar Pedido"
          onPress={handleEnviar}
          loading={sending}
          disabled={items.length === 0}
          fullWidth
          icon={<Send size={18} color="#ffffff" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingTop: 12, paddingBottom: 100 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
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
  lineTotal: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginLeft: 10, minWidth: 70, textAlign: 'right' },
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
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  grandTotalValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
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
