import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { performSync } from '@/sync/syncEngine';
import { useSupervisorDashboard, useMisVendedores } from '@/hooks/useSupervisor';
import { formatCurrency } from '@/utils/format';
import { COLORS } from '@/theme/colors';
import type { VendedorEquipo } from '@/api/schemas/supervisor';

export function AdminDashboard() {
  const insets = useSafeAreaInsets();
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
    if (hour < 12) return 'Buenos dias';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const initials = (user?.name ?? 'A')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Separate supervisors and vendedores
  const supervisors = vendedores?.filter(v => v.rol === 'SUPERVISOR') ?? [];
  const topVendedores = vendedores?.filter(v => v.rol === 'VENDEDOR').slice(0, 3) ?? [];

  return (
    <ScrollView
      style={styles.container}
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
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      {/* KPI Cards */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{dashboard?.totalVendedores ?? 0}</Text>
          <Text style={styles.kpiLabel}>Vendedores</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{dashboard?.pedidosHoy ?? 0}</Text>
          <Text style={styles.kpiLabel}>Pedidos hoy</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: COLORS.salesGreen }]}>
            {formatCurrency(dashboard?.ventasMes ?? 0)}
          </Text>
          <Text style={styles.kpiLabel}>Ventas del día</Text>
        </View>
      </Animated.View>

      {/* Supervisores Section */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={styles.sectionLabel}>SUPERVISORES</Text>
        {supervisors.length > 0 ? (
          supervisors.map((v: VendedorEquipo) => (
            <PersonCard
              key={v.id}
              person={v}
              onPress={() => router.push(`/(tabs)/equipo/vendedor/${v.id}` as any)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sin supervisores registrados</Text>
          </View>
        )}
      </Animated.View>

      {/* Top Vendedores Section */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={styles.sectionLabel}>TOP VENDEDORES</Text>
        {topVendedores.length > 0 ? (
          topVendedores.map((v: VendedorEquipo) => (
            <PersonCard
              key={v.id}
              person={v}
              onPress={() => router.push(`/(tabs)/equipo/vendedor/${v.id}` as any)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sin vendedores registrados</Text>
          </View>
        )}
        {vendedores && vendedores.filter(v => v.rol === 'VENDEDOR').length > 3 && (
          <TouchableOpacity
            style={styles.verTodosBtn}
            onPress={() => router.push('/(tabs)/equipo')}
            activeOpacity={0.7}
          >
            <Text style={styles.verTodosText}>
              Ver todos ({vendedores.filter(v => v.rol === 'VENDEDOR').length})
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <Text style={styles.sectionLabel}>ACCIONES RAPIDAS</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/equipo')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Equipo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/equipo/mapa')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionText}>Mapa</Text>
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
  );
}

function PersonCard({ person, onPress }: { person: VendedorEquipo; onPress: () => void }) {
  const initials = person.nombre
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity style={styles.personCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.personAvatar}>
        <Text style={styles.personAvatarText}>{initials}</Text>
      </View>
      <View style={styles.personInfo}>
        <Text style={styles.personName}>{person.nombre}</Text>
        <Text style={styles.personEmail}>{person.email}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: person.activo ? '#22c55e' : '#ef4444' }]} />
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
    textTransform: 'capitalize',
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
  personCard: {
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
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  personInfo: { flex: 1, marginLeft: 12 },
  personName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  personEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 16,
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
