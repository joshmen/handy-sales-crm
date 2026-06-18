import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Building2, RefreshCw } from 'lucide-react-native';
import { useAuthStore } from '@/stores';
import { useTenantLocale } from '@/hooks';
import { adminApi, type OverviewTenant } from '@/api/admin';
import { COLORS } from '@/theme/colors';

/**
 * Dashboard de salud de plataforma del super admin móvil (Opción A).
 * Muestra solo números agregados de TODA la plataforma (empresas activas,
 * pedidos y ventas del día/mes) más una lista read-only de empresas. NO permite
 * entrar a un tenant ni ver PII de clientes finales: el drill-down por empresa
 * (con auditoría) vive en la web.
 */
export function PlataformaDashboard() {
  const insets = useSafeAreaInsets();
  const userName = useAuthStore(s => s.user?.name);
  const { money } = useTenantLocale();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminApi.getOverview(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const tenants = data?.tenants ?? [];

  const renderItem = ({ item }: { item: OverviewTenant }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}><Building2 size={18} color={COLORS.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.cardMeta}>
          {item.plan ? `${item.plan} · ` : ''}{item.usuarios} usuario{item.usuarios === 1 ? '' : 's'}
          {item.activo ? '' : ' · Inactiva'}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPedidos}>{item.pedidosHoy}</Text>
        <Text style={styles.cardPedidosLabel}>hoy</Text>
      </View>
    </View>
  );

  const ListHeader = (
    <View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {data?.tenantsActivos ?? 0}
            <Text style={styles.kpiValueDim}>/{data?.tenantsTotal ?? 0}</Text>
          </Text>
          <Text style={styles.kpiLabel}>Empresas activas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{data?.pedidosHoy ?? 0}</Text>
          <Text style={styles.kpiLabel}>Pedidos hoy</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: COLORS.salesGreen }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(data?.ventasHoy ?? 0)}
          </Text>
          <Text style={styles.kpiLabel}>Ventas del día</Text>
        </View>
      </View>

      <View style={styles.ventasMesRow}>
        <Text style={styles.ventasMesLabel}>Ventas del mes (todas las empresas)</Text>
        <Text style={styles.ventasMesValue}>{money(data?.ventasMes ?? 0)}</Text>
      </View>

      <Text style={styles.sectionLabel}>EMPRESAS</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.greeting}>Plataforma</Text>
        <Text style={styles.sub}>{userName ? `${userName} · ` : ''}Salud de la plataforma</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : isError && !data ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No se pudo cargar la información de la plataforma.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.85}>
            <RefreshCw size={14} color="#fff" />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Sin empresas registradas</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.headerBg, paddingHorizontal: 20, paddingBottom: 18 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.headerText },
  sub: { fontSize: 13, color: COLORS.headerText, opacity: 0.85, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: COLORS.foreground },
  kpiValueDim: { fontSize: 14, fontWeight: '700', color: COLORS.textTertiary },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  ventasMesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  ventasMesLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  ventasMesValue: { fontSize: 18, fontWeight: '800', color: COLORS.salesGreen },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', minWidth: 36 },
  cardPedidos: { fontSize: 17, fontWeight: '800', color: COLORS.foreground },
  cardPedidosLabel: { fontSize: 10, color: COLORS.textTertiary, fontWeight: '600' },
});
