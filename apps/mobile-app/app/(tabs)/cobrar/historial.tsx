import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineCobros, useClientNameMap } from '@/hooks';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useTenantLocale } from '@/hooks';
import { METODO_PAGO } from '@/types/cobro';
import { Receipt, Banknote, ArrowRightLeft, FileText, CreditCard, MoreHorizontal, ChevronLeft } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type Cobro from '@/db/models/Cobro';
import { COLORS } from '@/theme/colors';

const METODO_ICONS: Record<number, React.ReactNode> = {
  0: <Banknote size={16} color="#6b7280" />,
  1: <ArrowRightLeft size={16} color="#6b7280" />,
  2: <FileText size={16} color="#6b7280" />,
  3: <CreditCard size={16} color="#6b7280" />,
  4: <CreditCard size={16} color="#6b7280" />,
  5: <MoreHorizontal size={16} color="#6b7280" />,
};

export default function HistorialCobrosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency, time: formatTime } = useTenantLocale();
  const [refreshing, setRefreshing] = useState(false);
  const { data: cobros, isLoading } = useOfflineCobros();
  const clientNames = useClientNameMap();

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Cobro; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)}>
      <TouchableOpacity
        style={styles.cobroItem}
        activeOpacity={0.7}
        onPress={() => router.push(`/(tabs)/cobrar/detalle-cobro/${item.id}` as any)}
        accessibilityLabel={`Cobro ${formatCurrency(item.monto)} ${clientNames.get(item.clienteId) || ''}`}
        accessibilityRole="button"
      >
        <View style={styles.cobroIconWrap}>
          {METODO_ICONS[item.metodoPago] || <Receipt size={16} color="#6b7280" />}
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
      </TouchableOpacity>
      </Animated.View>
    ),
    [clientNames, router]
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
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Cobros</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={cobros ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
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
            icon={<Receipt size={48} color="#cbd5e1" />}
            title="Sin cobros"
            message="No tienes cobros registrados"
            actionText="Registrar Cobro"
            onAction={() => router.push('/(tabs)/cobrar/registrar' as any)}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText },
  listContent: { paddingTop: 12, paddingBottom: 24 },
  cobroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cobroIconWrap: {
    marginRight: 10,
  },
  cobroContent: { flex: 1 },
  cobroCliente: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cobroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cobroMetodo: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  cobroDot: { fontSize: 11, color: '#cbd5e1' },
  cobroRef: { fontSize: 11, color: COLORS.textTertiary, flex: 1 },
  cobroRight: { alignItems: 'flex-end', marginLeft: 8 },
  cobroMonto: { fontSize: 15, fontWeight: '700', color: COLORS.salesGreen },
  cobroHora: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
});
