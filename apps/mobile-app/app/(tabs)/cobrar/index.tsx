import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSaldos, useResumenCartera } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { Wallet, ChevronRight, TrendingDown, TrendingUp, DollarSign, User } from 'lucide-react-native';
import type { SaldoCliente } from '@/types';

export default function CobrarScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const resumen = useResumenCartera();
  const saldos = useSaldos();

  const clientes = saldos.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([resumen.refetch(), saldos.refetch()]);
    setRefreshing(false);
  };

  const renderHeader = useCallback(() => {
    const data = resumen.data;
    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#dbeafe' }]}>
                <DollarSign size={18} color="#2563eb" />
              </View>
              <Text style={styles.summaryValue}>
                {data ? formatCurrency(data.totalFacturado) : '-'}
              </Text>
              <Text style={styles.summaryLabel}>Facturado</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#dcfce7' }]}>
                <TrendingUp size={18} color="#16a34a" />
              </View>
              <Text style={styles.summaryValue}>
                {data ? formatCurrency(data.totalCobrado) : '-'}
              </Text>
              <Text style={styles.summaryLabel}>Cobrado</Text>
            </View>
          </View>
          <View style={[styles.pendingBanner]}>
            <View style={styles.pendingBannerLeft}>
              <TrendingDown size={20} color="#ef4444" />
              <View>
                <Text style={styles.pendingBannerLabel}>Pendiente de Cobro</Text>
                <Text style={styles.pendingBannerValue}>
                  {data ? formatCurrency(data.totalPendiente) : '-'}
                </Text>
              </View>
            </View>
            {data && data.clientesConSaldo > 0 && (
              <View style={styles.clientCountBadge}>
                <Text style={styles.clientCountText}>
                  {data.clientesConSaldo} cliente{data.clientesConSaldo !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Saldos por Cliente</Text>
          {clientes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{clientes.length}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [resumen.data, clientes.length]);

  const renderItem = useCallback(
    ({ item }: { item: SaldoCliente }) => (
      <Card
        className="mx-4 mb-3"
        onPress={() => router.push(`/(tabs)/cobrar/estado-cuenta/${item.clienteId}` as any)}
      >
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <User size={18} color="#64748b" />
          </View>
          <View style={styles.clientContent}>
            <Text style={styles.clientName} numberOfLines={1}>{item.clienteNombre}</Text>
            <View style={styles.clientMeta}>
              <Text style={styles.metaText}>
                Facturado: {formatCurrency(item.totalFacturado)}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>
                Cobrado: {formatCurrency(item.totalCobrado)}
              </Text>
            </View>
          </View>
          <View style={styles.clientRight}>
            <Text style={styles.saldoAmount}>
              {formatCurrency(item.saldoPendiente)}
            </Text>
            <ChevronRight size={16} color="#cbd5e1" />
          </View>
        </View>
      </Card>
    ),
    [router]
  );

  if (resumen.isLoading && saldos.isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando cartera..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clientes}
        keyExtractor={(item) => String(item.clienteId)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
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
            icon={<Wallet size={48} color="#cbd5e1" />}
            title="Sin saldos pendientes"
            message="No hay clientes con saldo pendiente de cobro"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingBottom: 32 },
  summarySection: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 },
  pendingBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  pendingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingBannerLabel: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  pendingBannerValue: { fontSize: 20, fontWeight: '800', color: '#dc2626' },
  clientCountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clientCountText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  listTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  countBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientContent: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  clientMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#94a3b8' },
  metaDot: { fontSize: 11, color: '#cbd5e1' },
  clientRight: { alignItems: 'flex-end', marginLeft: 8, gap: 2 },
  saldoAmount: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});
