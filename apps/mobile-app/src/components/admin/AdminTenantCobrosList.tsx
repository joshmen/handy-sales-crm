import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Wallet, User } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTenantCobros } from '@/hooks/useSupervisor';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { TenantCobroListItem } from '@/api/schemas/supervisor';

/**
 * Tab Cobrar vista admin/supervisor — lista TODOS los cobros del tenant
 * del día con label del vendedor que los registró. Misma lógica que
 * AdminTenantPedidosList pero para cobros.
 */
function AdminTenantCobrosListContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { money: formatMoney } = useTenantLocale();

  const { data, isLoading, refetch } = useTenantCobros({ enabled: true, pageSize: 50 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: TenantCobroListItem; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(280)}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/(tabs)/cobrar/detalle-cobro/${item.id}` as any)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Cobro de ${item.clienteNombre} por ${formatMoney(item.monto)}, vendedor ${item.usuarioNombre}, método ${item.metodoPago}`}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconCircle}>
              <Wallet size={18} color={COLORS.primary} />
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardRow}>
              <Text style={styles.clientName} numberOfLines={1}>{item.clienteNombre}</Text>
              <Text style={styles.amount}>{formatMoney(item.monto)}</Text>
            </View>
            <View style={styles.cardRowSecondary}>
              <View style={styles.vendedorBadge}>
                <User size={11} color={COLORS.textSecondary} />
                <Text style={styles.vendedorText} numberOfLines={1}>{item.usuarioNombre}</Text>
              </View>
              <Text style={styles.estadoText}>{item.metodoPago}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </Animated.View>
    ),
    [router, formatMoney]
  );

  if (isLoading && !data) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const cobros = data?.data ?? [];

  return (
    <FlatList
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      data={cobros}
      keyExtractor={(it) => `tenant-cobro-${it.id}`}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cobros hoy</Text>
          <Text style={styles.headerSubtitle}>
            {data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'cobro' : 'cobros'} en toda la empresa
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={[styles.center, { paddingTop: 60 }]}>
          <Wallet size={48} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>Sin cobros hoy</Text>
          <Text style={styles.emptyHint}>Cuando los vendedores registren cobros aparecerán aquí.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 0, paddingTop: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.foreground },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: { marginRight: 12 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardRowSecondary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 },
  clientName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  amount: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen },
  vendedorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 1,
  },
  vendedorText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', flexShrink: 1 },
  estadoText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500', textTransform: 'capitalize' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.foreground, marginTop: 12 },
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});

export function AdminTenantCobrosList() {
  return (
    <ErrorBoundary componentName="AdminTenantCobrosList">
      <AdminTenantCobrosListContent />
    </ErrorBoundary>
  );
}
