import { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText, ChevronRight } from 'lucide-react-native';
import { useFacturasList } from '@/hooks/useFacturas';
import { EmptyState, LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { COLORS } from '@/theme/colors';
import type { FacturaListItem } from '@/api/facturas';

const ESTADO_COLORS: Record<string, string> = {
  TIMBRADA: '#16a34a',
  PENDIENTE: '#d97706',
  CANCELADA: '#dc2626',
  ERROR: '#dc2626',
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '--';
  }
}

export default function FacturasListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useFacturasList();

  const facturas: FacturaListItem[] = Array.isArray(data) ? data : [];

  const renderItem = useCallback(
    ({ item }: { item: FacturaListItem }) => {
      const color = ESTADO_COLORS[item.estado] ?? '#94a3b8';
      const label = item.serie && item.folio ? `${item.serie}-${item.folio}` : `#${item.id}`;
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/(tabs)/facturas/${item.id}` as any)}
          activeOpacity={0.7}
          accessibilityLabel={`Factura ${label}, ${item.estado}, ${item.receptorNombre}`}
          accessibilityRole="button"
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
              <FileText size={20} color={color} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardFolio} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.cardCliente} numberOfLines={1}>
                {item.receptorNombre}
              </Text>
              <Text style={styles.cardMeta}>
                {formatDate(item.fechaEmision)} · {formatCurrency(item.total)}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.estadoBadge, { color, backgroundColor: color + '15' }]}>
                {item.estado}
              </Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 32, alignItems: 'center' }}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facturas</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <LoadingSpinner message="Cargando facturas..." />
      ) : (
        <FlatList
          data={facturas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<FileText size={48} color="#cbd5e1" />}
              title="Sin facturas"
              message="Las facturas timbradas desde el portal web aparecerán aquí"
            />
          }
        />
      )}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardFolio: { fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  cardCliente: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 6 },
  estadoBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
