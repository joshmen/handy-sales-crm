import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useMisCobros } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate, formatTime } from '@/utils/format';
import { METODO_PAGO } from '@/types/cobro';
import { Receipt, Banknote, ArrowRightLeft, FileText, CreditCard, MoreHorizontal } from 'lucide-react-native';
import type { MobileCobro } from '@/types';

const METODO_ICONS: Record<number, React.ReactNode> = {
  0: <Banknote size={16} color="#16a34a" />,
  1: <ArrowRightLeft size={16} color="#2563eb" />,
  2: <FileText size={16} color="#7c3aed" />,
  3: <CreditCard size={16} color="#d97706" />,
  4: <CreditCard size={16} color="#0891b2" />,
  5: <MoreHorizontal size={16} color="#64748b" />,
};

export default function HistorialCobrosScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useMisCobros();

  const cobros = data?.pages.flatMap((page) => page.data) ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Group cobros by date
  const groupedData = cobros.reduce<{ date: string; cobros: MobileCobro[] }[]>(
    (groups, cobro) => {
      const date = formatDate(cobro.fecha);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.cobros.push(cobro);
      } else {
        groups.push({ date, cobros: [cobro] });
      }
      return groups;
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: MobileCobro }) => (
      <View style={styles.cobroItem}>
        <View style={[styles.cobroIcon, { backgroundColor: '#f0fdf4' }]}>
          {METODO_ICONS[item.metodoPago] || <Receipt size={16} color="#64748b" />}
        </View>
        <View style={styles.cobroContent}>
          <Text style={styles.cobroCliente} numberOfLines={1}>{item.clienteNombre}</Text>
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
          <Text style={styles.cobroHora}>{formatTime(item.fecha)}</Text>
        </View>
      </View>
    ),
    []
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
        data={cobros}
        keyExtractor={(item) => String(item.id)}
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
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            icon={<Receipt size={48} color="#cbd5e1" />}
            title="Sin cobros"
            message="No tienes cobros registrados"
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : null
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
  footer: { paddingVertical: 16, alignItems: 'center' },
});
