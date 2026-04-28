import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SbOrders, SbMap, SbPayments } from '@/components/icons/DashboardIcons';
import { EmptyState } from '@/components/ui';
import { useTenantLocale } from '@/hooks';
import { useActividadEquipo } from '@/hooks/useSupervisor';
import { COLORS } from '@/theme/colors';
import type { ActividadItem } from '@/api/schemas/supervisor';

const TIPO_CONFIG: Record<string, { icon: any; label: string }> = {
  pedido: { icon: SbOrders, label: 'Pedido' },
  visita: { icon: SbMap, label: 'Visita' },
  cobro: { icon: SbPayments, label: 'Cobro' },
};

const ESTADO_COLORS: Record<string, string> = {
  completada: '#16a34a',
  entregado: '#16a34a',
  confirmado: '#4338CA',
  en_curso: '#d97706',
  en_ruta: '#ea580c',
  enviado: '#4338CA', // Legacy — maps to confirmado color
  registrado: '#4338CA',
  borrador: '#94a3b8',
};

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `hace ${diffDays}d`;
}

export default function ActividadEquipoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency } = useTenantLocale();
  const [refreshing, setRefreshing] = useState(false);
  const { data: actividad, isLoading, refetch } = useActividadEquipo();

  const usuarios = actividad?.usuarios ?? {};
  const items = actividad?.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: ActividadItem; index: number }) => {
      const config = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.pedido;
      const Icon = config.icon;
      const estadoColor = ESTADO_COLORS[item.estado] ?? '#94a3b8';
      const vendorName = usuarios[String(item.usuarioId)] ?? '';

      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)}>
          <View style={styles.activityItem}>
            <View style={styles.activityIconContainer}>
              <Icon size={18} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityDesc} numberOfLines={2}>{item.descripcion}</Text>
              <View style={styles.activityMeta}>
                {vendorName ? (
                  <>
                    <Text style={styles.activityVendor} numberOfLines={1}>{vendorName}</Text>
                    <Text style={styles.activityDot}>·</Text>
                  </>
                ) : null}
                <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '18' }]}>
                  <Text style={[styles.estadoText, { color: estadoColor }]}>{item.estado}</Text>
                </View>
              </View>
            </View>
            <View style={styles.activityRight}>
              {item.monto != null && item.monto > 0 && (
                <Text style={styles.activityMonto}>{formatCurrency(item.monto)}</Text>
              )}
              <Text style={styles.activityTime}>{formatRelativeTime(item.fecha)}</Text>
            </View>
          </View>
        </Animated.View>
      );
    },
    [usuarios]
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Clock size={24} color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando actividad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header con back */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>Actividad</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
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
            icon={<Clock size={48} color={COLORS.textTertiary} />}
            title="Sin actividad reciente"
            message="Aquí verás la actividad del equipo en tiempo real"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  backBtn: { width: 32, alignItems: 'center' as const },
  blueHeaderTitle: { fontSize: 20, fontWeight: '700' as const, color: COLORS.headerText, textAlign: 'center' as const, flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  listContent: { paddingTop: 8, paddingBottom: 24 },
  activityItem: {
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIconContainer: {
    marginRight: 10,
  },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  activityVendor: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', maxWidth: 120 },
  activityDot: { fontSize: 11, color: COLORS.textTertiary },
  estadoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  estadoText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  activityRight: { alignItems: 'flex-end', marginLeft: 8 },
  activityMonto: { fontSize: 14, fontWeight: '700', color: COLORS.salesGreen },
  activityTime: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
});
