import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineTodayVisits, useClientNameMap } from '@/hooks';
import { updateVisitaCheckout } from '@/db/actions';
import { saveAttachmentRecord } from '@/services/evidenceManager';
import { performSync } from '@/sync/syncEngine';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { PhotoEvidence } from '@/components/evidence/PhotoEvidence';
import { SignatureCapture } from '@/components/evidence/SignatureCapture';
import {
  ShoppingBag,
  Wallet,
  Clock,
  StopCircle,
  PenTool,
  Check,
  X,
} from 'lucide-react-native';

const RESULTADO_OPTIONS = [
  { value: 1, label: 'Con Venta', icon: ShoppingBag, color: '#22c55e' },
  { value: 2, label: 'Sin Venta', icon: StopCircle, color: '#f59e0b' },
  { value: 3, label: 'No Encontrado', icon: X, color: '#ef4444' },
  { value: 4, label: 'Reagendada', icon: Clock, color: '#8b5cf6' },
];

export default function VisitaActivaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: todayVisits, isLoading } = useOfflineTodayVisits();
  const clientNames = useClientNameMap();

  // Active visit = today's visit with no checkout
  const visita = useMemo(
    () => todayVisits?.find((v) => v.checkInAt && !v.checkOutAt) ?? null,
    [todayVisits]
  );

  const [resultado, setResultado] = useState(1);
  const [notas, setNotas] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Timer
  useEffect(() => {
    if (visita?.checkInAt) {
      const start = new Date(visita.checkInAt).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [visita?.checkInAt]);

  const handleTerminar = () => {
    Alert.alert('Terminar Visita', '¿Estás seguro de terminar esta visita?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar',
        style: 'destructive',
        onPress: async () => {
          if (!visita) return;
          setEnding(true);
          try {
            await updateVisitaCheckout(visita.id, resultado, notas || undefined);

            // Save photo attachments
            for (const photoUri of photos) {
              await saveAttachmentRecord({
                eventType: 'visita',
                eventLocalId: visita.id,
                tipo: 'photo',
                localUri: photoUri,
              });
            }

            // Save signature attachment
            if (signatureUri) {
              await saveAttachmentRecord({
                eventType: 'visita',
                eventLocalId: visita.id,
                tipo: 'signature',
                localUri: signatureUri,
              });
            }

            performSync().catch(() => {});
            router.back();
          } catch {
            Alert.alert('Error', 'No se pudo finalizar la visita');
          } finally {
            setEnding(false);
          }
        },
      },
    ]);
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (isLoading) {
    return <View style={styles.container}><LoadingSpinner message="Cargando visita..." /></View>;
  }

  if (!visita) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay visita activa</Text>
          <Button title="Volver" onPress={() => router.back()} variant="secondary" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Green Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.timerCircle}>
            <Clock size={20} color="#16a34a" />
            <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
          </View>
          <Text style={styles.headerTitle}>Visita en Curso</Text>
          <Text style={styles.headerSubtitle}>{clientNames.get(visita.clienteId) || 'Cliente'}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <View style={styles.actionsRow}>
            <Button
              title="Nuevo Pedido"
              onPress={() => router.push('/(tabs)/vender/crear' as any)}
              variant="secondary"
              fullWidth
              icon={<ShoppingBag size={18} color="#2563eb" />}
            />
            <Button
              title="Registrar Cobro"
              onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${visita.clienteId}&clienteNombre=${encodeURIComponent(clientNames.get(visita.clienteId) || 'Cliente')}&saldo=0` as any)}
              variant="secondary"
              fullWidth
              icon={<Wallet size={18} color="#2563eb" />}
            />
          </View>
        </View>

        {/* Resultado */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>Resultado de la Visita</Text>
          <View style={styles.resultGrid}>
            {RESULTADO_OPTIONS.map((opt) => {
              const isSelected = resultado === opt.value;
              const Icon = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.resultCard, isSelected && { borderColor: opt.color, backgroundColor: `${opt.color}10` }]}
                  onPress={() => setResultado(opt.value)}
                  activeOpacity={0.7}
                >
                  <Icon size={20} color={isSelected ? opt.color : '#94a3b8'} />
                  <Text style={[styles.resultLabel, isSelected && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.resultCheck, { backgroundColor: opt.color }]}>
                      <Check size={10} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <Card className="mx-4 mb-4">
          <Text style={styles.notesLabel}>Notas de la Visita</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Escribe observaciones de la visita..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={notas}
            onChangeText={setNotas}
            textAlignVertical="top"
          />
        </Card>

        {/* Evidence: Photos */}
        <View style={styles.evidenceSection}>
          <PhotoEvidence
            photos={photos}
            onAdd={(uri) => setPhotos((prev) => [...prev, uri])}
            onRemove={(uri) => setPhotos((prev) => prev.filter((p) => p !== uri))}
            maxPhotos={5}
          />
        </View>

        {/* Evidence: Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionLabel}>Firma del cliente (opcional)</Text>
          {signatureUri ? (
            <View style={styles.signaturePreview}>
              <Image source={{ uri: signatureUri }} style={styles.signatureImage} resizeMode="contain" />
              <TouchableOpacity
                style={styles.signatureRemove}
                onPress={() => setSignatureUri(null)}
              >
                <X size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title="Capturar Firma"
              onPress={() => setShowSignature(true)}
              variant="secondary"
              icon={<PenTool size={18} color="#2563eb" />}
            />
          )}
        </View>

        {/* End Visit */}
        <View style={styles.endSection}>
          <Button
            title="Terminar Visita"
            onPress={handleTerminar}
            variant="danger"
            loading={ending}
            fullWidth
            icon={<StopCircle size={18} color="#ffffff" />}
          />
        </View>
      </ScrollView>

      {/* Signature Modal */}
      <Modal
        visible={showSignature}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSignature(false)}
      >
        <SignatureCapture
          onSave={(uri) => {
            setSignatureUri(uri);
            setShowSignature(false);
          }}
          onCancel={() => setShowSignature(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  timerCircle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  timerText: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  headerTitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  headerSubtitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  actionsSection: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  actionsRow: { gap: 8 },
  resultSection: { paddingHorizontal: 16, marginBottom: 16 },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    position: 'relative',
  },
  resultLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  resultCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  evidenceSection: { paddingHorizontal: 16, marginBottom: 8 },
  signatureSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  signaturePreview: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  signatureImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#ffffff',
  },
  signatureRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSection: { paddingHorizontal: 16 },
});
