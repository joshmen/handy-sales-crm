import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { ShoppingBag, MapPin, Wallet, Clock } from 'lucide-react-native';
import { EmptyState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { useActividadEquipo } from '@/hooks/useSupervisor';
import type { ActividadItem } from '@/api/schemas/supervisor';

const TIPO_CONFIG: Record<string, { icon: typeof ShoppingBag; color: string; bg: string }> = {
  pedido: { icon: ShoppingBag, color: '#2563eb', bg: '#eff6ff' },
  visita: { icon: MapPin, color: '#7c3aed', bg: '#f5f3ff' },
  cobro: { icon: Wallet, color: '#16a34a', bg: '#f0fdf4' },
};

const ESTADO_COLORS: Record<string, string> = {
  completada: '#16a34a',
  entregado: '#16a34a',
  en_curso: '#d97706',
  enviado: '#d97706',
  registrado: '#2563eb',
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
    ({ item }: { item: ActividadItem }) => {
      const config = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.pedido;
      const Icon = config.icon;
      const estadoColor = ESTADO_COLORS[item.estado] ?? '#94a3b8';
      const vendorName = usuarios[String(item.usuarioId)] ?? '';

      return (
        <View style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: config.bg }]}>
            <Icon size={18} color={config.color} />
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
      );
    },
    [usuarios]
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Clock size={24} color="#2563eb" />
        <Text style={styles.loadingText}>Cargando actividad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
        renderItem={renderItem}
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
            icon={<Clock size={48} color="#cbd5e1" />}
            title="Sin actividad reciente"
            message="Aquí verás la actividad del equipo en tiempo real"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: '#64748b' },
  listContent: { paddingTop: 8, paddingBottom: 24 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  activityVendor: { fontSize: 11, color: '#64748b', fontWeight: '500', maxWidth: 120 },
  activityDot: { fontSize: 11, color: '#cbd5e1' },
  estadoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  estadoText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  activityRight: { alignItems: 'flex-end', marginLeft: 8 },
  activityMonto: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  activityTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
