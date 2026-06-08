import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import {
  Fuel, Receipt, Coffee, Bed, Wrench, ParkingSquare, FileQuestion,
  ChevronLeft, Plus, CheckCircle2, Circle, CloudOff,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores';
import { useOfflineGastos } from '@/hooks/useOfflineGastos';
import { performSync } from '@/sync/syncEngine';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import { database } from '@/db/database';
import type Gasto from '@/db/models/Gasto';
import type Attachment from '@/db/models/Attachment';

const TIPO_META: Record<number, { label: string; icon: any; color: string }> = {
  0: { label: 'Combustible', icon: Fuel, color: '#f97316' },
  1: { label: 'Peaje', icon: Receipt, color: '#3b82f6' },
  2: { label: 'Comida', icon: Coffee, color: '#eab308' },
  3: { label: 'Hospedaje', icon: Bed, color: '#8b5cf6' },
  4: { label: 'Mantenimiento', icon: Wrench, color: '#6b7280' },
  5: { label: 'Estacionamiento', icon: ParkingSquare, color: '#10b981' },
  99: { label: 'Otro', icon: FileQuestion, color: '#94a3b8' },
};

function GastosListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency } = useTenantLocale();
  const user = useAuthStore(s => s.user);
  const userIdNum = user ? (typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10)) : 0;

  const { data: gastosRaw } = useOfflineGastos(userIdNum);
  const gastos: Gasto[] = useMemo(() => gastosRaw ?? [], [gastosRaw]);

  // Map gasto_local_id -> attachment status para badge offline-aware:
  // - 'uploaded' o 'pending' o 'failed': hay foto local (badge "Foto" o "Por subir")
  // - undefined: no hay attachment local (puede tener URL remota stampeada igual)
  const [attachmentByGasto, setAttachmentByGasto] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const collection = database.get<Attachment>('attachments');
        const records = await collection
          .query(Q.where('event_type', 'gasto'))
          .fetch();
        const map: Record<string, string> = {};
        for (const a of records) {
          map[a.eventLocalId] = a.uploadStatus;
        }
        if (!cancelled) setAttachmentByGasto(map);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [gastos.length]);

  const totalHoy = useMemo(() => {
    const todayMs = new Date(); todayMs.setHours(0, 0, 0, 0);
    return gastos
      .filter(g => g.fechaGasto && g.fechaGasto.getTime() >= todayMs.getTime() && g.estado === 0)
      .reduce((sum, g) => sum + (g.monto ?? 0), 0);
  }, [gastos]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis gastos</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/ruta/gastos/nuevo' as any)}
          style={styles.headerBtn}
          testID="btn-nuevo-gasto"
        >
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.kpi}>
        <Text style={styles.kpiLabel}>Gastos de hoy</Text>
        <Text style={styles.kpiValue}>{formatCurrency(totalHoy)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => performSync().catch(() => {})} />
        }
      >
        {gastos.length === 0 ? (
          <View style={styles.empty}>
            <Receipt size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No has registrado gastos</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/ruta/gastos/nuevo' as any)}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Registrar uno</Text>
            </TouchableOpacity>
          </View>
        ) : (
          gastos.map((g) => {
            const meta = TIPO_META[g.tipoGasto] ?? TIPO_META[99];
            const Icon = meta.icon;
            const isInvalidado = g.estado === 1;
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.card, isInvalidado && { opacity: 0.5 }]}
                onPress={() => router.push(`/(tabs)/ruta/gastos/${g.id}` as any)}
                testID={`gasto-${g.id}`}
              >
                <View style={[styles.cardIcon, { backgroundColor: `${meta.color}20` }]}>
                  <Icon size={24} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardConcepto}>{g.concepto}</Text>
                  <Text style={styles.cardMeta}>
                    {meta.label} - {g.fechaGasto ? new Date(g.fechaGasto).toLocaleDateString('es-MX') : ''}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardMonto}>{formatCurrency(g.monto)}</Text>
                  {(() => {
                    // Badge offline-aware: prioridad URL remota > attachment local > nada
                    const attachStatus = attachmentByGasto[g.id];
                    const hasRemote = !!g.comprobanteUrl;
                    const hasLocalPending = attachStatus === 'pending' || attachStatus === 'failed' || attachStatus === 'uploading';
                    const hasUploaded = attachStatus === 'uploaded';
                    if (hasRemote || hasUploaded) {
                      return (
                        <View style={styles.chipOk}>
                          <CheckCircle2 size={11} color="#10b981" />
                          <Text style={styles.chipText}>Foto</Text>
                        </View>
                      );
                    }
                    if (hasLocalPending) {
                      return (
                        <View style={styles.chipPending}>
                          <CloudOff size={11} color="#3b82f6" />
                          <Text style={styles.chipTextPending}>Por subir</Text>
                        </View>
                      );
                    }
                    return (
                      <View style={styles.chipNo}>
                        <Circle size={11} color="#f59e0b" />
                        <Text style={styles.chipTextWarn}>Sin foto</Text>
                      </View>
                    );
                  })()}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  kpi: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  kpiLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 28, fontWeight: '700', color: COLORS.foreground, marginTop: 4 },
  scroll: { padding: 16 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#9ca3af', marginTop: 12 },
  emptyBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, backgroundColor: COLORS.primary },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardConcepto: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardMonto: { fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  chipOk: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, backgroundColor: '#dcfce7' },
  chipNo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, backgroundColor: '#fef3c7' },
  chipPending: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, backgroundColor: '#dbeafe' },
  chipText: { fontSize: 10, color: '#10b981', fontWeight: '600' },
  chipTextWarn: { fontSize: 10, color: '#f59e0b', fontWeight: '600' },
  chipTextPending: { fontSize: 10, color: '#3b82f6', fontWeight: '600' },
});

export default withErrorBoundary(GastosListScreen, 'GastosList');
