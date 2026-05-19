import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Route, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react-native';
import { api } from '@/api/client';
import { EmptyState } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { useTenantLocale } from '@/hooks';

// Bug #7 (audit 2026-05-07): la pantalla antes leía la tabla `rutas` de
// WatermelonDB con `Q.where('usuario_id', userId)`. El WDB solo mantiene
// la ruta del día + pendientes (pulled del sync), así que el historial
// salía vacío. Ahora consulta el endpoint nuevo `/api/mobile/rutas/historico`
// que devuelve rutas en estado Completada/Cerrada/Cancelada del vendedor.
//
// No persistimos el resultado en WDB porque el historial se usa siempre
// online (el vendedor abre la pantalla, fetchea, ve la lista — no necesita
// offline porque no es flujo crítico de venta).

interface RutaHistoricoItem {
  id: number;
  nombre: string;
  fecha: string; // ISO
  estado: number;
  zonaNombre?: string | null;
}

const ESTADO_LABELS: Record<number, string> = {
  0: 'Planificada', 1: 'En progreso', 2: 'Completada', 3: 'Cancelada',
  4: 'Pend. aceptar', 5: 'Carga aceptada', 6: 'Cerrada',
};
const ESTADO_COLORS: Record<number, string> = {
  0: '#94a3b8', 1: '#2563eb', 2: '#16a34a', 3: '#dc2626',
  4: '#d97706', 5: '#2563eb', 6: '#16a34a',
};

export default function HistorialRutasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { date: fmt } = useTenantLocale();
  const formatDate = (date: Date | null) => (date ? fmt(date) : '--');
  const [rutas, setRutas] = useState<RutaHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRutas = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await api.get<{ success: boolean; data: RutaHistoricoItem[]; count: number }>(
        '/api/mobile/rutas/historico',
        { params: { limit: 30 } }
      );
      setRutas(res.data?.data ?? []);
    } catch (err: any) {
      // Audit 2026-05-18: ya no silenciamos errores. Logueamos para
      // diagnóstico y mostramos mensaje al user — ocultar el error
      // hacía aparecer "Sin rutas" cuando en realidad había auth/network
      // issue, confundiendo al vendedor.
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (__DEV__) console.warn('[historial-rutas] fetch failed', status, code, err?.message);

      if (code === 'SESSION_REVOKED' || code === 'DEVICE_REVOKED') {
        setErrorMsg('Tu sesión fue cerrada. Inicia sesión de nuevo.');
      } else if (err?.isNetworkError || !err?.response) {
        setErrorMsg('Sin conexión. Verifica tu red.');
      } else if (status && status >= 500) {
        setErrorMsg('Error del servidor. Intenta más tarde.');
      } else {
        setErrorMsg('No se pudo cargar el historial. Intenta de nuevo.');
      }
      setRutas([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchRutas(); }, [fetchRutas]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRutas();
    setRefreshing(false);
  };

  const renderItem = useCallback(({ item }: { item: RutaHistoricoItem }) => {
    const estado = item.estado ?? 0;
    const color = ESTADO_COLORS[estado] || '#94a3b8';
    const label = ESTADO_LABELS[estado] || 'Desconocido';
    const isCompleted = estado === 2 || estado === 6;
    const isCancelled = estado === 3;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(tabs)/ruta` as any)}
        activeOpacity={0.7}
        accessibilityLabel={`Ruta: ${item.nombre}, ${label}`}
        accessibilityRole="button"
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
            {isCompleted ? <CheckCircle size={20} color={color} /> :
             isCancelled ? <XCircle size={20} color={color} /> :
             <Clock size={20} color={color} />}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.cardDate}>
              {formatDate(item.fecha ? new Date(item.fecha) : null)}
              {item.zonaNombre ? ` · ${item.zonaNombre}` : ''}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.estadoBadge, { color, backgroundColor: color + '15' }]}>{label}</Text>
            <ChevronRight size={16} color="#cbd5e1" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' }} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Rutas</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={rutas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          loading ? null : errorMsg ? (
            <EmptyState
              icon={<Route size={48} color="#dc2626" />}
              title="Error al cargar"
              message={errorMsg}
            />
          ) : (
            <EmptyState
              icon={<Route size={48} color="#cbd5e1" />}
              title="Sin rutas"
              message="No tienes rutas registradas"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.headerText, textAlign: 'center', flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  cardDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  estadoBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
});
