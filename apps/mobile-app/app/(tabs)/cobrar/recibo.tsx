import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useRef, useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { COLORS } from '@/theme/colors';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import { usePrinterStore } from '@/stores/printerStore';
import { printReceipt, isNativeAvailable } from '@/services/printerService';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useOfflineOrderById, useOfflineOrderDetalles } from '@/hooks';
import { Share2, Printer } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function ReciboScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    clienteNombre: string;
    monto: string;
    metodoPago: string;
    referencia: string;
    notas: string;
    fecha: string;
    fromVentaDirecta?: string;
    fromEntrega?: string;
    pedidoId?: string;
    fromRuta?: string;
  }>();

  const clienteNombre = decodeURIComponent(params.clienteNombre || '');
  const monto = parseFloat(params.monto || '0');
  const metodoPago = parseInt(params.metodoPago || '0', 10);
  const referencia = decodeURIComponent(params.referencia || '');
  const notas = decodeURIComponent(params.notas || '');
  const fecha = params.fecha || new Date().toISOString();
  const isFromVD = params.fromVentaDirecta === '1';
  const pedidoId = params.pedidoId;

  const receiptRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { data: empresa } = useEmpresa();
  const { connectedDevice } = usePrinterStore();
  const printerAvailable = isNativeAvailable() && !!connectedDevice;

  const { data: order } = useOfflineOrderById(pedidoId);
  const { data: detalles } = useOfflineOrderDetalles(pedidoId || '');

  // Show toast on mount
  useEffect(() => {
    Toast.show({
      type: 'success',
      text1: isFromVD ? 'Venta Completada' : 'Cobro Registrado',
      text2: 'Guardado exitosamente',
      visibilityTime: 5000,
    });
  }, []);

  const handleShare = async () => {
    if (!receiptRef.current) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo capturar el recibo' });
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(receiptRef, { format: 'png', quality: 1 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Compartir no disponible en este dispositivo' });
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir recibo' });
    } catch (e) {
      if (__DEV__) console.warn('[Recibo] Share failed:', e);
      Toast.show({ type: 'error', text1: 'Error al compartir', text2: 'Intenta de nuevo o genera el APK para esta función' });
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const ok = await printReceipt({
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
        monto,
        metodoPago,
        referencia,
        notas,
        fecha,
        vendedorName: user?.name || 'Vendedor',
        logoUri: empresa?.logoUrl || user?.tenantLogo || undefined,
        isVentaDirecta: isFromVD,
        items: isFromVD && detalles ? detalles.map((d: any) => ({
          nombre: d.productoNombre,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        })) : undefined,
        subtotal: isFromVD && order ? order.subtotal : undefined,
        descuento: isFromVD && order ? order.descuento : undefined,
        impuesto: isFromVD && order ? order.impuesto : undefined,
      });
      if (!ok) Toast.show({ type: 'error', text1: 'Error de impresora', text2: 'Verifica la conexión' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error al imprimir' });
    } finally {
      setPrinting(false);
    }
  };

  const handleDone = () => {
    if (params.fromEntrega === '1' || params.fromRuta === '1') {
      router.replace('/(tabs)/ruta' as any);
    } else if (isFromVD) {
      router.replace('/(tabs)' as any);
    } else {
      router.replace('/(tabs)/cobrar' as any);
    }
  };

  const tipoDocumento = isFromVD ? 'NOTA DE VENTA' : 'RECIBO DE COBRO';

  return (
    <View style={styles.container}>
      {/* Blue Header — no back arrow, this is a confirmation screen */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Recibo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══ TICKET CARD ═══ */}
        <View ref={receiptRef} collapsable={false} style={styles.ticket}>

          {/* Dashed top border */}
          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Company Logo — loads from Cloudinary URL */}
          {(empresa?.logoUrl || user?.tenantLogo) ? (
            <Image
              source={{ uri: empresa?.logoUrl || user?.tenantLogo || '' }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : null}

          {/* Company Name */}
          <Text style={styles.companyName}>
            {empresa?.razonSocial || user?.tenantName || 'HANDY SUITES'}
          </Text>

          {/* Company Fiscal Data */}
          {empresa?.rfc && <Text style={styles.mono}>R.F.C. {empresa.rfc}</Text>}
          {empresa?.direccion && <Text style={styles.mono}>{empresa.direccion}</Text>}
          {(empresa?.ciudad || empresa?.estado) && (
            <Text style={styles.mono}>
              {[empresa.ciudad, empresa.estado, empresa.codigoPostal].filter(Boolean).join(', ')}
            </Text>
          )}
          {empresa?.telefono && <Text style={styles.mono}>TEL. {empresa.telefono}</Text>}

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Document Type */}
          <Text style={styles.docType}>{tipoDocumento}</Text>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Client */}
          <Text style={styles.monoLeft}>CLIENTE: {clienteNombre}</Text>
          <Text style={styles.monoLeft}>FECHA:   {formatDateTime(fecha)}</Text>
          {referencia ? <Text style={styles.monoLeft}>REF:     {referencia}</Text> : null}

          {/* Items (VD only) */}
          {isFromVD && detalles && detalles.length > 0 && (
            <>
              <Text style={styles.dashed}>{'- '.repeat(24)}</Text>
              <View style={styles.itemHeader}>
                <Text style={[styles.monoSmall, { flex: 1 }]}>CANT.</Text>
                <Text style={[styles.monoSmall, { flex: 3 }]}>ARTICULO</Text>
                <Text style={[styles.monoSmall, { flex: 1, textAlign: 'right' }]}>PRECIO</Text>
                <Text style={[styles.monoSmall, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
              </View>
              {detalles.map((item: any) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={[styles.monoSmall, { flex: 1 }]}>{item.cantidad}</Text>
                  <Text style={[styles.monoSmall, { flex: 3 }]} numberOfLines={1}>{item.productoNombre}</Text>
                  <Text style={[styles.monoSmall, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.precioUnitario)}</Text>
                  <Text style={[styles.monoSmall, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.subtotal)}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.dashed}>{'= '.repeat(24)}</Text>

          {/* Totals */}
          {isFromVD && order ? (
            <>
              <View style={styles.totalLine}>
                <Text style={styles.monoLeft}>SUBTOTAL</Text>
                <Text style={styles.monoRight}>{formatCurrency(order.subtotal)}</Text>
              </View>
              {order.descuento > 0 && (
                <View style={styles.totalLine}>
                  <Text style={styles.monoLeft}>DESCUENTO</Text>
                  <Text style={styles.monoRight}>-{formatCurrency(order.descuento)}</Text>
                </View>
              )}
              <View style={styles.totalLine}>
                <Text style={styles.monoLeft}>IVA 16%</Text>
                <Text style={styles.monoRight}>{formatCurrency(order.impuesto)}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(monto)}</Text>
          </View>

          {/* Payment Method */}
          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>
          <View style={styles.totalLine}>
            <Text style={styles.monoLeft}>METODO DE PAGO</Text>
            <Text style={styles.monoRight}>{METODO_PAGO[metodoPago] || 'Otro'}</Text>
          </View>

          {notas ? (
            <Text style={styles.monoLeft}>NOTAS: {notas}</Text>
          ) : null}

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Footer */}
          <Text style={styles.mono}>LE ATENDIO: {(user?.name || 'VENDEDOR').toUpperCase()}</Text>
          <Text style={styles.mono}>TOTAL DE ARTICULOS VENDIDOS = {detalles?.length || 1}</Text>
          <Text style={[styles.mono, { marginTop: 4 }]}>{isFromVD ? '¡Gracias por su compra!' : '¡Gracias por su pago!'}</Text>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>
        </View>

      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.btnPrint, { flex: 1 }]}
            onPress={() => {
              if (!isNativeAvailable()) {
                Toast.show({ type: 'error', text1: 'No disponible', text2: 'La impresión requiere el APK instalado, no funciona en Expo Go' });
              } else if (!connectedDevice) {
                Toast.show({ type: 'error', text1: 'Sin impresora', text2: 'Configura una impresora en Más → Impresora' });
              } else {
                handlePrint();
              }
            }}
            disabled={printing}
            activeOpacity={0.8}
            accessibilityLabel="Imprimir recibo"
            accessibilityRole="button"
          >
            <Printer size={18} color="#ffffff" />
            <Text style={styles.btnPrintText}>{printing ? 'Imprimiendo...' : 'Imprimir'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnShare, { flex: 1 }]}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
            accessibilityLabel="Compartir recibo"
            accessibilityRole="button"
          >
            <Share2 size={18} color={COLORS.headerBg} />
            <Text style={styles.btnShareText}>{sharing ? 'Compartiendo...' : 'Compartir'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.btnDone} onPress={handleDone} activeOpacity={0.8} accessibilityLabel="Listo" accessibilityRole="button">
          <Text style={styles.btnDoneText}>Listo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5e7eb' },
  header: {
    backgroundColor: COLORS.headerBg,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Ticket card — looks like thermal paper
  ticket: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    // Paper shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  dashed: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#cbd5e1',
    letterSpacing: -1,
    marginVertical: 6,
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },

  companyName: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },

  mono: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },

  monoLeft: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#475569',
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 18,
  },

  monoRight: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#475569',
    textAlign: 'right',
  },

  monoSmall: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#475569',
    lineHeight: 16,
  },

  docType: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 4,
    letterSpacing: 2,
  },

  itemHeader: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginBottom: 4,
  },

  itemRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    paddingVertical: 2,
  },

  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: 1,
  },

  totalLabel: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  totalValue: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.salesGreen,
  },

  // Action buttons
  actions: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  btnPrint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    backgroundColor: COLORS.button,
    borderRadius: 12,
  },
  btnPrintText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  btnShare: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.headerBg,
  },
  btnShareText: { color: COLORS.headerBg, fontWeight: '700' as const, fontSize: 14 },

  btnDone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  btnDoneText: { color: COLORS.foreground, fontWeight: '700', fontSize: 14 },
});
