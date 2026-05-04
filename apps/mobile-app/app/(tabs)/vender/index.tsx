import { useState, useCallback, useMemo } from 'react';

const ITEM_HEIGHT = 90; // Card height (p-4 + ~58px content)
const ITEM_MARGIN_BOTTOM = 12; // mb-3
const ITEM_SLOT = ITEM_HEIGHT + ITEM_MARGIN_BOTTOM;
import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineOrders, useClientNameMap } from '@/hooks';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAuthStore, useOrderDraftStore } from '@/stores';
import { Card, LoadingSpinner, EmptyState, BottomSheet } from '@/components/ui';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ORDER_STATUS_COLORS } from '@/constants/colors';
import { COLORS } from '@/theme/colors';
import { useTenantLocale } from '@/hooks';
import { ShoppingCart, ChevronRight, Calendar, Plus, ClipboardList, Truck } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import type Pedido from '@/db/models/Pedido';
import { AdminTenantPedidosList } from '@/components/admin/AdminTenantPedidosList';

const STATUS_FILTERS = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 0 },
  { label: 'Confirmado', value: 2 },
  { label: 'En Ruta', value: 4 },
  { label: 'Entregado', value: 5 },
  { label: 'Cancelado', value: 6 },
];

function VenderListScreenContent() {
  const insets = useSafeAreaInsets();
  const { money: formatCurrency, date: formatDate } = useTenantLocale();
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [showOrderTypeSheet, setShowOrderTypeSheet] = useState(false);
  const router = useRouter();
  const role = useAuthStore(s => s.user?.role);
  const isAdminOrSupervisor = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERVISOR';
  const { setTipoVenta, reset: resetDraft } = useOrderDraftStore();
  const { data: empresa } = useEmpresa();
  // Modo default configurado por el admin del tenant. Si != "Preguntar",
  // saltamos el BottomSheet y vamos directo al picker de cliente con el
  // modo pre-seleccionado. Acelera el flujo de venta.
  const modoDefault = empresa?.modoVentaDefault ?? 'Preguntar';

  const _role = role; // kept for future role-based filtering

  // Admin/Supervisor: ver TODOS los pedidos del tenant del día.
  // Reportado admin@jeyma.com 2026-05-04: WatermelonDB local solo sincroniza
  // pedidos del usuario actual; admin no opera en ruta → tab vacío.
  // Vendedores siguen viendo el flujo offline original (WatermelonDB) abajo.
  if (isAdminOrSupervisor) {
    return (
      <View style={styles.container}>
        <View style={[styles.customHeader, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.screenTitle}>Pedidos</Text>
        </View>
        <AdminTenantPedidosList />
      </View>
    );
  }

  const { data: allOrders, isLoading } = useOfflineOrders();
  const clienteIds = useMemo(
    () => Array.from(new Set((allOrders ?? []).map(p => p.clienteId))),
    [allOrders]
  );
  const clientNames = useClientNameMap(clienteIds);

  const orders = useMemo(() => {
    if (!allOrders) return [];
    if (statusFilter === undefined) return allOrders;
    return allOrders.filter((o) => o.estado === statusFilter);
  }, [allOrders, statusFilter]);

  const total = orders.length;

  const handleFabPress = () => {
    // Si admin configuró un modo default (no "Preguntar"), saltamos el sheet
    // de selección y vamos directo al picker de cliente con el modo seteado.
    if (modoDefault === 'Preventa') {
      handleOrderTypeSelect(0);
      return;
    }
    if (modoDefault === 'VentaDirecta') {
      handleOrderTypeSelect(1);
      return;
    }
    setShowOrderTypeSheet(true);
  };

  const handleOrderTypeSelect = (tipo: number) => {
    setShowOrderTypeSheet(false);
    resetDraft();
    setTipoVenta(tipo);
    router.push('/(tabs)/vender/crear' as any);
  };

  const renderItem = useCallback(
    ({ item }: { item: Pedido }) => (
      <Card
        className="mx-4 mb-3"
        onPress={() => router.push(`/(tabs)/vender/${item.id}` as any)}
      >
        <View style={styles.orderRow}>
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
                <Calendar size={11} color={COLORS.textTertiary} />
                <Text style={styles.dateText}>
                  {formatDate(item.fechaPedido || item.createdAt)}
                </Text>
              </View>
              <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} style={{ marginLeft: 4 }} />
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
      {/* Custom Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.screenTitle}>Pedidos</Text>
      </View>

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
                accessibilityLabel={`Filtro: ${filter.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
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
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_data, index) => ({
          length: ITEM_SLOT,
          offset: ITEM_SLOT * index,
          index,
        })}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => performSync()} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ShoppingCart size={48} color={COLORS.textTertiary} />}
            title="Sin pedidos"
            message="No tienes pedidos registrados"
            actionText="Crear Pedido"
            onAction={handleFabPress}
          />
        }
      />

      {/* FAB Nuevo Pedido */}
      <TouchableOpacity
        testID="fab-nuevo-pedido"
        style={styles.fab}
        onPress={handleFabPress}
        activeOpacity={0.85}
        accessibilityLabel="Nuevo pedido"
        accessibilityRole="button"
      >
        <Plus size={24} color={COLORS.headerText} />
      </TouchableOpacity>

      {/* BottomSheet for order type (Supervisor/Admin) */}
      <BottomSheet
        visible={showOrderTypeSheet}
        title="¿Qué tipo de pedido?"
        subtitle="Selecciona el tipo de venta"
        onClose={() => setShowOrderTypeSheet(false)}
      >
        <View style={styles.orderTypeOptions}>
          <TouchableOpacity
            style={styles.orderTypeCard}
            onPress={() => handleOrderTypeSelect(0)}
            activeOpacity={0.85}
            accessibilityLabel="Preventa"
            accessibilityRole="button"
          >
            <ClipboardList size={24} color="#6b7280" />
            <View style={styles.orderTypeInfo}>
              <Text style={styles.orderTypeTitle}>Preventa</Text>
              <Text style={styles.orderTypeDesc}>Registrar pedido para entrega posterior</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.orderTypeCard}
            onPress={() => handleOrderTypeSelect(1)}
            activeOpacity={0.85}
            accessibilityLabel="Venta Directa"
            accessibilityRole="button"
          >
            <Truck size={24} color="#6b7280" />
            <View style={styles.orderTypeInfo}>
              <Text style={styles.orderTypeTitle}>Venta Directa</Text>
              <Text style={styles.orderTypeDesc}>Vender, cobrar y entregar ahora</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  customHeader: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.headerBg },
  screenTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  filterSection: { backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  filterScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  countRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6 },
  countBadge: { backgroundColor: COLORS.button, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 28, alignItems: 'center' },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.headerText },
  countText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.border, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.button, borderColor: COLORS.button },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.headerText },
  listContent: { paddingTop: 12, paddingBottom: 80 },
  orderRow: { flexDirection: 'row', alignItems: 'center' },
  orderContent: { flex: 1 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  orderNumber: { fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  clientName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  orderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: COLORS.textTertiary },
  totalText: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen },
  fab: {
    position: 'absolute', right: 20, bottom: 90, width: 56, height: 56, borderRadius: 16,
    backgroundColor: COLORS.button,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.button, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  orderTypeOptions: { gap: 12 },
  orderTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  orderTypeInfo: { flex: 1 },
  orderTypeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  orderTypeDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});

export default function VenderListScreen() {
  return (
    <ErrorBoundary componentName="TabVender">
      <VenderListScreenContent />
    </ErrorBoundary>
  );
}
