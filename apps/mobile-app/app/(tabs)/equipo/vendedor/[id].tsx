import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Clock, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useVendedorResumen } from '@/hooks/useSupervisor';
import { useTenantLocale } from '@/hooks';
import { useState } from 'react';
import { COLORS } from '@/theme/colors';
import type { VendedorDiaConFecha } from '@/api/schemas/supervisor';

type Preset = 'hoy' | 'ayer' | '7d';

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

function formatDayLabel(fechaIso: string): string {
  // Devuelve "Lun 28 abr" en español. fechaIso es YYYY-MM-DD del backend
  // (ya en TZ del tenant), así que se parsea como hora local sin shift.
  const [y, m, d] = fechaIso.split('-').map(n => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function isToday(fechaIso: string): boolean {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  // Aproximación — si el server y el cliente discrepan en TZ esto puede fallar.
  // Aceptable para destacar visualmente "hoy" en la lista.
  return fechaIso === today;
}

/**
 * Calcula la fecha de "ayer" en formato YYYY-MM-DD usando la TZ local del
 * device. El backend ignora horas y solo lee el string de fecha, así que
 * aproximación es OK para el preset "Ayer".
 */
function getAyerIsoLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function VendedorDetalleContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendedorId = parseInt(id, 10);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [preset, setPreset] = useState<Preset>('hoy');

  const queryOpts = preset === '7d'
    ? { rango: '7d' as const }
    : preset === 'ayer'
      ? { fecha: getAyerIsoLocal() }
      : undefined; // 'hoy' = sin params (default backend = hoy en TZ tenant)

  const { data: resumen, isLoading, refetch } = useVendedorResumen(vendedorId, queryOpts);
  const [refreshing, setRefreshing] = useState(false);
  const { money: formatMoney } = useTenantLocale();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const Header = (
    <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }} accessibilityLabel="Volver" accessibilityRole="button">
        <ChevronLeft size={22} color={COLORS.headerText} />
      </TouchableOpacity>
      <Text style={styles.blueHeaderTitle}>Detalle Vendedor</Text>
      <View style={{ width: 32 }} />
    </View>
  );

  if (isLoading && !resumen) {
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

  const { vendedor, hoy, dias, totalClientes, ultimaUbicacion } = resumen;
  const initials = vendedor.nombre.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const sectionLabel = preset === '7d' ? 'ÚLTIMOS 7 DÍAS' : preset === 'ayer' ? 'RESUMEN DE AYER' : 'RESUMEN DEL DÍA';

  return (
    <View style={styles.container}>
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' as const }} accessibilityLabel="Volver" accessibilityRole="button">
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

      {/* Preset selector — Hoy / Ayer / 7d */}
      <View style={styles.presetRow}>
        {(['hoy', 'ayer', '7d'] as const).map((p) => {
          const label = p === 'hoy' ? 'Hoy' : p === 'ayer' ? 'Ayer' : '7 días';
          const active = preset === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setPreset(p)}
              style={[styles.presetBtn, active && styles.presetBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={`Mostrar ${label}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats: hoy/ayer = grid 5 cards; 7d = lista por día */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>

          {preset === '7d' && dias && dias.length > 0 ? (
            <View style={styles.diasList}>
              {dias.map((d: VendedorDiaConFecha) => (
                <View
                  key={d.fecha}
                  style={[styles.diaRow, isToday(d.fecha) && styles.diaRowHighlight]}
                >
                  <View style={styles.diaHeader}>
                    <Text style={[styles.diaFecha, isToday(d.fecha) && { color: COLORS.primary }]}>
                      {formatDayLabel(d.fecha)}{isToday(d.fecha) ? ' · Hoy' : ''}
                    </Text>
                  </View>
                  <View style={styles.diaChips}>
                    <Text style={styles.diaChip}>{d.pedidos} pedidos</Text>
                    <Text style={[styles.diaChip, { color: COLORS.salesGreen }]}>{formatMoney(d.ventas)}</Text>
                    <Text style={[styles.diaChip, { color: COLORS.salesGreen }]}>{formatMoney(d.cobros)} cob</Text>
                    <Text style={styles.diaChip}>{d.visitasCompletadas}/{d.visitas} vis</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // Hoy / Ayer = single-day grid
            <View style={styles.statGrid} testID="vendedor-stats">
              <StatCard label="Pedidos" value={hoy?.pedidos ?? 0} />
              <StatCard label="Ventas" value={formatMoney(hoy?.ventas ?? 0)} isMoney />
              <StatCard label="Visitas" value={`${hoy?.visitasCompletadas ?? 0}/${hoy?.visitas ?? 0}`} />
              <StatCard label="Cobros" value={formatMoney(hoy?.cobros ?? 0)} isMoney />
              <StatCard label="Clientes" value={totalClientes} />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Last known location — siempre el último ping registrado, no filtrado por fecha */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ÚLTIMA UBICACIÓN</Text>
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
              <Text style={styles.noLocationText}>Sin ubicación registrada</Text>
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
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  presetTextActive: { color: '#ffffff' },
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
  diasList: {
    gap: 8,
  },
  diaRow: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  diaRowHighlight: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  diaHeader: {
    marginBottom: 6,
  },
  diaFecha: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
    textTransform: 'capitalize',
  },
  diaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  diaChip: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
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
