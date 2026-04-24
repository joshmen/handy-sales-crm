import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Clock, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useVendedorResumen } from '@/hooks/useSupervisor';
import { useState } from 'react';
import { COLORS } from '@/theme/colors';

function StatCard({ label, value, isMoney }: { label: string; value: string | number; isMoney?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, isMoney && { color: COLORS.salesGreen }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)} días`;
}

function VendedorDetalleContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendedorId = parseInt(id, 10);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: resumen, isLoading, refetch } = useVendedorResumen(vendedorId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

  const Header = (
    <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }} accessibilityLabel="Volver" accessibilityRole="button">
        <ChevronLeft size={22} color={COLORS.headerText} />
      </TouchableOpacity>
      <Text style={styles.blueHeaderTitle}>Detalle Vendedor</Text>
      <View style={{ width: 32 }} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!resumen) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={[styles.center, { flex: 1, paddingHorizontal: 24 }]}>
          <Text style={styles.errorText}>Vendedor no encontrado</Text>
          <Text style={styles.errorHint}>Es posible que ya no pertenezca a tu equipo o haya sido desactivado.</Text>
        </View>
      </View>
    );
  }

  const { vendedor, hoy, totalClientes, ultimaUbicacion } = resumen;
  const initials = vendedor.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Blue Header — fixed outside scroll */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.blueHeaderTitle}>Detalle Vendedor</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
      {/* Profile header */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{vendedor.nombre}</Text>
          <Text style={styles.profileEmail}>{vendedor.email}</Text>
          <View style={[styles.statusBadge, { backgroundColor: vendedor.activo ? '#dcfce7' : '#f1f5f9' }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: vendedor.activo ? '#22c55e' : '#ef4444' }]} />
            <Text style={[styles.statusText, { color: vendedor.activo ? '#16a34a' : '#dc2626' }]}>
              {vendedor.activo ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Today's stats — white cards, no colored top borders */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RESUMEN DEL DÍA</Text>
          <View style={styles.statGrid} testID="vendedor-stats">
            <StatCard label="Pedidos" value={hoy.pedidos} />
            <StatCard label="Ventas" value={formatMoney(hoy.ventas)} isMoney />
            <StatCard label="Visitas" value={`${hoy.visitasCompletadas}/${hoy.visitas}`} />
            <StatCard label="Cobros" value={formatMoney(hoy.cobros)} isMoney />
            <StatCard label="Clientes" value={totalClientes} />
          </View>
        </View>
      </Animated.View>

      {/* Last known location */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ULTIMA UBICACION</Text>
          {ultimaUbicacion ? (
            <View style={styles.locationCard}>
              <View style={styles.locationRow}>
                <MapPin size={18} color={COLORS.headerBg} />
                <Text style={styles.locationClient}>{ultimaUbicacion.clienteNombre ?? 'Ubicación desconocida'}</Text>
              </View>
              <View style={styles.locationRow}>
                <Clock size={14} color={COLORS.textTertiary} />
                <Text style={styles.locationTime}>{formatTimeAgo(ultimaUbicacion.fecha)}</Text>
              </View>
              <Text style={styles.locationCoords}>
                {ultimaUbicacion.latitud.toFixed(4)}, {ultimaUbicacion.longitud.toFixed(4)}
              </Text>
            </View>
          ) : (
            <View style={styles.locationCard}>
              <MapPin size={24} color={COLORS.textTertiary} />
              <Text style={styles.noLocationText}>Sin ubicacion registrada hoy</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blueHeader: { backgroundColor: COLORS.headerBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  blueHeaderTitle: { fontSize: 17, fontWeight: '700', color: COLORS.headerText, textAlign: 'center', flex: 1 },
  scrollContent: { paddingTop: 8 },
  errorText: { fontSize: 16, fontWeight: '600', color: COLORS.foreground, textAlign: 'center' },
  errorHint: { marginTop: 8, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarLargeText: { fontSize: 24, fontWeight: '700', color: '#6b7280' },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.foreground },
  profileEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10,
  },
  statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  section: { marginTop: 16, paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
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
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.foreground },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationClient: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  locationTime: { fontSize: 13, color: COLORS.textSecondary },
  locationCoords: { fontSize: 11, color: COLORS.textTertiary, fontFamily: 'monospace' },
  noLocationText: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center' },
});

export default function VendedorDetalleScreen() {
  return (
    <ErrorBoundary componentName="VendedorDetalle">
      <VendedorDetalleContent />
    </ErrorBoundary>
  );
}
