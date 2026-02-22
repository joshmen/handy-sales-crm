import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveVisit } from '@/hooks';
import { visitasApi } from '@/api';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { ShoppingBag, Wallet, Clock, MapPin, StopCircle } from 'lucide-react-native';

export default function VisitaActivaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: visita, isLoading } = useActiveVisit();

  const [notas, setNotas] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Timer
  useEffect(() => {
    if (visita?.fechaHoraInicio) {
      const start = new Date(visita.fechaHoraInicio).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [visita?.fechaHoraInicio]);

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!visita) return;
      return visitasApi.checkOut(visita.id, {
        resultado: 1, // Completada con venta
        notas: notas || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['route'] });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo finalizar la visita');
    },
  });

  const handleTerminar = () => {
    Alert.alert('Terminar Visita', '¿Estás seguro de terminar esta visita?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: () => checkOutMutation.mutate() },
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Green Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.timerCircle}>
          <Clock size={20} color="#16a34a" />
          <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
        </View>
        <Text style={styles.headerTitle}>Visita en Curso</Text>
        <Text style={styles.headerSubtitle}>{visita.clienteNombre}</Text>
        {visita.clienteDireccion && (
          <View style={styles.addressRow}>
            <MapPin size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.addressText}>{visita.clienteDireccion}</Text>
          </View>
        )}
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
            onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${visita.clienteId}&clienteNombre=${encodeURIComponent(visita.clienteNombre)}&saldo=0` as any)}
            variant="secondary"
            fullWidth
            icon={<Wallet size={18} color="#2563eb" />}
          />
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

      {/* End Visit */}
      <View style={styles.endSection}>
        <Button
          title="Terminar Visita"
          onPress={handleTerminar}
          variant="danger"
          loading={checkOutMutation.isPending}
          fullWidth
          icon={<StopCircle size={18} color="#ffffff" />}
        />
      </View>
    </ScrollView>
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
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addressText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  actionsSection: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  actionsRow: { gap: 8 },
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
  endSection: { paddingHorizontal: 16 },
});
