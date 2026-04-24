import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { performSync } from '@/sync/syncEngine';
import { useSupervisorDashboard, useMisVendedores } from '@/hooks/useSupervisor';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import type { VendedorEquipo } from '@/api/schemas/supervisor';

export function SupervisorDashboard() {
  const insets = useSafeAreaInsets();
  const { money: formatCurrency } = useTenantLocale();
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: dashboard, refetch: refetchDash } = useSupervisorDashboard();
  const { data: vendedores, refetch: refetchVend } = useMisVendedores();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([performSync(), refetchDash(), refetchVend()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const initials = (user?.name ?? 'S')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* Blue Header — fixed outside scroll */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Supervisor'}
            </Text>
            <Text style={styles.dateText}>
              {(() => {
                const s = new Date().toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                });
                return s.charAt(0).toUpperCase() + s.slice(1);
              })()}
            </Text>
          </View>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* KPI Cards */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{dashboard?.totalVendedores ?? 0}</Text>
          <Text style={styles.kpiLabel}>Vendedores activos</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{dashboard?.pedidosHoy ?? 0}</Text>
          <Text style={styles.kpiLabel}>Pedidos hoy</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: COLORS.salesGreen }]}>
            {formatCurrency(dashboard?.ventasMes ?? 0)}
          </Text>
          <Text style={styles.kpiLabel}>Ventas mes</Text>
        </View>
      </Animated.View>

      {/* Equipo Section */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={styles.sectionLabel}>EQUIPO</Text>
        {vendedores && vendedores.length > 0 ? (
          vendedores.slice(0, 5).map((v: VendedorEquipo) => (
            <VendedorCard
              key={v.id}
              vendedor={v}
              onPress={() => router.push(`/(tabs)/equipo/vendedor/${v.id}` as any)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tienes vendedores asignados</Text>
          </View>
        )}
        {vendedores && vendedores.length > 5 && (
          <TouchableOpacity
            style={styles.verTodosBtn}
            onPress={() => router.push('/(tabs)/equipo')}
            activeOpacity={0.7}
          >
            <Text style={styles.verTodosText}>Ver todos ({vendedores.length})</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={styles.sectionLabel}>ACCIONES RÁPIDAS</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/equipo/mapa')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Ver Mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/equipo/actividad')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Actividad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/equipo')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Reportes</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
    </View>
  );
}

function VendedorCard({ vendedor, onPress }: { vendedor: VendedorEquipo; onPress: () => void }) {
  const initials = vendedor.nombre
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity style={styles.vendedorCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.vendedorAvatar}>
        <Text style={styles.vendedorAvatarText}>{initials}</Text>
      </View>
      <View style={styles.vendedorInfo}>
        <Text style={styles.vendedorName}>{vendedor.nombre}</Text>
        <Text style={styles.vendedorEmail}>{vendedor.email}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: vendedor.activo ? '#22c55e' : '#ef4444' }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 24 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTextContainer: { flex: 1 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '700', color: COLORS.headerText },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.headerText },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 24, paddingHorizontal: 16 },
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
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  vendedorCard: {
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
  vendedorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendedorAvatarText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  vendedorInfo: { flex: 1, marginLeft: 12 },
  vendedorName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  vendedorEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
  verTodosBtn: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  verTodosText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 24, paddingHorizontal: 16 },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: { fontSize: 12, fontWeight: '600', color: COLORS.foreground },
});
