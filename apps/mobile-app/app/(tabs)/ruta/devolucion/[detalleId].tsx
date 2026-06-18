import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeBack } from '@/utils/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import {
  PackageX, AlertTriangle, CalendarX, ClipboardX, UserX, Replace, FileQuestion,
  Camera, Image as ImageIcon, X, ChevronLeft, RotateCcw, Wallet, Receipt as ReceiptIcon, Minus, Plus, PackagePlus,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores';
import { database } from '@/db/database';
import { createDevolucionOffline } from '@/db/actions';
import { capturePhoto, pickFromGallery, saveAttachmentRecord } from '@/services/evidenceManager';
import { performSync } from '@/sync/syncEngine';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';
import RutaDetalle from '@/db/models/RutaDetalle';
import Pedido from '@/db/models/Pedido';
import DetallePedido from '@/db/models/DetallePedido';
import Cliente from '@/db/models/Cliente';
import Ruta from '@/db/models/Ruta';

// MotivoDevolucion enum mirror del backend DevolucionPedido.cs
const MOTIVOS_DEVOLUCION = [
  { value: 0, label: 'Dano transporte', icon: PackageX, color: '#dc2626' },
  { value: 1, label: 'No conforme', icon: AlertTriangle, color: '#d97706' },
  { value: 2, label: 'Vencido', icon: CalendarX, color: '#ea580c' },
  { value: 3, label: 'Error pedido', icon: ClipboardX, color: '#2563eb' },
  { value: 4, label: 'Cliente se retracta', icon: UserX, color: '#9333ea' },
  { value: 5, label: 'Incorrecto', icon: Replace, color: '#e11d48' },
  { value: 99, label: 'Otro', icon: FileQuestion, color: '#64748b' },
] as const;

// TipoReembolso mirror del backend enum:
// 0=SaldoFavor (credito al cliente), 1=Efectivo (vendedor saca billete),
// 2=ReposicionProducto (vendedor entrega producto nuevo en lugar del danado/caducado — sin movimiento dinero).
// Reposicion es el flujo mas comun en campo segun usuario 2026-05-31.
const TIPOS_REEMBOLSO = [
  { value: 2, label: 'Reposición', desc: 'Entrego producto nuevo', icon: PackagePlus, color: '#16a34a' },
  { value: 0, label: 'Saldo a favor', desc: 'Se acredita al cliente', icon: Wallet, color: '#2563eb' },
  { value: 1, label: 'Efectivo', desc: 'Vendedor reembolsa ahora', icon: ReceiptIcon, color: '#d97706' },
] as const;

interface ItemDevolucionDraft {
  detallePedidoLocalId: string;
  detallePedidoServerId: number | null;
  productoLocalId: string;
  productoServerId: number | null;
  productoNombre: string;
  cantidadOriginal: number;
  precioUnitario: number;
  cantidadDevolverTxt: string; // string input for keyboard
}

