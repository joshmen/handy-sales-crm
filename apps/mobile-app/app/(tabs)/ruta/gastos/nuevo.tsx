import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { safeBack } from '@/utils/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import {
  Fuel, Receipt, Coffee, Bed, Wrench, ParkingSquare, FileQuestion,
  Camera, Image as ImageIcon, X, ChevronLeft, AlertTriangle, MapPin,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores';
import { database } from '@/db/database';
import { createGastoOffline } from '@/db/actions';
import { capturePhoto, pickFromGallery, saveAttachmentRecord } from '@/services/evidenceManager';
import { performSync } from '@/sync/syncEngine';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import Ruta from '@/db/models/Ruta';

// TipoGasto enum mirror del backend
const TIPOS_GASTO = [
  { value: 0, label: 'Combustible', icon: Fuel, color: '#f97316' },
  { value: 1, label: 'Peaje', icon: Receipt, color: '#3b82f6' },
  { value: 2, label: 'Comida', icon: Coffee, color: '#eab308' },
  { value: 3, label: 'Hospedaje', icon: Bed, color: '#8b5cf6' },
  { value: 4, label: 'Mantenimiento', icon: Wrench, color: '#6b7280' },
  { value: 5, label: 'Estacionamiento', icon: ParkingSquare, color: '#10b981' },
  { value: 99, label: 'Otro', icon: FileQuestion, color: '#94a3b8' },
] as const;

const CONCEPTOS_SUGERIDOS: Record<number, string> = {
  0: 'Gasolina',
  1: 'Peaje carretera',
  2: 'Comida',
  3: 'Hospedaje',
  4: 'Mantenimiento vehiculo',
  5: 'Estacionamiento',
  99: '',
};

function NuevoGastoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency } = useTenantLocale();
  const user = useAuthStore(s => s.user);

  const [tipoGasto, setTipoGasto] = useState<number>(0); // default Combustible
  const [montoTxt, setMontoTxt] = useState('');
  const [concepto, setConcepto] = useState(CONCEPTOS_SUGERIDOS[0]);
  const [notas, setNotas] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [rutaActivaCodigo, setRutaActivaCodigo] = useState<string | null>(null);
  const [rutaActivaId, setRutaActivaId] = useState<string | null>(null);
  const [rutaLoading, setRutaLoading] = useState(true);
  const [diasAtras, setDiasAtras] = useState<number>(0); // 0=Hoy, 1=Ayer, ..., 7=Max
  const [saving, setSaving] = useState(false);

  const fechaGastoComputed = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    return d;
  }, [diasAtras]);

  // Detectar ruta activa del dia. Si no hay, no se permite crear gasto.
  // FIX bug 29/5: backend guarda ruta.fecha como UTC midnight del calendar date
  // (ej. "2026-05-29 00:00:00Z"). Si comparamos con `setHours(0,0,0,0)` (local TZ),
  // en CDMX (UTC-6) eso es "2026-05-29 06:00 UTC" → ruta queda ANTES del rango y la
  // query no la encuentra. Solucion: usar Date.UTC(year, month, day) del calendar
  // date local — produce el mismo UTC midnight que el backend guarda.
  useEffect(() => {
    (async () => {
      if (!user) { setRutaLoading(false); return; }
      try {
        const userIdNum = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
        const now = new Date();
        const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowMs = todayMs + 24 * 3600 * 1000;
        const rutas = await database.get<Ruta>('rutas')
          .query(
            Q.where('usuario_id', userIdNum),
            Q.where('activo', true),
            Q.where('estado', Q.oneOf([1, 5])),
            Q.where('fecha', Q.gte(todayMs)),
            Q.where('fecha', Q.lt(tomorrowMs)),
          ).fetch();
        if (rutas.length > 0) {
          setRutaActivaId(rutas[0].id);
          setRutaActivaCodigo((rutas[0] as any).codigo ?? rutas[0].nombre);
        }
      } catch {}
      finally { setRutaLoading(false); }
    })();
  }, [user]);

  // Cuando cambia tipo, sugerir concepto si esta vacio
  useEffect(() => {
    if (!concepto || Object.values(CONCEPTOS_SUGERIDOS).includes(concepto)) {
      setConcepto(CONCEPTOS_SUGERIDOS[tipoGasto] ?? '');
    }
  }, [tipoGasto]); // eslint-disable-line

  const montoNum = parseFloat(montoTxt.replace(',', '.')) || 0;
  // Foto del comprobante OBLIGATORIA — el supervisor exige evidencia de cada gasto.
  // Ruta activa OBLIGATORIA — sin ruta el gasto no se puede imputar al corte del dia.
  const canSave = montoNum > 0 && concepto.trim().length > 0 && !!photoUri && !!rutaActivaId && !saving;

  const handleTakePhoto = async () => {
    const uri = await capturePhoto();
    if (uri) setPhotoUri(uri);
  };

  const handlePickPhoto = async () => {
    const uri = await pickFromGallery();
    if (uri) setPhotoUri(uri);
  };

  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    try {
      const gasto = await createGastoOffline({
        usuarioId: typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10),
        monto: montoNum,
        tipoGasto,
        concepto: concepto.trim(),
        notas: notas.trim() || undefined,
        rutaLocalId: rutaActivaId, // siempre attached (ruta obligatoria)
        fechaGasto: fechaGastoComputed,
      });

      // Si hay foto, guardar attachment record (sync lo subira)
      if (photoUri) {
        await saveAttachmentRecord({
          eventType: 'gasto',
          eventLocalId: gasto.id,
          tipo: 'receipt',
          localUri: photoUri,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Gasto registrado',
        text2: `${formatCurrency(montoNum)} - ${concepto}`,
        visibilityTime: 2500,
      });
      // Sync best-effort (no blocking)
      performSync().catch(() => {});
      safeBack('/(tabs)/ruta');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'No se pudo guardar el gasto',
        text2: err?.message ?? 'Error desconocido',
        visibilityTime: 4000,
      });
      setSaving(false);
    }
  };

  // Empty state: no hay ruta activa → no se puede registrar gasto.
  if (!rutaLoading && !rutaActivaId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack('/(tabs)/ruta')} style={styles.headerBtn}>
            <ChevronLeft size={24} color={COLORS.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo gasto</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.noRutaWrap}>
          <View style={styles.noRutaIcon}><AlertTriangle size={32} color="#d97706" /></View>
          <Text style={styles.noRutaTitle}>No tienes ruta activa</Text>
          <Text style={styles.noRutaText}>
            Los gastos deben imputarse a una ruta del dia.{'\n'}
            Acepta tu ruta antes de registrar gastos.
          </Text>
          <TouchableOpacity
            style={styles.noRutaBtn}
            onPress={() => router.replace('/(tabs)/ruta' as any)}
            testID="btn-ir-ruta"
          >
            <MapPin size={18} color="#fff" />
            <Text style={styles.noRutaBtnText}>Ir a Ruta del dia</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack('/(tabs)/ruta')} style={styles.headerBtn}>
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo gasto</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tipo gasto pills */}
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.tipoRow}>
            {TIPOS_GASTO.map((t) => {
              const Icon = t.icon;
              const active = tipoGasto === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTipoGasto(t.value)}
                  style={[styles.tipoPill, active && { backgroundColor: t.color, borderColor: t.color }]}
                  testID={`tipo-${t.value}`}
                >
                  <Icon size={18} color={active ? '#fff' : t.color} />
                  <Text style={[styles.tipoLabel, active && { color: '#fff' }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Monto */}
          <Text style={styles.label}>Monto</Text>
          <View style={styles.montoBox}>
            <Text style={styles.montoSign}>$</Text>
            <TextInput
              value={montoTxt}
              onChangeText={setMontoTxt}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              style={styles.montoInput}
              testID="input-monto"
            />
          </View>

          {/* Concepto */}
          <Text style={styles.label}>Concepto</Text>
          <TextInput
            value={concepto}
            onChangeText={setConcepto}
            placeholder="Ej: Gasolina + estacion"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            maxLength={200}
            testID="input-concepto"
          />

          {/* Fecha del gasto — chip selector ultimos 7 dias */}
          <Text style={styles.label}>¿Cuando fue?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() - d);
              const label = d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : targetDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
              const active = diasAtras === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDiasAtras(d)}
                  style={[styles.datePill, active && styles.datePillActive]}
                  testID={`date-${d}`}
                >
                  <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Foto comprobante — OBLIGATORIA */}
          <Text style={styles.labelRequired}>Comprobante (obligatorio)</Text>
          <Text style={styles.hint}>Toma foto del ticket o factura para auditoria del supervisor.</Text>
          {photoUri ? (
            <View style={styles.photoBox}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.photoRemove}>
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity onPress={handleTakePhoto} style={[styles.photoBtn, styles.photoBtnRequired]} testID="btn-camera">
                <Camera size={20} color={COLORS.primary} />
                <Text style={styles.photoBtnLabel}>Camara</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickPhoto} style={[styles.photoBtn, styles.photoBtnRequired]} testID="btn-gallery">
                <ImageIcon size={20} color={COLORS.primary} />
                <Text style={styles.photoBtnLabel}>Galeria</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notas */}
          <Text style={styles.label}>Notas (opcional)</Text>
          <TextInput
            value={notas}
            onChangeText={setNotas}
            placeholder="Detalles adicionales..."
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.notas]}
            multiline
            testID="input-notas"
          />

          {/* Ruta del dia (siempre attached) */}
          {rutaActivaCodigo && (
            <View style={styles.rutaChip}>
              <MapPin size={16} color={COLORS.success} />
              <Text style={styles.rutaChipText}>
                Se imputa a {rutaActivaCodigo}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Botones */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity onPress={() => safeBack('/(tabs)/ruta')} style={styles.btnCancel}>
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.btnSave, !canSave && { opacity: 0.4 }]}
            testID="btn-save"
          >
            <Text style={styles.btnSaveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  scroll: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.foreground, marginTop: 16, marginBottom: 8 },
  labelRequired: { fontSize: 13, fontWeight: '700', color: '#b45309', marginTop: 16, marginBottom: 8 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  // Empty state no-ruta
  noRutaWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  noRutaIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  noRutaTitle: { fontSize: 18, fontWeight: '700', color: COLORS.foreground, textAlign: 'center' },
  noRutaText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  noRutaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, marginTop: 8 },
  noRutaBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { gap: 8, paddingVertical: 4 },
  datePill: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  datePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateLabel: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },
  dateLabelActive: { color: '#fff' },
  tipoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  tipoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },
  montoBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16,
  },
  montoSign: { fontSize: 32, fontWeight: '300', color: COLORS.foreground, marginRight: 8 },
  montoInput: { flex: 1, fontSize: 32, fontWeight: '600', color: COLORS.foreground, paddingVertical: 12 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: COLORS.foreground,
  },
  notas: { minHeight: 80, textAlignVertical: 'top' },
  photoButtonsRow: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#fff',
  },
  photoBtnLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  photoBtnRequired: { borderStyle: 'dashed', borderWidth: 2 },
  photoBox: { position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: 4 / 3 },
  photo: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  rutaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12,
    borderRadius: 8, backgroundColor: '#f3f4f6',
  },
  rutaChipText: { fontSize: 13, color: COLORS.foreground, fontFamily: 'monospace' },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  btnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  btnCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  btnSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: COLORS.primary },
  btnSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default withErrorBoundary(NuevoGastoScreen, 'NuevoGasto');
