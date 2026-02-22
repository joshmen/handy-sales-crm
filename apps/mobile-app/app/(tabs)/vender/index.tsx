import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrdersList } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ORDER_STATUS_COLORS } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/format';
import { ShoppingCart, ChevronRight, Calendar, Plus } from 'lucide-react-native';
import type { MobilePedido } from '@/types';

const STATUS_FILTERS = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 0 },
  { label: 'Enviado', value: 1 },
  { label: 'Confirmado', value: 2 },
  { label: 'Entregado', value: 5 },
  { label: 'Cancelado', value: 6 },
];

export default function VenderListScreen() {
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const router = useRouter();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useOrdersList({ estado: statusFilter });

  const orders = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  const renderItem = useCallback(
    ({ item }: { item: MobilePedido }) => (
      <Card
        className="mx-4 mb-3"
        onPress={() => router.push(`/(tabs)/vender/${item.id}` as any)}
      >
        <View style={styles.orderRow}>
          <View style={[
            styles.orderIcon,
            { backgroundColor: `${ORDER_STATUS_COLORS[item.estado] || '#6b7280'}15` },
          ]}>
            <ShoppingCart
              size={18}
              color={ORDER_STATUS_COLORS[item.estado] || '#6b7280'}
            />
          </View>
          <View style={styles.orderContent}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>#{item.numeroPedido}</Text>
              <StatusBadge type="order" status={item.estado} />
            </View>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.clienteNombre}
            </Text>
            <View style={styles.orderFooter}>
              <View style={styles.dateRow}>
                <Calendar size={11} color="#94a3b8" />
                <Text style={styles.dateText}>{formatDate(item.fechaPedido)}</Text>
              </View>
              <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" style={{ marginLeft: 4 }} />
        </View>
      </Card>
    ),
    [router]
  );

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.footerLoadingText}>Cargando más...</Text>
        </View>
      );
    }
    if (orders.length > 0 && !hasNextPage) {
      return (
        <Text style={styles.footerEnd}>
          Mostrando {orders.length} de {total} pedidos
        </Text>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, orders.length, total]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando pedidos..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.label}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setStatusFilter(filter.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {(total > 0 || orders.length > 0) && (
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{total > 0 ? total : orders.length}</Text>
            </View>
            <Text style={styles.countText}>
              pedido{(total || orders.length) !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor="#2563eb" colors={['#2563eb']} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            icon={<ShoppingCart size={48} color="#cbd5e1" />}
            title="Sin pedidos"
            message="No tienes pedidos registrados"
          />
        }
        ListFooterComponent={renderFooter}
      />

      {/* FAB Nuevo Pedido */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/vender/crear' as any)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  filterSection: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  filterScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  countRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6 },
  countBadge: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 28, alignItems: 'center' },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  countText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },
  listContent: { paddingTop: 12, paddingBottom: 80 },
  orderRow: { flexDirection: 'row', alignItems: 'center' },
  orderIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  orderContent: { flex: 1 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  orderNumber: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  clientName: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  orderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  totalText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  footerLoadingText: { fontSize: 13, color: '#64748b' },
  footerEnd: { textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: '500', paddingVertical: 16, marginHorizontal: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
