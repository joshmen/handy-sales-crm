import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';
import { database } from '@/db/database';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import Gasto from '@/db/models/Gasto';

const TIPO_LABEL: Record<number, string> = {
  0: 'Combustible', 1: 'Peaje', 2: 'Comida', 3: 'Hospedaje',
  4: 'Mantenimiento', 5: 'Estacionamiento', 99: 'Otro',
};

function GastoDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency } = useTenantLocale();
  const { gastoId } = useLocalSearchParams<{ gastoId: string }>();
  const [gasto, setGasto] = useState<Gasto | null>(null);

  useEffect(() => {
    if (!gastoId) return;
    (async () => {
      try {
        const g = await database.get<Gasto>('gastos').find(String(gastoId));
        setGasto(g);
      } catch {}
    })();
  }, [gastoId]);

  if (!gasto) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={COLORS.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cargando...</Text>
          <View style={styles.headerBtn} />
        </View>
      </View>
    );
  }

  const isInvalidado = gasto.estado === 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de gasto</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isInvalidado && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>Este gasto fue invalidado por el supervisor</Text>
          </View>
        )}

        <View style={styles.montoBox}>
          <Text style={styles.montoLabel}>Monto</Text>
          <Text style={styles.montoValue}>{formatCurrency(gasto.monto)}</Text>
        </View>

        <Field label="Tipo" value={TIPO_LABEL[gasto.tipoGasto] ?? 'Otro'} />
        <Field label="Concepto" value={gasto.concepto} />
        <Field label="Fecha" value={gasto.fechaGasto ? new Date(gasto.fechaGasto).toLocaleString('es-MX') : '—'} />
        {gasto.notas ? <Field label="Notas" value={gasto.notas} /> : null}

        {gasto.comprobanteUrl ? (
          <>
            <Text style={styles.label}>Comprobante</Text>
            <Image source={{ uri: gasto.comprobanteUrl }} style={styles.photo} resizeMode="cover" />
          </>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>Sin comprobante adjunto</Text>
          </View>
        )}

        <Text style={styles.footnote}>
          ID local: {gasto.id.slice(0, 8)}...{gasto.serverId ? ` - Sync OK (server #${gasto.serverId})` : ' - Pendiente de sync'}
        </Text>
      </ScrollView>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  scroll: { padding: 16 },
  warningBanner: { padding: 12, marginBottom: 16, backgroundColor: '#fef3c7', borderRadius: 8 },
  warningText: { color: '#92400e', fontWeight: '600', textAlign: 'center' },
  montoBox: { padding: 24, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  montoLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  montoValue: { fontSize: 36, fontWeight: '700', color: COLORS.foreground, marginTop: 8 },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  label: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  value: { fontSize: 15, color: COLORS.foreground, fontWeight: '500' },
  photo: { width: '100%', height: 300, borderRadius: 12, marginBottom: 16 },
  noPhoto: { padding: 24, marginTop: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  noPhotoText: { color: '#6b7280', fontStyle: 'italic' },
  footnote: { fontSize: 11, color: '#9ca3af', marginTop: 16, textAlign: 'center' },
});

export default withErrorBoundary(GastoDetailScreen, 'GastoDetail');
