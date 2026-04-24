import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Printer, Mail, FileText } from 'lucide-react-native';
import { useFacturaById, useEnviarFactura } from '@/hooks/useFacturas';
import { facturasApi } from '@/api/facturas';
import { usePrinterStore } from '@/stores/printerStore';
import { printCfdiTicket, isNativeAvailable } from '@/services/printerService';
import { LoadingSpinner } from '@/components/ui';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import Toast from 'react-native-toast-message';
import type { FacturaTicketData } from '@/api/facturas';

const ESTADO_COLORS: Record<string, string> = {
  TIMBRADA: '#16a34a',
  PENDIENTE: '#d97706',
  CANCELADA: '#dc2626',
  ERROR: '#dc2626',
};

function numeroALetras(n: number): string {
  // Aproximación básica. Para producción usar librería dedicada o server-side.
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  return `${entero} PESOS ${centavos.toString().padStart(2, '0')}/100 M.N.`;
}

export default function FacturaDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency } = useTenantLocale();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);

  const { data: factura, isLoading } = useFacturaById(id);
  const { connectedDevice, paperWidth } = usePrinterStore();
  const enviarFactura = useEnviarFactura();
  const [printing, setPrinting] = useState(false);


  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Factura</Text>
          <View style={{ width: 32 }} />
        </View>
        <LoadingSpinner message="Cargando factura..." />
      </View>
    );
  }

  if (!factura) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Factura</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centerWrap}>
          <FileText size={48} color="#cbd5e1" />
          <Text style={styles.notFoundText}>Factura no encontrada</Text>
        </View>
      </View>
    );
  }

  const estado = factura.estado || 'PENDIENTE';
  const color = ESTADO_COLORS[estado] ?? '#94a3b8';
  const folio = factura.serie && factura.folio ? `${factura.serie}-${factura.folio}` : `#${factura.id}`;
  const isTimbrada = estado === 'TIMBRADA';

  const handlePrint = async () => {
    if (!isTimbrada) {
      Toast.show({ type: 'error', text1: 'No disponible', text2: 'Solo facturas timbradas pueden imprimirse.' });
      return;
    }
    if (!isNativeAvailable()) {
      Toast.show({
        type: 'info',
        text1: 'Requiere APK nativo',
        text2: 'La impresión Bluetooth no funciona en Expo Go. Genera el build con EAS.',
      });
      return;
    }
    if (!connectedDevice) {
      Alert.alert(
        'Impresora no conectada',
        'Conecta una impresora térmica 80mm desde Más → Impresora para poder imprimir el ticket CFDI.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Impresora', onPress: () => router.push('/(tabs)/impresora' as any) },
        ],
      );
      return;
    }

    // Anexo 20 4.0: la representación impresa del CFDI requiere sellos
    // completos (~344 chars c/u) + cadena original + claves SAT por línea.
    // En 58mm (32 chars/línea) el texto queda truncado o ilegible.
    // No forzamos el setting — validamos la impresora física que el user configuró.
    if (paperWidth !== 80) {
      Alert.alert(
        'Impresora 80mm requerida',
        `Tu impresora está configurada en ${paperWidth}mm. Los tickets CFDI solo pueden imprimirse en 80mm.\n\nVe a Más → Impresora y cambia el ancho de papel si tienes una 80mm, o conecta una impresora compatible.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Impresora', onPress: () => router.push('/(tabs)/impresora' as any) },
        ],
      );
      return;
    }

    setPrinting(true);
    try {
      // Fetch completo del ticket data (on-demand)
      const td: FacturaTicketData = await facturasApi.getTicketData(id);

      if (td.estado !== 'TIMBRADA') {
        Toast.show({ type: 'error', text1: 'Factura no timbrada', text2: 'Solo se imprimen facturas TIMBRADA.' });
        return;
      }

      const success = await printCfdiTicket({
        emisorRfc: td.emisorRfc,
        emisorNombre: td.emisorNombre,
        emisorRegimenFiscal: td.emisorRegimenFiscal ?? '',
        emisorDireccion: td.emisorDireccion ?? undefined,
        emisorCp: td.lugarExpedicion,
        lugarExpedicion: td.lugarExpedicion,
        receptorRfc: td.receptorRfc,
        receptorNombre: td.receptorNombre,
        receptorRegimenFiscal: td.receptorRegimenFiscal ?? '',
        receptorUsoCfdi: td.receptorUsoCfdi ?? '',
        receptorCp: td.receptorDomicilioFiscal ?? '',
        uuid: td.uuid,
        serie: td.serie ?? undefined,
        folio: String(td.folio),
        fecha: td.fechaEmision,
        formaPago: td.formaPago ?? '',
        metodoPago: td.metodoPago ?? '',
        tipoExportacion: td.tipoExportacion,
        items: td.items.map((i) => ({
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad),
          precioUnitario: Number(i.valorUnitario),
          importe: Number(i.importe),
          claveProductoServ: i.claveProdServ,
          claveUnidad: i.claveUnidad ?? '',
          objetoImpuesto: i.objetoImp,
        })),
        subtotal: Number(td.subtotal),
        iva: Number(td.totalImpuestosTrasladados),
        total: Number(td.total),
        totalLetra: numeroALetras(Number(td.total)),
        selloCfdi: td.selloCfdi,
        selloSat: td.selloSat,
        cadenaOriginal: td.cadenaOriginalSat,
        noCertificadoEmisor: td.noCertificadoEmisor,
        noCertificadoSat: td.noCertificadoSat,
        fechaTimbrado: td.fechaTimbrado,
        rfcPac: td.rfcPac,
        vendedorName: '', // Mobile no guarda nombre de vendedor de la factura — omitir o leer del user actual
      });

      if (success) {
        Toast.show({ type: 'success', text1: 'Ticket impreso', text2: `UUID ${td.uuid.slice(0, 8)}…` });
      } else {
        Toast.show({ type: 'error', text1: 'No se pudo imprimir', text2: 'Revisa la conexión con la impresora.' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error al imprimir', text2: e?.message ?? 'Intenta de nuevo' });
    } finally {
      setPrinting(false);
    }
  };

  const handleEnviar = () => {
    Alert.alert(
      'Enviar factura',
      `¿Enviar PDF + XML por correo al receptor?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              await enviarFactura.mutateAsync(id);
              Toast.show({ type: 'success', text1: 'Factura enviada' });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'No se pudo enviar' });
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{folio}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.estadoBanner, { backgroundColor: color + '15' }]}>
          <Text style={[styles.estadoText, { color }]}>{estado}</Text>
        </View>

        <Text style={styles.sectionLabel}>RECEPTOR</Text>
        <View style={styles.card}>
          <Text style={styles.name}>{factura.receptorNombre}</Text>
          <Text style={styles.line}>RFC: {factura.receptorRfc}</Text>
          {factura.receptorUsoCfdi && <Text style={styles.line}>Uso CFDI: {factura.receptorUsoCfdi}</Text>}
        </View>

        <Text style={styles.sectionLabel}>COMPROBANTE</Text>
        <View style={styles.card}>
          <Text style={styles.line}>UUID: {factura.uuid ?? '—'}</Text>
          <Text style={styles.line}>Fecha emisión: {factura.fechaEmision}</Text>
          {factura.fechaTimbrado && <Text style={styles.line}>Fecha timbrado: {factura.fechaTimbrado}</Text>}
          {factura.metodoPago && <Text style={styles.line}>Método pago: {factura.metodoPago}</Text>}
          {factura.formaPago && <Text style={styles.line}>Forma pago: {factura.formaPago}</Text>}
        </View>

        <Text style={styles.sectionLabel}>TOTALES</Text>
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(factura.subtotal ?? 0)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA</Text>
            <Text style={styles.totalValue}>{formatCurrency(factura.totalImpuestosTrasladados ?? 0)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>TOTAL</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(factura.total ?? 0)}</Text>
          </View>
        </View>

        <View style={{ height: 12 }} />

        {isTimbrada && isNativeAvailable() && connectedDevice && paperWidth !== 80 && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              ⚠ Tu impresora está configurada en {paperWidth}mm. Los tickets CFDI requieren 80mm.
              Ajusta el ancho en Más → Impresora.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnPrimary, (!isTimbrada || printing) && styles.btnDisabled]}
          onPress={handlePrint}
          disabled={!isTimbrada || printing}
          activeOpacity={0.85}
        >
          <Printer size={18} color="#ffffff" />
          <Text style={styles.btnPrimaryText}>{printing ? 'Imprimiendo…' : 'Imprimir ticket 80mm'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSecondary, (!isTimbrada || enviarFactura.isPending) && styles.btnDisabled]}
          onPress={handleEnviar}
          disabled={!isTimbrada || enviarFactura.isPending}
          activeOpacity={0.85}
        >
          <Mail size={18} color={COLORS.primary} />
          <Text style={styles.btnSecondaryText}>
            {enviarFactura.isPending ? 'Enviando…' : 'Enviar por correo'}
          </Text>
        </TouchableOpacity>

        {!isTimbrada && (
          <Text style={styles.hint}>
            Solo facturas en estado TIMBRADA pueden imprimirse o enviarse. Timbra la factura desde el portal web.
          </Text>
        )}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  backBtn: { width: 32, alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 15, color: COLORS.textTertiary },
  estadoBanner: { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 20 },
  estadoText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.foreground, marginBottom: 4 },
  line: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  totalFinal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 10 },
  totalFinalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  totalFinalValue: { fontSize: 18, fontWeight: '800', color: COLORS.salesGreen },
  btnPrimary: {
    backgroundColor: COLORS.headerBg,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  btnSecondaryText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  hint: { fontSize: 12, color: COLORS.textTertiary, marginTop: 12, textAlign: 'center', lineHeight: 18 },
  warnBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  warnText: { fontSize: 12, color: '#92400e', lineHeight: 18 },
});
