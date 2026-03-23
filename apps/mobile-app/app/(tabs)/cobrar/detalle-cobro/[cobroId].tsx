import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { useOfflineCobroById, useClientNameMap } from '@/hooks';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import { ChevronLeft, Printer, Share2 } from 'lucide-react-native';
import { usePrinterStore } from '@/stores/printerStore';
import { printReceipt, isNativeAvailable } from '@/services/printerService';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useState } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';

export default function DetalleCobroScreen() {
  const insets = useSafeAreaInsets();
  const { cobroId } = useLocalSearchParams<{ cobroId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: cobro } = useOfflineCobroById(cobroId);
  const clientNames = useClientNameMap();
  const { data: empresa } = useEmpresa();
  const { connectedDevice } = usePrinterStore();
  const printerAvailable = isNativeAvailable() && !!connectedDevice;
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!cobro) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de Cobro</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  const clienteNombre = clientNames.get(cobro.clienteId) || 'Cliente';
  const metodoLabel = METODO_PAGO[cobro.metodoPago] || 'Otro';

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printReceipt({
        companyName: empresa?.razonSocial || user?.tenantName || 'Handy Suites',
        empresa: empresa ? {
          rfc: empresa.rfc,
          direccion: empresa.direccion,
          ciudad: empresa.ciudad,
          estado: empresa.estado,
          codigoPostal: empresa.codigoPostal,
          telefono: empresa.telefono,
        } : undefined,
        clienteNombre,
        monto: cobro.monto,
        metodoPago: cobro.metodoPago,
        referencia: cobro.referencia || '',
        notas: cobro.notas || '',
        fecha: cobro.createdAt.toISOString(),
        vendedorName: user?.name || 'Vendedor',
        logoUri: empresa?.logoUrl || user?.tenantLogo || undefined,
      });
    } catch {
      // silent
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      // Generate a simple text to share
      const text = `Recibo de Cobro\nCliente: ${clienteNombre}\nMonto: ${formatCurrency(cobro.monto)}\nMétodo: ${metodoLabel}\nFecha: ${formatDateTime(cobro.createdAt.toISOString())}\n${cobro.referencia ? `Ref: ${cobro.referencia}\n` : ''}`;
      await Sharing.shareAsync('data:text/plain;base64,' + btoa(unescape(encodeURIComponent(text))), {
        mimeType: 'text/plain',
        dialogTitle: 'Compartir recibo',
      });
    } catch {
      // silent
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Cobro</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Client Row */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.clientRow}>
            <View style={styles.clientInitial}>
              <Text style={styles.clientInitialText}>{clienteNombre.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>{clienteNombre}</Text>
              <Text style={styles.clientDate}>{formatDateTime(cobro.createdAt.toISOString())}</Text>
            </View>
            <View style={styles.clientAmount}>
              <Text style={styles.amountValue}>{formatCurrency(cobro.monto)}</Text>
              <Text style={styles.amountMethod}>{metodoLabel}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Details Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <Text style={styles.sectionLabel}>DETALLES</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monto</Text>
              <Text style={[styles.detailValue, { color: COLORS.salesGreen }]}>{formatCurrency(cobro.monto)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Método de Pago</Text>
              <Text style={styles.detailValue}>{metodoLabel}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Referencia</Text>
              <Text style={cobro.referencia ? styles.detailValue : styles.detailEmpty}>
                {cobro.referencia || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vendedor</Text>
              <Text style={styles.detailValue}>{user?.name || 'Vendedor'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Notes */}
        {cobro.notas ? (
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <Text style={styles.sectionLabel}>NOTAS</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{cobro.notas}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Action Buttons — always show both */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <View style={styles.btnsRow}>
            <TouchableOpacity
              style={styles.btnPrint}
              onPress={handlePrint}
              disabled={printing}
              activeOpacity={0.8}
            >
              <Printer size={18} color="#ffffff" />
              <Text style={styles.btnPrintText}>
                {printing ? 'Imprimiendo...' : 'Reimprimir'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnShare}
              onPress={handleShare}
              disabled={sharing}
              activeOpacity={0.8}
            >
              <Share2 size={18} color="#64748b" />
              <Text style={styles.btnShareText}>
                {sharing ? 'Compartiendo...' : 'Compartir'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: COLORS.textTertiary },
  scrollContent: { paddingBottom: 32 },

  // Client row
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clientInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitialText: { fontSize: 16, fontWeight: '700', color: COLORS.headerText },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  clientDate: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  clientAmount: { alignItems: 'flex-end' },
  amountValue: { fontSize: 18, fontWeight: '800', color: COLORS.salesGreen },
  amountMethod: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 20,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },
  detailEmpty: { fontSize: 13, color: '#cbd5e1' },
  notesText: { fontSize: 13, color: '#475569', lineHeight: 20 },

  // Buttons
  btnsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  btnPrint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: COLORS.headerBg,
    borderRadius: 12,
  },
  btnPrintText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnShareText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
});
