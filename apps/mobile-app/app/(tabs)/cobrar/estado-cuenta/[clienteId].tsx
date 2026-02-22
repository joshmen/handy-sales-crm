import { View, Text, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEstadoCuenta } from '@/hooks';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';
import { Receipt, ArrowDown, ArrowUp, Wallet } from 'lucide-react-native';
import type { EstadoCuentaMovimiento } from '@/types';

export default function EstadoCuentaScreen() {
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

  const renderMovimiento = ({ item }: { item: EstadoCuentaMovimiento }) => {
    const isFactura = item.tipo === 'factura';
    return (
      <View style={styles.movItem}>
        <View style={[styles.movIcon, { backgroundColor: isFactura ? '#fef2f2' : '#f0fdf4' }]}>
          {isFactura
            ? <ArrowUp size={16} color="#ef4444" />
            : <ArrowDown size={16} color="#16a34a" />
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
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data.movimientos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMovimiento}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Client Header */}
            <View style={styles.header}>
              <Text style={styles.clientName}>{data.clienteNombre}</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
                <Text style={styles.summaryLabel}>Facturado</Text>
                <Text style={styles.summaryValue}>{formatCurrency(data.totalFacturado)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.summaryLabel}>Cobrado</Text>
                <Text style={styles.summaryValue}>{formatCurrency(data.totalCobrado)}</Text>
              </View>
            </View>

            {/* Pending Banner */}
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingLabel}>Saldo Pendiente</Text>
              <Text style={styles.pendingValue}>{formatCurrency(data.saldoPendiente)}</Text>
            </View>

            {/* Register Payment Button */}
            {data.saldoPendiente > 0 && (
              <View style={styles.actionRow}>
                <Button
                  title="Registrar Cobro"
                  onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${clienteId}&clienteNombre=${encodeURIComponent(data.clienteNombre)}&saldo=${data.saldoPendiente}` as any)}
                  fullWidth
                  icon={<Wallet size={18} color="#ffffff" />}
                />
              </View>
            )}

            {/* Movimientos Header */}
            <View style={styles.movHeader}>
              <Receipt size={16} color="#2563eb" />
              <Text style={styles.movTitle}>Movimientos ({data.movimientos.length})</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingBottom: 32 },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  clientName: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  pendingBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  pendingLabel: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  pendingValue: { fontSize: 24, fontWeight: '800', color: '#dc2626', marginTop: 4 },
  actionRow: { paddingHorizontal: 16, paddingTop: 12 },
  movHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  movTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  movItem: {
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
  movFecha: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  movRight: { alignItems: 'flex-end' },
  movMonto: { fontSize: 14, fontWeight: '700' },
  montoRojo: { color: '#ef4444' },
  montoVerde: { color: '#16a34a' },
  movSaldo: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  emptyMov: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
});