function NuevaDevolucionScreen() {
  const insets = useSafeAreaInsets();
  const { detalleId } = useLocalSearchParams<{ detalleId: string }>();
  const router = useRouter();
  const { money: formatCurrency } = useTenantLocale();
  const user = useAuthStore(s => s.user);

  const [loading, setLoading] = useState(true);
  const [stop, setStop] = useState<RutaDetalle | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [items, setItems] = useState<ItemDevolucionDraft[]>([]);

  const [motivo, setMotivo] = useState<number>(0);
  // Default Reposicion (=2) por feedback usuario: es el flujo mas comun
  // (caso producto caducado/danado: vendedor lo repone en el momento).
  const [tipoReembolso, setTipoReembolso] = useState<number>(2);
  const [notas, setNotas] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carga inicial: parada + pedido + detalles del pedido + cliente
  useEffect(() => {
    if (!detalleId) return;
    (async () => {
      try {
        const stopRecord = await database.get<RutaDetalle>('ruta_detalles').find(String(detalleId));
        if (!stopRecord) {
          Toast.show({ type: 'error', text1: 'Parada no encontrada' });
          safeBack('/(tabs)/ruta');
          return;
        }
        setStop(stopRecord);

        if (!stopRecord.pedidoId) {
          Toast.show({
            type: 'error',
            text1: 'Esta parada no tiene pedido',
            text2: 'Solo se puede devolver producto de un pedido entregado.',
          });
          safeBack('/(tabs)/ruta');
          return;
        }

        const [rutaRec, pedidoRec, clienteRec] = await Promise.all([
          database.get<Ruta>('rutas').find(stopRecord.rutaId),
          database.get<Pedido>('pedidos').find(stopRecord.pedidoId).catch(() => null),
          database.get<Cliente>('clientes').find(stopRecord.clienteId).catch(() => null),
        ]);
        setRuta(rutaRec);
        setPedido(pedidoRec);
        setCliente(clienteRec);

        if (!pedidoRec) {
          Toast.show({ type: 'error', text1: 'Pedido no encontrado en local' });
          safeBack('/(tabs)/ruta');
          return;
        }

        // Cargar detalles del pedido para que vendedor seleccione cuales devolver
        const detallesPedido = await database.get<DetallePedido>('detalle_pedidos')
          .query(Q.where('pedido_id', stopRecord.pedidoId)).fetch();

        const drafts: ItemDevolucionDraft[] = detallesPedido.map((d) => ({
          detallePedidoLocalId: d.id,
          detallePedidoServerId: d.serverId ?? null,
          productoLocalId: d.productoId,
          productoServerId: d.productoServerId ?? null,
          productoNombre: d.productoNombre,
          cantidadOriginal: d.cantidad,
          precioUnitario: d.precioUnitario,
          cantidadDevolverTxt: '0',
        }));
        setItems(drafts);
      } catch (err) {
        console.error('Error cargando devolucion screen:', err);
        Toast.show({ type: 'error', text1: 'Error cargando datos' });
        safeBack('/(tabs)/ruta');
      } finally {
        setLoading(false);
      }
    })();
  }, [detalleId]);

  // Recalcular monto total
  const totalDevolucion = useMemo(() => {
    return items.reduce((sum, it) => {
      const qty = parseFloat(it.cantidadDevolverTxt.replace(',', '.')) || 0;
      return sum + qty * it.precioUnitario;
    }, 0);
  }, [items]);

  const hayItemsSeleccionados = items.some((it) => (parseFloat(it.cantidadDevolverTxt.replace(',', '.')) || 0) > 0);
  // Foto OBLIGATORIA (feedback usuario 2026-05-31: igual que gastos, supervisor exige evidencia).
  const canSave = hayItemsSeleccionados && totalDevolucion > 0 && !!photoUri && !saving;

  const updateCantidad = (idx: number, txt: string) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const num = parseFloat(txt.replace(',', '.')) || 0;
      // Validar no exceder cantidad original
      const clamped = Math.min(num, it.cantidadOriginal);
      const finalTxt = clamped === num ? txt : String(clamped);
      return { ...it, cantidadDevolverTxt: finalTxt };
    }));
  };

  const incrementCantidad = (idx: number, delta: number) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const current = parseFloat(it.cantidadDevolverTxt.replace(',', '.')) || 0;
      const next = Math.max(0, Math.min(current + delta, it.cantidadOriginal));
      return { ...it, cantidadDevolverTxt: String(next) };
    }));
  };

  const handleTakePhoto = async () => {
    const uri = await capturePhoto();
    if (uri) setPhotoUri(uri);
  };

  const handlePickPhoto = async () => {
    const uri = await pickFromGallery();
    if (uri) setPhotoUri(uri);
  };

  const handleSave = async () => {
    if (!canSave || !user || !pedido || !cliente || !stop) return;
    setSaving(true);
    try {
      // Build items array filtrando los que tienen cantidad > 0
      const itemsFinal = items
        .map((it) => {
          const qty = parseFloat(it.cantidadDevolverTxt.replace(',', '.')) || 0;
          if (qty <= 0) return null;
          const subtotal = qty * it.precioUnitario;
          return {
            detallePedidoLocalId: it.detallePedidoLocalId,
            detallePedidoServerId: it.detallePedidoServerId,
            productoLocalId: it.productoLocalId,
            productoServerId: it.productoServerId,
            cantidad: qty,
            precioUnitario: it.precioUnitario,
            subtotal,
            impuesto: 0,
            total: subtotal,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (itemsFinal.length === 0) {
        Toast.show({ type: 'error', text1: 'Selecciona al menos un producto' });
        setSaving(false);
        return;
      }

      const devolucion = await createDevolucionOffline({
        pedidoLocalId: pedido.id,
        pedidoServerId: pedido.serverId ?? null,
        clienteLocalId: cliente.id,
        clienteServerId: cliente.serverId ?? null,
        usuarioId: typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10),
        rutaLocalId: ruta?.id ?? null,
        motivo,
        tipoReembolso,
        notas: notas.trim() || undefined,
        items: itemsFinal,
      });

      // Si hay foto, encolar attachment record (sync engine sube en background y
      // server stampea fotoEvidenciaUrl al pedido via MobileAttachmentEndpoints).
      if (photoUri) {
        await saveAttachmentRecord({
          eventType: 'devolucion',
          eventLocalId: devolucion.id,
          tipo: 'evidencia',
          localUri: photoUri,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Devolucion registrada',
        text2: `${formatCurrency(totalDevolucion)} - ${itemsFinal.length} producto(s)`,
        visibilityTime: 2500,
      });
      performSync().catch(() => {});
      safeBack('/(tabs)/ruta');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'No se pudo guardar la devolucion',
        text2: err?.message ?? 'Error desconocido',
        visibilityTime: 4000,
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack('/(tabs)/ruta')} style={styles.headerBtn}>
            <ChevronLeft size={24} color={COLORS.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar devolucion</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="devolucion-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack('/(tabs)/ruta')} style={styles.headerBtn} testID="btn-back">
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar devolucion</Text>
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
          {/* Cliente + Pedido info */}
          <View style={styles.infoChip}>
            <RotateCcw size={16} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoChipTitle}>{cliente?.nombre ?? 'Cliente'}</Text>
              <Text style={styles.infoChipSubtitle}>Pedido {pedido?.numeroPedido ?? ''}</Text>
            </View>
          </View>

          {/* Productos del pedido — vendedor selecciona cuales devolver */}
          <Text style={styles.label}>Productos a devolver</Text>
          <Text style={styles.hint}>
            Captura la cantidad que el cliente regresa. No puede exceder lo que se entrego.
          </Text>
          {items.length === 0 ? (
            <Text style={styles.emptyItems}>Este pedido no tiene productos.</Text>
          ) : (
            items.map((it, idx) => {
              const qtyNum = parseFloat(it.cantidadDevolverTxt.replace(',', '.')) || 0;
              const isSelected = qtyNum > 0;
              return (
                <View
                  key={it.detallePedidoLocalId}
                  style={[styles.itemRow, isSelected && styles.itemRowActive]}
                  testID={`item-${idx}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNombre} numberOfLines={2}>{it.productoNombre}</Text>
                    <Text style={styles.itemMeta}>
                      Original: {it.cantidadOriginal} · {formatCurrency(it.precioUnitario)} c/u
                    </Text>
                    {isSelected && (
                      <Text style={styles.itemSubtotal}>
                        Subtotal: {formatCurrency(qtyNum * it.precioUnitario)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => incrementCantidad(idx, -1)}
                      testID={`item-${idx}-minus`}
                    >
                      <Minus size={16} color={COLORS.foreground} />
                    </TouchableOpacity>
                    <TextInput
                      value={it.cantidadDevolverTxt}
                      onChangeText={(txt) => updateCantidad(idx, txt)}
                      keyboardType="decimal-pad"
                      style={styles.qtyInput}
                      maxLength={6}
                      testID={`item-${idx}-input`}
                    />
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => incrementCantidad(idx, 1)}
                      testID={`item-${idx}-plus`}
                    >
                      <Plus size={16} color={COLORS.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Motivo pills */}
          <Text style={styles.label}>Motivo</Text>
          <View style={styles.tipoRow}>
            {MOTIVOS_DEVOLUCION.map((m) => {
              const Icon = m.icon;
              const active = motivo === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setMotivo(m.value)}
                  style={[styles.tipoPill, active && { backgroundColor: m.color, borderColor: m.color }]}
                  testID={`motivo-${m.value}`}
                >
                  <Icon size={16} color={active ? '#fff' : m.color} />
                  <Text style={[styles.tipoLabel, active && { color: '#fff' }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tipo reembolso radio */}
          <Text style={styles.label}>Como reembolsamos al cliente</Text>
          <View style={styles.reembolsoRow}>
            {TIPOS_REEMBOLSO.map((t) => {
              const Icon = t.icon;
              const active = tipoReembolso === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTipoReembolso(t.value)}
                  style={[styles.reembolsoBox, active && { borderColor: t.color, backgroundColor: `${t.color}10` }]}
                  testID={`reembolso-${t.value}`}
                >
                  <Icon size={20} color={active ? t.color : '#9ca3af'} />
                  <Text style={[styles.reembolsoLabel, active && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                  <Text style={styles.reembolsoDesc}>{t.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Foto evidencia OBLIGATORIA — supervisor exige evidencia visual */}
          <Text style={styles.labelRequired}>Evidencia (obligatoria)</Text>
          <Text style={styles.hint}>Toma foto del producto devuelto. La foto es obligatoria para registrar la devolución.</Text>
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
            maxLength={500}
            testID="input-notas"
          />

          {/* Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a devolver</Text>
            <Text style={styles.totalValue} testID="total-devolucion">
              {formatCurrency(totalDevolucion)}
            </Text>
          </View>
        </ScrollView>

        {/* Botones */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity onPress={() => safeBack('/(tabs)/ruta')} style={styles.btnCancel} testID="btn-cancel">
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.btnSave, !canSave && { opacity: 0.4 }]}
            testID="btn-save"
          >
            <Text style={styles.btnSaveText}>{saving ? 'Guardando...' : 'Registrar devolucion'}</Text>
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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: '#6b7280' },

  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 4,
    borderRadius: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
  },
  infoChipTitle: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  infoChipSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  emptyItems: { fontSize: 13, color: '#6b7280', fontStyle: 'italic', padding: 16 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
    borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  itemRowActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  itemNombre: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  itemMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  itemSubtotal: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  qtyInput: {
    width: 50, height: 32, textAlign: 'center', fontSize: 14, fontWeight: '600',
    color: COLORS.foreground, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff',
  },

  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  tipoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },

  reembolsoRow: { flexDirection: 'row', gap: 12 },
  reembolsoBox: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb',
    backgroundColor: '#fff', alignItems: 'flex-start', gap: 6,
  },
  reembolsoLabel: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  reembolsoDesc: { fontSize: 11, color: '#6b7280' },

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

  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, marginTop: 16, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  totalValue: { fontSize: 22, fontWeight: '700', color: '#dc2626' },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  btnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  btnCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  btnSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: COLORS.primary },
  btnSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default withErrorBoundary(NuevaDevolucionScreen, 'NuevaDevolucion');
