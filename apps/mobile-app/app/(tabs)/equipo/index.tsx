import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useSupervisorDashboard, useMisVendedores } from '@/hooks/useSupervisor';
import { useTenantLocale } from '@/hooks';
import { SbTeam } from '@/components/icons/DashboardIcons';
import { useState } from 'react';
import { COLORS } from '@/theme/colors';
import type { VendedorEquipo } from '@/api/schemas/supervisor';
import { useAuthStore } from '@/stores';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function VendedorRow({ vendedor, onPress }: { vendedor: VendedorEquipo; onPress: () => void }) {
  const initials = vendedor.nombre
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      style={styles.vendedorRow}
      onPress={onPress}
      testID={`vendedor-${vendedor.id}`}
      accessibilityLabel={`${vendedor.nombre}, ${vendedor.activo ? 'Activo' : 'Inactivo'}`}
      accessibilityRole="button"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.vendedorInfo}>
        <Text style={styles.vendedorName}>{vendedor.nombre}</Text>
        <Text style={styles.vendedorEmail}>{vendedor.email}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: vendedor.activo ? '#22c55e' : '#ef4444' }]} />
    </Pressable>
  );
}

function EquipoContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: dashboard, isLoading: loadingDash, refetch: refetchDash } = useSupervisorDashboard();
  const { data: vendedores, isLoading: loadingVend, refetch: refetchVend } = useMisVendedores();
  const [refreshing, setRefreshing] = useState(false);
  const role = useAuthStore(s => s.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const { currency, locale } = useTenantLocale();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDash(), refetchVend()]);
    setRefreshing(false);
  };

  // Compact KPI format: $1.5M / $250K / $987 — usa Intl.NumberFormat compact con
  // currency del tenant. Si tenant es MX → $1.5M; si CO → COP 1.5M; etc.
  const formatMoney = (n: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        style: 'currency',
        currency: currency || 'MXN',
        maximumFractionDigits: 1,
      }).format(n);
    } catch {
      return `$${n.toFixed(0)}`;
    }
  };

  if (loadingDash && loadingVend) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando equipo...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Mi Equipo</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => router.push('/(tabs)/equipo/actividad')}
            testID="ver-actividad"
            accessibilityLabel="Ver actividad del equipo"
            accessibilityRole="button"
          >
            <Text style={styles.headerBtnText}>Actividad</Text>
          </Pressable>
          <Pressable
            style={styles.headerBtn}
            onPress={() => router.push('/(tabs)/equipo/mapa')}
            testID="ver-mapa"
            accessibilityLabel="Ver mapa del equipo"
            accessibilityRole="button"
          >
            <Text style={styles.headerBtnText}>Ver mapa</Text>
          </Pressable>
        </View>
      </View>

      {/* KPIs — white cards, no colored borders or icon circles */}
      {dashboard && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.kpiGrid} testID="supervisor-kpis">
          <KpiCard label="Vendedores" value={dashboard.totalVendedores} />
          <KpiCard label="Pedidos hoy" value={dashboard.pedidosHoy} />
          <KpiCard label="Ventas mes" value={formatMoney(dashboard.ventasMes)} />
          <KpiCard label="Visitas hoy" value={`${dashboard.visitasCompletadasHoy}/${dashboard.visitasHoy}`} />
          <KpiCard label="Pedidos mes" value={dashboard.pedidosMes} />
          <KpiCard label="Clientes" value={dashboard.totalClientes} />
        </Animated.View>
      )}

      {/* Vendedores list */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <Text style={styles.sectionLabel}>VENDEDORES</Text>
        {vendedores && vendedores.length > 0 ? (
          vendedores.map(v => (
            <VendedorRow
              key={v.id}
              vendedor={v}
              onPress={() => router.push(`/(tabs)/equipo/vendedor/${v.id}` as any)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <SbTeam size={32} />
            <Text style={styles.emptyText}>
              {isAdmin ? 'Sin vendedores registrados' : 'No tienes vendedores asignados'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isAdmin
                ? 'Da de alta vendedores desde el portal web para verlos aquí'
                : 'Pide al administrador que te asigne vendedores'}
            </Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  headerButtons: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.headerText },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10,
  },
  kpiCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: { fontSize: 20, fontWeight: '700', color: COLORS.foreground },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  vendedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  vendedorInfo: { flex: 1 },
  vendedorName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  vendedorEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtext: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center' },
});

export default function EquipoScreen() {
  return (
    <ErrorBoundary componentName="TabEquipo">
      <EquipoContent />
    </ErrorBoundary>
  );
}
