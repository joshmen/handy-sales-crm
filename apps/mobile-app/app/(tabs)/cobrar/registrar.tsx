import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores';
import { useOfflineClientById } from '@/hooks';
import { createCobroOffline } from '@/db/actions';
import { capturePhoto, saveAttachmentRecord } from '@/services/evidenceManager';
import { performSync } from '@/sync/syncEngine';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import {
  Banknote,
  ArrowRightLeft,
  FileText,
  CreditCard,
  MoreHorizontal,
  User,
  Check,
  Camera,
  X,
} from 'lucide-react-native';

const METODO_ICONS: Record<number, React.ReactNode> = {
  0: <Banknote size={20} color="#16a34a" />,
  1: <ArrowRightLeft size={20} color="#2563eb" />,
  2: <FileText size={20} color="#7c3aed" />,
  3: <CreditCard size={20} color="#d97706" />,
  4: <CreditCard size={20} color="#0891b2" />,
  5: <MoreHorizontal size={20} color="#64748b" />,
};

export default function RegistrarCobroScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    clienteId: string;
    clienteNombre: string;
    saldo: string;
  }>();

  const clienteId = params.clienteId || '';
  const clienteNombre = decodeURIComponent(params.clienteNombre || '');
  const saldoPendiente = Number(params.saldo || 0);

  const { data: cliente } = useOfflineClientById(clienteId);

  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState(0);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const montoNum = parseFloat(monto) || 0;
  const isValid = montoNum > 0 && !!clienteId;

  const handleConfirmar = () => {
    if (!isValid) return;

    Alert.alert(
      'Confirmar Cobro',
      `Registrar cobro de ${formatCurrency(montoNum)} para ${clienteNombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSending(true);
            try {
              const cobro = await createCobroOffline(
                clienteId,
                cliente?.serverId ?? null,
                user?.id ? Number(user.id) : 0,
                montoNum,
                metodoPago,
                referencia || undefined,
                notas || undefined
              );

              // Save receipt photo attachment
              if (receiptPhoto) {
                await saveAttachmentRecord({
                  eventType: 'cobro',
                  eventLocalId: cobro.id,
                  tipo: 'receipt',
                  localUri: receiptPhoto,
                });
              }

              performSync().catch(() => {});
              Alert.alert('Cobro Registrado', 'El cobro se registró exitosamente', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert('Error', 'No se pudo registrar el cobro');
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        <View style={styles.clientCard}>
          <View style={styles.clientAvatar}>
            <User size={20} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.clientName}>{clienteNombre}</Text>
            {saldoPendiente > 0 && (
              <Text style={styles.saldoText}>
                Saldo pendiente: {formatCurrency(saldoPendiente)}
              </Text>
            )}
          </View>
        </View>

        {/* Monto */}
        <View style={styles.montoSection}>
          <Text style={styles.montoLabel}>Monto a Cobrar</Text>
          <View style={styles.montoInputRow}>
            <Text style={styles.montoPrefix}>$</Text>
            <TextInput
              style={styles.montoInput}
              placeholder="0.00"
              placeholderTextColor="#cbd5e1"
              keyboardType="decimal-pad"
              value={monto}
              onChangeText={setMonto}
            />
          </View>
        </View>

        {/* Método de Pago */}
        <Text style={styles.sectionLabel}>Método de Pago</Text>
        <View style={styles.metodosGrid}>
          {Object.entries(METODO_PAGO).map(([key, label]) => {
            const keyNum = Number(key);
            const isSelected = metodoPago === keyNum;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.metodoCard, isSelected && styles.metodoCardSelected]}
                onPress={() => setMetodoPago(keyNum)}
                activeOpacity={0.7}
              >
                {METODO_ICONS[keyNum]}
                <Text style={[styles.metodoLabel, isSelected && styles.metodoLabelSelected]}>
                  {label}
                </Text>
                {isSelected && (
                  <View style={styles.metodoCheck}>
                    <Check size={12} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Referencia */}
        <Text style={styles.sectionLabel}>Referencia (opcional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="No. de transferencia, cheque, etc."
          placeholderTextColor="#94a3b8"
          value={referencia}
          onChangeText={setReferencia}
        />

        {/* Notas */}
        <Text style={styles.sectionLabel}>Notas (opcional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Observaciones adicionales"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={notas}
          onChangeText={setNotas}
          textAlignVertical="top"
        />

        {/* Receipt Photo */}
        <Text style={styles.sectionLabel}>Comprobante (opcional)</Text>
        {receiptPhoto ? (
          <View style={styles.receiptPreview}>
            <Image source={{ uri: receiptPhoto }} style={styles.receiptImage} />
            <TouchableOpacity
              style={styles.receiptRemove}
              onPress={() => setReceiptPhoto(null)}
            >
              <X size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.receiptBtn}
            onPress={async () => {
              const uri = await capturePhoto();
              if (uri) setReceiptPhoto(uri);
            }}
            activeOpacity={0.7}
          >
            <Camera size={24} color="#2563eb" />
            <Text style={styles.receiptBtnText}>Tomar foto del comprobante</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <Button
          title={`Confirmar Cobro · ${formatCurrency(montoNum)}`}
          onPress={handleConfirmar}
          disabled={!isValid}
          loading={sending}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 100 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  saldoText: { fontSize: 13, color: '#ef4444', fontWeight: '500', marginTop: 2 },
  montoSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  montoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 12 },
  montoInputRow: { flexDirection: 'row', alignItems: 'center' },
  montoPrefix: { fontSize: 32, fontWeight: '300', color: '#94a3b8', marginRight: 4 },
  montoInput: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 120,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  metodosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  metodoCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  metodoCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  metodoLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  metodoLabelSelected: { color: '#2563eb' },
  metodoCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: { minHeight: 80 },
  receiptPreview: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  receiptRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  receiptBtnText: { fontSize: 14, fontWeight: '500', color: '#2563eb' },
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
