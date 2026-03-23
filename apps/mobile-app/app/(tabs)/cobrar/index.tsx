import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineOrders, useOfflineCobros, useClientNameMap } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { Wallet, ChevronRight, User } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';

interface ClienteSaldo {
  clienteId: string;
  clienteNombre: string;
  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;
}

export default function CobrarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: pedidos, isLoading: loadingPedidos } = useOfflineOrders();
  const { data: cobros, isLoading: loadingCobros } = useOfflineCobros();
  const clientNames = useClientNameMap();

  // Compute saldos per client from local WDB data
  const { clientes, resumen } = useMemo(() => {
    const byClient = new Map<string, { facturado: number; cobrado: number }>();

    // Sum order totals (exclude cancelled = estado 4, and drafts = estado 0)
    pedidos?.forEach((p) => {
      if (p.estado >= 1 && p.estado !== 4) {
        const entry = byClient.get(p.clienteId) ?? { facturado: 0, cobrado: 0 };
        entry.facturado += p.total || 0;
        byClient.set(p.clienteId, entry);
      }
    });

    // Sum cobro amounts
    cobros?.forEach((c) => {
      const entry = byClient.get(c.clienteId) ?? { facturado: 0, cobrado: 0 };
      entry.cobrado += c.monto || 0;
      byClient.set(c.clienteId, entry);
    });

    let totalFacturado = 0;
    let totalCobrado = 0;
    const saldos: ClienteSaldo[] = [];

    byClient.forEach((val, clienteId) => {
      totalFacturado += val.facturado;
      totalCobrado += val.cobrado;
      const saldoPendiente = val.facturado - val.cobrado;
      if (saldoPendiente > 0) {
        saldos.push({
          clienteId,
          clienteNombre: clientNames.get(clienteId) || 'Cliente',
          totalFacturado: val.facturado,
          totalCobrado: val.cobrado,
          saldoPendiente,
        });
      }
    });

    // Sort by saldo desc
    saldos.sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    return {
      clientes: saldos,
      resumen: {
        totalFacturado,
        totalCobrado,
        totalPendiente: totalFacturado - totalCobrado,
        clientesConSaldo: saldos.length,
      },
    };
  }, [pedidos, cobros, clientNames]);

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };

  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* Blue Header */}
        <View style={[styles.customHeader, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.screenTitle}>Cobranza</Text>
        </View>

        {/* Summary Cards */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: COLORS.salesGreen }]}>
                {formatCurrency(resumen.totalFacturado)}
              </Text>
              <Text style={styles.summaryLabel}>Facturado</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: COLORS.salesGreen }]}>
                {formatCurrency(resumen.totalCobrado)}
              </Text>
              <Text style={styles.summaryLabel}>Cobrado</Text>
            </View>
          </View>
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerLabel}>Pendiente de Cobro</Text>
            <Text style={styles.pendingBannerValue}>
              {formatCurrency(resumen.totalPendiente)}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.actionsRow}>
          <TouchableOpacity
            testID="btn-registrar-cobro"
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/(tabs)/cobrar/registrar' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Registrar Cobro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonOutline]}
            onPress={() => router.push('/(tabs)/cobrar/historial' as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, { color: COLORS.foreground }]}>Historial</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Section Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>SALDOS POR CLIENTE</Text>
        </View>
      </View>
    );
  }, [resumen, clientes.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: ClienteSaldo; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)}>
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
      </Animated.View>
    ),
    [router]
  );

  if (loadingPedidos && loadingCobros) {
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
        keyExtractor={(item) => item.clienteId}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 32 },
  customHeader: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  screenTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText },
  summarySection: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: COLORS.foreground, marginTop: 8 },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  pendingBanner: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingBannerLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  pendingBannerValue: { fontSize: 18, fontWeight: '800', color: '#dc2626' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientContent: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  clientMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textTertiary },
  metaDot: { fontSize: 11, color: '#cbd5e1' },
  clientRight: { alignItems: 'flex-end', marginLeft: 8, gap: 2 },
  saldoAmount: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.button,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonOutline: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headerText,
  },
});
