import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import { Button } from '@/components/ui';
import { usePrinterStore } from '@/stores/printerStore';
import { printReceipt, isNativeAvailable } from '@/services/printerService';
import {
  CheckCircle,
  User,
  Calendar,
  Banknote,
  FileText,
  Share2,
  Printer,
} from 'lucide-react-native';

export default function ReciboScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    clienteNombre: string;
    monto: string;
    metodoPago: string;
    referencia: string;
    notas: string;
    fecha: string;
  }>();

  const clienteNombre = decodeURIComponent(params.clienteNombre || '');
  const monto = parseFloat(params.monto || '0');
  const metodoPago = parseInt(params.metodoPago || '0', 10);
  const referencia = decodeURIComponent(params.referencia || '');
  const notas = decodeURIComponent(params.notas || '');
  const fecha = params.fecha || new Date().toISOString();

  const receiptRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { connectedDevice } = usePrinterStore();
  const printerAvailable = isNativeAvailable() && !!connectedDevice;

  const handleShare = async () => {
    if (!receiptRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartir recibo de cobro',
        });
      }
    } catch (e) {
      console.warn('[Recibo] Share failed:', e);
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const ok = await printReceipt({
        companyName: user?.tenantName || 'Handy Suites',
        clienteNombre,
        monto,
        metodoPago,
        referencia,
        notas,
        fecha,
        vendedorName: user?.name || 'Vendedor',
        logoUri: user?.tenantLogo || undefined,
      });
      if (!ok) {
        const { Alert } = require('react-native');
        Alert.alert('Error', 'No se pudo imprimir. Verifica la conexión de la impresora.');
      }
    } catch {
      const { Alert } = require('react-native');
      Alert.alert('Error', 'Error al imprimir');
    } finally {
      setPrinting(false);
    }
  };

  const handleDone = () => {
    // Replace to prevent back-navigation into payment form
    router.replace('/(tabs)/cobrar' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <CheckCircle size={48} color="#16a34a" />
          </View>
          <Text style={styles.successTitle}>Cobro Registrado</Text>
          <Text style={styles.successSubtitle}>El cobro se guardó exitosamente</Text>
        </View>

        {/* Receipt Card (capturable) */}
        <View ref={receiptRef} collapsable={false} style={styles.receiptCard}>
          {/* Company Header */}
          <View style={styles.receiptHeader}>
            <Text style={styles.companyName}>{user?.tenantName || 'Handy Suites'}</Text>
            <Text style={styles.receiptLabel}>RECIBO DE COBRO</Text>
          </View>

          <View style={styles.divider} />

          {/* Client */}
          <View style={styles.receiptRow}>
            <View style={styles.receiptRowIcon}>
              <User size={14} color="#64748b" />
            </View>
            <View style={styles.receiptRowContent}>
              <Text style={styles.receiptRowLabel}>Cliente</Text>
              <Text style={styles.receiptRowValue}>{clienteNombre}</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Monto cobrado</Text>
            <Text style={styles.amountValue}>{formatCurrency(monto)}</Text>
          </View>

          {/* Date */}
          <View style={styles.receiptRow}>
            <View style={styles.receiptRowIcon}>
              <Calendar size={14} color="#64748b" />
            </View>
            <View style={styles.receiptRowContent}>
              <Text style={styles.receiptRowLabel}>Fecha</Text>
              <Text style={styles.receiptRowValue}>{formatDateTime(fecha)}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.receiptRow}>
            <View style={styles.receiptRowIcon}>
              <Banknote size={14} color="#64748b" />
            </View>
            <View style={styles.receiptRowContent}>
              <Text style={styles.receiptRowLabel}>Método de pago</Text>
              <Text style={styles.receiptRowValue}>
                {METODO_PAGO[metodoPago] || 'Otro'}
              </Text>
            </View>
          </View>

          {/* Reference (if any) */}
          {referencia ? (
            <View style={styles.receiptRow}>
              <View style={styles.receiptRowIcon}>
                <FileText size={14} color="#64748b" />
              </View>
              <View style={styles.receiptRowContent}>
                <Text style={styles.receiptRowLabel}>Referencia</Text>
                <Text style={styles.receiptRowValue}>{referencia}</Text>
              </View>
            </View>
          ) : null}

          {/* Notes (if any) */}
          {notas ? (
            <View style={styles.notesRow}>
              <Text style={styles.receiptRowLabel}>Notas</Text>
              <Text style={styles.notesText}>{notas}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Footer */}
          <View style={styles.receiptFooter}>
            <Text style={styles.vendorName}>Atendido por: {user?.name || 'Vendedor'}</Text>
            <Text style={styles.footerNote}>Gracias por su pago</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {printerAvailable ? (
            <View style={styles.actionBtn}>
              <Button
                title="Imprimir"
                onPress={handlePrint}
                loading={printing}
                variant="outline"
                fullWidth
                icon={<Printer size={16} color="#2563eb" />}
              />
            </View>
          ) : isNativeAvailable() ? (
            <View style={styles.actionBtn}>
              <Button
                title="Impresora"
                onPress={() => router.push('/(tabs)/impresora' as any)}
                variant="outline"
                fullWidth
                icon={<Printer size={16} color="#94a3b8" />}
              />
            </View>
          ) : null}
          <View style={styles.actionBtn}>
            <Button
              title="Compartir"
              onPress={handleShare}
              loading={sharing}
              variant="outline"
              fullWidth
              icon={<Share2 size={16} color="#2563eb" />}
            />
          </View>
          <View style={styles.actionBtn}>
            <Button
              title="Listo"
              onPress={handleDone}
              fullWidth
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 120 },
  successHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  receiptCard: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  receiptRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  receiptRowContent: { flex: 1 },
  receiptRowLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 2,
  },
  receiptRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  amountRow: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#16a34a',
  },
  notesRow: {
    marginBottom: 14,
    paddingLeft: 38,
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  receiptFooter: {
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    fontStyle: 'italic',
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
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: { flex: 1 },
});
