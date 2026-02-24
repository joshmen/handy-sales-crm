import { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores';
import { useOfflineClientById, useOfflineClients } from '@/hooks';
import { createCobroOffline } from '@/db/actions';
import { capturePhoto, saveAttachmentRecord } from '@/services/evidenceManager';
import { performSync } from '@/sync/syncEngine';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import type Cliente from '@/db/models/Cliente';
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
  Search,
  ChevronRight,
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

  const paramClienteId = params.clienteId || undefined;
  const paramClienteNombre = decodeURIComponent(params.clienteNombre || '');
  const paramSaldo = Number(params.saldo || 0);

  // Client picker state (when no clienteId passed via params)
  const [searchText, setSearchText] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: clientesSearch } = useOfflineClients(searchText);

  // Resolve the effective client (from params OR from picker)
  const effectiveClienteId = paramClienteId || selectedClient?.id;
  const effectiveClienteNombre = paramClienteId ? paramClienteNombre : (selectedClient?.nombre || '');
  const effectiveSaldo = paramClienteId ? paramSaldo : 0;

  const { data: cliente } = useOfflineClientById(effectiveClienteId);

  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState(0);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToInput = (reactNode: any) => {
    reactNode?.measureLayout?.(
      scrollRef.current as any,
      (_x: number, y: number) => {
        scrollRef.current?.scrollTo({ y: y - 80, animated: true });
      },
      () => {}
    );
  };

  const handleSelectClient = (c: Cliente) => {
    setSelectedClient(c);
    setPickerOpen(false);
    setSearchText('');
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setPickerOpen(false);
    setSearchText('');
  };

  const montoNum = parseFloat(monto) || 0;
  const isValid = montoNum > 0 && !!effectiveClienteId;

  const handleConfirmar = () => {
    if (!isValid) return;

    Alert.alert(
      'Confirmar Cobro',
      `Registrar cobro de ${formatCurrency(montoNum)} para ${effectiveClienteNombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSending(true);
            try {
              const cobro = await createCobroOffline(
                effectiveClienteId,
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
              router.replace({
                pathname: '/(tabs)/cobrar/recibo',
                params: {
                  clienteNombre: encodeURIComponent(effectiveClienteNombre),
                  monto: String(montoNum),
                  metodoPago: String(metodoPago),
                  referencia: encodeURIComponent(referencia || ''),
                  notas: encodeURIComponent(notas || ''),
                  fecha: new Date().toISOString(),
                },
              });
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
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Client Section */}
        {paramClienteId ? (
          /* Came from estado-cuenta with a pre-selected client */
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <User size={20} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{effectiveClienteNombre}</Text>
              {effectiveSaldo > 0 && (
                <Text style={styles.saldoText}>
                  Saldo pendiente: {formatCurrency(effectiveSaldo)}
                </Text>
              )}
            </View>
          </View>
        ) : selectedClient && !pickerOpen ? (
          /* Client selected from picker — show card with change button */
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <User size={20} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{selectedClient.nombre}</Text>
              {selectedClient.telefono ? (
                <Text style={styles.clientMeta}>{selectedClient.telefono}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleClearClient} style={styles.changeClientBtn}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        ) : pickerOpen ? (
          /* Picker expanded — search + list */
          <View style={styles.pickerSection}>
            <Text style={styles.sectionLabel}>Seleccionar Cliente</Text>
            <View style={styles.searchRow}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente por nombre..."
                placeholderTextColor="#94a3b8"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.clientList}>
              {(clientesSearch || []).slice(0, 10).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.clientOption}
                  onPress={() => handleSelectClient(c)}
                  activeOpacity={0.7}
                >
                  <View style={styles.clientOptionAvatar}>
                    <User size={16} color="#64748b" />
                  </View>
                  <View style={styles.clientOptionContent}>
                    <Text style={styles.clientOptionName} numberOfLines={1}>{c.nombre}</Text>
                    {c.telefono ? (
                      <Text style={styles.clientOptionMeta}>{c.telefono}</Text>
                    ) : null}
                  </View>
                  <ChevronRight size={14} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
              {clientesSearch && clientesSearch.length === 0 && (
                <Text style={styles.noResults}>
                  {searchText.length > 0 ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </Text>
              )}
            </View>
          </View>
        ) : (
          /* No client selected, picker closed — show trigger button */
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.pickerTriggerIcon}>
              <User size={18} color="#94a3b8" />
            </View>
            <Text style={styles.pickerTriggerText}>Seleccionar cliente</Text>
            <ChevronRight size={16} color="#cbd5e1" />
          </TouchableOpacity>
        )}

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
          onFocus={(e) => scrollToInput(e.target)}
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
          onFocus={(e) => scrollToInput(e.target)}
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
    </KeyboardAvoidingView>
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
  clientMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  saldoText: { fontSize: 13, color: '#ef4444', fontWeight: '500', marginTop: 2 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  pickerTriggerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTriggerText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#94a3b8' },
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
  pickerSection: { marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  clientList: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  clientOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clientOptionContent: { flex: 1 },
  clientOptionName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  clientOptionMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  noResults: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
    color: '#94a3b8',
  },
  changeClientBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
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
