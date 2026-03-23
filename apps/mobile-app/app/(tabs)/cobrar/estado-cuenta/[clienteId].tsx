import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEstadoCuenta } from '@/hooks';
import { Button, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';
import { ArrowDown, ArrowUp, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { EstadoCuentaMovimiento } from '@/types';
import { COLORS } from '@/theme/colors';

export default function EstadoCuentaScreen() {
  const insets = useSafeAreaInsets();
  const { clienteId } = useLocalSearchParams<{ clienteId: string }>();
  const router = useRouter();
  const { data, isLoading } = useEstadoCuenta(Number(clienteId));

  if (isLoading || !data) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando estado de cuenta..." />
      </View>
    );
  }

  const renderMovimiento = ({ item, index }: { item: EstadoCuentaMovimiento; index: number }) => {
    const isFactura = item.tipo === 'factura';
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)}>
      <View style={styles.movItem}>
        <View style={[styles.movIcon, { backgroundColor: COLORS.background }]}>
          {isFactura
            ? <ArrowUp size={16} color="#6b7280" />
            : <ArrowDown size={16} color="#6b7280" />
          }
        </View>
        <View style={styles.movContent}>
          <Text style={styles.movConcepto} numberOfLines={1}>{item.concepto}</Text>
          <Text style={styles.movFecha}>{formatDate(item.fecha)}</Text>
        </View>
        <View style={styles.movRight}>
          <Text style={[styles.movMonto, isFactura ? styles.montoRojo : styles.montoVerde]}>
            {isFactura ? '+' : '-'}{formatCurrency(item.monto)}
          </Text>
          <Text style={styles.movSaldo}>Saldo: {formatCurrency(item.saldo)}</Text>
        </View>
      </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data.movimientos ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMovimiento}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Blue Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ChevronLeft size={22} color={COLORS.headerText} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Estado de Cuenta</Text>
              <View style={{ width: 22 }} />
            </View>
            <View style={styles.clientNameRow}>
              <Text style={styles.clientName} numberOfLines={1}>{data.clienteNombre}</Text>
            </View>

            {/* Summary Cards */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Facturado</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.salesGreen }]}>{formatCurrency(data.totalFacturado)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Cobrado</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.salesGreen }]}>{formatCurrency(data.totalCobrado)}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Pending Row */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <View style={styles.pendingRow}>
                <Text style={styles.pendingLabel}>Saldo Pendiente</Text>
                <Text style={styles.pendingValue}>{formatCurrency(data.saldoPendiente)}</Text>
              </View>
            </Animated.View>

            {/* Register Payment Button */}
            {data.saldoPendiente > 0 && (
              <View style={styles.actionRow}>
                <Button
                  title="Registrar Cobro"
                  onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${clienteId}&clienteNombre=${encodeURIComponent(data.clienteNombre)}&saldo=${data.saldoPendiente}` as any)}
                  fullWidth
                />
              </View>
            )}

            {/* Movimientos Header */}
            <View style={styles.movHeader}>
              <Text style={styles.movTitle}>Movimientos ({data.movimientos?.length ?? 0})</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyMov}>
            <Text style={styles.emptyText}>Sin movimientos registrados</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 32 },
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
  clientNameRow: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clientName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', fontStyle: 'italic' },
  pendingValue: { fontSize: 18, fontWeight: '800', color: '#dc2626' },
  actionRow: { paddingHorizontal: 20, paddingTop: 12 },
  movHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  movTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  movItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  movIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  movContent: { flex: 1 },
  movConcepto: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  movFecha: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  movRight: { alignItems: 'flex-end' },
  movMonto: { fontSize: 14, fontWeight: '700' },
  montoRojo: { color: '#ef4444' },
  montoVerde: { color: COLORS.salesGreen },
  movSaldo: { fontSize: 10, color: COLORS.textTertiary, marginTop: 2 },
  emptyMov: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
});
