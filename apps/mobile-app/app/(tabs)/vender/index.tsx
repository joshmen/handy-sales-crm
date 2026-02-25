import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOfflineOrders, useClientNameMap } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ORDER_STATUS_COLORS } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/format';
import { ShoppingCart, ChevronRight, Calendar, Plus } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import type Pedido from '@/db/models/Pedido';

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

  const { data: allOrders, isLoading } = useOfflineOrders();
  const clientNames = useClientNameMap();

  const orders = useMemo(() => {
    if (!allOrders) return [];
    if (statusFilter === undefined) return allOrders;
    return allOrders.filter((o) => o.estado === statusFilter);
  }, [allOrders, statusFilter]);

  const total = orders.length;

  const renderItem = useCallback(
    ({ item }: { item: Pedido }) => (
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
              <Text style={styles.orderNumber}>
                {item.numeroPedido ? `#${item.numeroPedido}` : `#${item.serverId || item.id.slice(0, 6)}`}
              </Text>
              <StatusBadge type="order" status={item.estado} />
            </View>
            <Text style={styles.clientName} numberOfLines={1}>
              {clientNames.get(item.clienteId) || 'Cliente'}
            </Text>
            <View style={styles.orderFooter}>
              <View style={styles.dateRow}>
                <Calendar size={11} color="#94a3b8" />
                <Text style={styles.dateText}>
                  {formatDate(item.fechaPedido || item.createdAt)}
                </Text>
              </View>
              <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" style={{ marginLeft: 4 }} />
        </View>
      </Card>
    ),
    [router, clientNames]
  );

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
        {total > 0 && (
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{total}</Text>
            </View>
            <Text style={styles.countText}>
              pedido{total !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => performSync()} tintColor="#2563eb" colors={['#2563eb']} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ShoppingCart size={48} color="#cbd5e1" />}
            title="Sin pedidos"
            message="No tienes pedidos registrados"
          />
        }
      />

      {/* FAB Nuevo Pedido */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/vender/crear/modo' as any)}
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
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
