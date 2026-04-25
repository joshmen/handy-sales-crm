import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { facturasApi } from '@/api/facturas';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui';
import { useTenantLocale } from '@/hooks';
import { useEmpresa } from '@/hooks/useEmpresa';
import { tipoComprobanteLabel, impuestoLabel } from '@/services/printerService';
import { COLORS } from '@/theme/colors';

const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

function numeroALetras(n: number): string {
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  return `${entero} PESOS ${centavos.toString().padStart(2, '0')}/100 M.N.`;
}

export default function CfdiPreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { money: formatCurrency, tz } = useTenantLocale();
  const { data: empresa } = useEmpresa();

  const { data: td, isLoading, error } = useQuery({
    queryKey: ['factura', id, 'ticket-data'],
    queryFn: () => facturasApi.getTicketData(id),
    enabled: id > 0,
  });

  // Fecha timbrado SIEMPRE en CDMX (Anexo 20 4.0 — requisito legal SAT)
  const fechaTimbradoFmt = useMemo(() => {
    if (!td?.fechaTimbrado) return '';
    try {
      return new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(new Date(td.fechaTimbrado)) + ' (CDMX)';
    } catch {
      return td.fechaTimbrado;
    }
  }, [td?.fechaTimbrado]);

  // Fecha emisión en TZ del tenant
  const fechaEmisionFmt = useMemo(() => {
    if (!td?.fechaEmision) return '';
    try {
      return new Intl.DateTimeFormat('es-MX', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(td.fechaEmision));
    } catch {
      return td.fechaEmision;
    }
  }, [td?.fechaEmision, tz]);

  const qrUrl = useMemo(() => {
    if (!td) return '';
    return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${td.uuid}&re=${td.emisorRfc}&rr=${td.receptorRfc}&tt=${Number(td.total).toFixed(6)}&fe=${(td.selloCfdi || '').slice(-8)}`;
  }, [td]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vista Previa</Text>
          <View style={{ width: 32 }} />
        </View>
        <LoadingSpinner message="Cargando vista previa…" />
      </View>
    );
  }

  if (error || !td) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vista Previa</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>No se pudo cargar la vista previa.</Text>
        </View>
      </View>
    );
  }

  const folio = td.serie && td.folio ? `${td.serie}-${td.folio}` : `#${td.folio}`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vista Previa CFDI</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.ticket}>
          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Logo */}
          {empresa?.logoUrl ? (
            <Image source={{ uri: empresa.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : null}

          {/* Emisor */}
          <Text style={styles.companyName}>{td.emisorNombre}</Text>
          <Text style={styles.mono}>RFC: {td.emisorRfc}</Text>
          {td.emisorRegimenFiscal ? (
            <Text style={styles.mono}>Régimen Fiscal: {td.emisorRegimenFiscal}</Text>
          ) : null}
          {td.emisorDireccion ? <Text style={styles.mono}>{td.emisorDireccion}</Text> : null}
          <Text style={styles.mono}>C.P. {td.lugarExpedicion}</Text>
          <Text style={styles.mono}>Lugar de Expedición: {td.lugarExpedicion}</Text>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>
          <Text style={styles.docType}>FACTURA ELECTRÓNICA</Text>
          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Comprobante */}
          <View style={styles.kvBlock}>
            <KV k="Folio" v={folio} />
            <KV k="Fecha emisión" v={fechaEmisionFmt} />
            <KV k="Tipo Comprobante" v={`${td.tipoComprobante} - ${tipoComprobanteLabel(td.tipoComprobante)}`} />
            <KV k="Forma Pago" v={td.formaPago ?? '—'} />
            <KV k="Método Pago" v={td.metodoPago ?? '—'} />
            <KV k="Moneda" v={td.moneda} />
            {td.moneda !== 'MXN' && Number(td.tipoCambio) !== 1 ? (
              <KV k="Tipo de Cambio" v={Number(td.tipoCambio).toFixed(4)} />
            ) : null}
            <KV k="Tipo Exportación" v={td.tipoExportacion} />
          </View>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Receptor */}
          <Text style={styles.sectionH}>RECEPTOR</Text>
          <View style={styles.kvBlock}>
            <KV k="Nombre" v={td.receptorNombre} />
            <KV k="RFC" v={td.receptorRfc} />
            {td.receptorRegimenFiscal ? <KV k="Régimen Fiscal" v={td.receptorRegimenFiscal} /> : null}
            {td.receptorUsoCfdi ? <KV k="Uso CFDI" v={td.receptorUsoCfdi} /> : null}
            {td.receptorDomicilioFiscal ? <KV k="C.P. Domicilio" v={td.receptorDomicilioFiscal} /> : null}
          </View>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* Conceptos */}
          <Text style={styles.sectionH}>CONCEPTOS</Text>
          {td.items.map((item) => (
            <View key={item.numeroLinea} style={styles.itemBlock}>
              <View style={styles.itemTop}>
                <Text style={[styles.monoLeft, { flex: 1 }]} numberOfLines={2}>
                  {item.cantidad} × {item.descripcion}
                </Text>
                <Text style={styles.monoRight}>{formatCurrency(item.importe)}</Text>
              </View>
              <Text style={styles.subline}>
                Clave SAT: {item.claveProdServ}{' '}
                {item.claveUnidad ? `| Unidad: ${item.claveUnidad}${item.unidad ? ` (${item.unidad})` : ''}` : ''}
              </Text>
              <Text style={styles.subline}>
                ValorUnit: {formatCurrency(item.valorUnitario)} | ObjImp: {item.objetoImp}
              </Text>
              {item.descuento > 0 ? (
                <View style={styles.lineRight}>
                  <Text style={styles.subline}>Descuento: -{formatCurrency(item.descuento)}</Text>
                </View>
              ) : null}
              {item.impuestos?.map((imp, idx) => {
                const tasa = imp.tasaOCuota != null
                  ? (imp.tipoFactor === 'Tasa' ? `${(Number(imp.tasaOCuota) * 100).toFixed(2)}%` : Number(imp.tasaOCuota).toFixed(6))
                  : 'Exento';
                return (
                  <Text key={idx} style={styles.subline}>
                    {imp.tipo === 'RETENCION' ? 'Ret.' : 'Tras.'} {impuestoLabel(imp.impuesto)} {tasa}
                    {imp.importe != null ? `: ${formatCurrency(imp.importe)}` : ''}
                  </Text>
                );
              })}
            </View>
          ))}

          <Text style={styles.dashed}>{'= '.repeat(24)}</Text>

          {/* Totales */}
          <Row label="SUBTOTAL" value={formatCurrency(td.subtotal)} />
          {td.descuento > 0 ? <Row label="DESCUENTO" value={`-${formatCurrency(td.descuento)}`} /> : null}
          <Row label="IVA Trasladado" value={formatCurrency(td.totalImpuestosTrasladados)} />
          {td.totalImpuestosRetenidos > 0 ? (
            <Row label="Retenciones" value={`-${formatCurrency(td.totalImpuestosRetenidos)}`} />
          ) : null}
          <Text style={styles.dashed}>{'= '.repeat(24)}</Text>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(td.total)}</Text>
          </View>
          <Text style={styles.totalLetra}>{numeroALetras(td.total)}</Text>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* TFD */}
          <Text style={styles.sectionH}>TIMBRE FISCAL DIGITAL</Text>
          <View style={styles.kvBlock}>
            <KV k="Folio Fiscal (UUID)" v={td.uuid} mono />
            <KV k="No. Cert. Emisor" v={td.noCertificadoEmisor} mono />
            <KV k="No. Cert. SAT" v={td.noCertificadoSat} mono />
            <KV k="RFC PAC" v={td.rfcPac} />
            <KV k="Fecha Timbrado" v={fechaTimbradoFmt} />
            {td.fechaCertificacion ? (
              <KV k="Fecha Certificación" v={td.fechaCertificacion.replace('T', ' ').slice(0, 19) + ' UTC'} />
            ) : null}
          </View>

          <Text style={styles.sectionH}>Sello Digital del CFDI</Text>
          <Text style={styles.sello}>{td.selloCfdi || '—'}</Text>

          <Text style={styles.sectionH}>Sello Digital del SAT</Text>
          <Text style={styles.sello}>{td.selloSat || '—'}</Text>

          <Text style={styles.sectionH}>Cadena Original del Complemento de Certificación</Text>
          <Text style={styles.sello}>{td.cadenaOriginalSat || '—'}</Text>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>

          {/* QR de verificación SAT (mismo que se imprime en la térmica via P.printQRCode) */}
          <Text style={styles.center}>QR de verificación SAT</Text>
          {qrUrl ? (
            <View style={styles.qrWrap}>
              <QRCode value={qrUrl} size={180} ecl="M" />
            </View>
          ) : null}
          <Text style={styles.urlLink} selectable numberOfLines={4}>{qrUrl}</Text>
          <Text style={styles.legend}>Este documento es una representación impresa de un CFDI</Text>

          <Text style={styles.dashed}>{'- '.repeat(24)}</Text>
        </View>

        <Text style={styles.helpText}>
          Esta es la vista previa del ticket que se imprimirá en la térmica 80mm. Verifica que todos los componentes
          de Anexo 20 4.0 estén presentes antes de gastar papel.
        </Text>
      </ScrollView>
    </View>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}:</Text>
      <Text style={[styles.kvVal, mono ? { fontFamily: MONO } : null]} selectable>{v}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalRowLabel}>{label}</Text>
      <Text style={styles.totalRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5e7eb' },
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
  scrollContent: { padding: 16, paddingBottom: 48 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  ticket: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
    marginVertical: 4,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  logo: { width: 80, height: 80, marginBottom: 6 },
  companyName: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 2,
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
  },
  monoRight: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#475569',
    textAlign: 'right',
    marginLeft: 6,
  },
  docType: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 2,
    marginVertical: 2,
  },
  sectionH: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    alignSelf: 'stretch',
    marginTop: 6,
    marginBottom: 4,
  },
  kvBlock: { alignSelf: 'stretch' },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 1,
  },
  kvKey: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#64748b',
    width: 130,
  },
  kvVal: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#1e293b',
    flex: 1,
    flexWrap: 'wrap',
  },
  itemBlock: { alignSelf: 'stretch', marginBottom: 6 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start' },
  subline: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#64748b',
    paddingLeft: 8,
    lineHeight: 14,
  },
  lineRight: { alignSelf: 'flex-end' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: 1,
  },
  totalRowLabel: { fontFamily: MONO, fontSize: 11, color: '#475569' },
  totalRowValue: { fontFamily: MONO, fontSize: 11, color: '#475569', fontWeight: '600' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: 4,
  },
  totalLabel: { fontFamily: MONO, fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  totalValue: { fontFamily: MONO, fontSize: 14, fontWeight: '700', color: COLORS.salesGreen },
  totalLetra: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#475569',
    fontStyle: 'italic',
    alignSelf: 'stretch',
    marginTop: 2,
  },
  sello: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#475569',
    alignSelf: 'stretch',
    lineHeight: 12,
  },
  center: { fontFamily: MONO, fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 6 },
  qrWrap: {
    alignSelf: 'center',
    marginVertical: 10,
    padding: 8,
    backgroundColor: '#ffffff',
  },
  urlLink: {
    fontFamily: MONO,
    fontSize: 9,
    color: COLORS.primary,
    alignSelf: 'stretch',
    textAlign: 'center',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  legend: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 14,
    paddingHorizontal: 6,
    lineHeight: 18,
    textAlign: 'center',
  },
});
