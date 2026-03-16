import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOfflineCobros, useClientNameMap } from '@/hooks';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { formatCurrency, formatTime } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import { Receipt, Banknote, ArrowRightLeft, FileText, CreditCard, MoreHorizontal } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import type Cobro from '@/db/models/Cobro';

const METODO_ICONS: Record<number, React.ReactNode> = {
  0: <Banknote size={16} color="#16a34a" />,
  1: <ArrowRightLeft size={16} color="#2563eb" />,
  2: <FileText size={16} color="#7c3aed" />,
  3: <CreditCard size={16} color="#d97706" />,
  4: <CreditCard size={16} color="#0891b2" />,
  5: <MoreHorizontal size={16} color="#64748b" />,
};

export default function HistorialCobrosScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: cobros, isLoading } = useOfflineCobros();
  const clientNames = useClientNameMap();

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: Cobro }) => (
      <View style={styles.cobroItem}>
        <View style={[styles.cobroIcon, { backgroundColor: '#f0fdf4' }]}>
          {METODO_ICONS[item.metodoPago] || <Receipt size={16} color="#64748b" />}
        </View>
        <View style={styles.cobroContent}>
          <Text style={styles.cobroCliente} numberOfLines={1}>
            {clientNames.get(item.clienteId) || 'Cliente'}
          </Text>
          <View style={styles.cobroMeta}>
            <Text style={styles.cobroMetodo}>{METODO_PAGO[item.metodoPago] || 'Otro'}</Text>
            {item.referencia && (
              <>
                <Text style={styles.cobroDot}>·</Text>
                <Text style={styles.cobroRef} numberOfLines={1}>Ref: {item.referencia}</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.cobroRight}>
          <Text style={styles.cobroMonto}>{formatCurrency(item.monto)}</Text>
          <Text style={styles.cobroHora}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    ),
    [clientNames]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando historial..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cobros ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={['#2563eb']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Receipt size={48} color="#cbd5e1" />}
            title="Sin cobros"
            message="No tienes cobros registrados"
            actionLabel="Registrar Cobro"
            onAction={() => router.push('/(tabs)/cobrar/registrar' as any)}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingTop: 8, paddingBottom: 24 },
  cobroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cobroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cobroContent: { flex: 1 },
  cobroCliente: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cobroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cobroMetodo: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  cobroDot: { fontSize: 11, color: '#cbd5e1' },
  cobroRef: { fontSize: 11, color: '#94a3b8', flex: 1 },
  cobroRight: { alignItems: 'flex-end', marginLeft: 8 },
  cobroMonto: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
  cobroHora: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
