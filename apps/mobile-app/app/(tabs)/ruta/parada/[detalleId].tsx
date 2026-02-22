import { View, Text, ScrollView, Alert, Linking, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouteToday } from '@/hooks';
import { visitasApi } from '@/api';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { Badge } from '@/components/ui';
import { formatTime } from '@/utils/format';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  Play,
  SkipForward,
  ShoppingBag,
  Wallet,
} from 'lucide-react-native';

const STOP_STATUS_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#f59e0b', 2: '#22c55e', 3: '#ef4444',
};
const STOP_STATUS_NAMES: Record<number, string> = {
  0: 'Pendiente', 1: 'En Progreso', 2: 'Completada', 3: 'Omitida',
};

export default function ParadaDetailScreen() {
  const { detalleId } = useLocalSearchParams<{ detalleId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const routeToday = useRouteToday();

  const route = routeToday.data;
  const stop = route?.detalles?.find((d) => d.id === Number(detalleId));

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!stop) return;
      return visitasApi.create({
        clienteId: stop.clienteId,
        tipoVisita: 0,
        notas: `Parada de ruta: ${route?.nombre}`,
      });
    },
    onSuccess: (visita) => {
      queryClient.invalidateQueries({ queryKey: ['route'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      if (visita) {
        router.push('/(tabs)/ruta/visita-activa' as any);
      }
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo iniciar la visita');
    },
  });

  if (routeToday.isLoading || !route) {
    return <View style={styles.container}><LoadingSpinner message="Cargando..." /></View>;
  }

  if (!stop) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Parada no encontrada</Text>
        </View>
      </View>
    );
  }

  const isPendiente = stop.estado === 0;
  const isEnProgreso = stop.estado === 1;
  const statusColor = STOP_STATUS_COLORS[stop.estado] || '#6b7280';

  const handleNavegar = () => {
    if (stop.clienteLatitud && stop.clienteLongitud) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.clienteLatitud},${stop.clienteLongitud}`;
      Linking.openURL(url);
    }
  };

  const handleLlegar = () => {
    Alert.alert('Iniciar Visita', `¿Llegaste a ${stop.clienteNombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, llegué', onPress: () => checkInMutation.mutate() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
        <Badge
          label={STOP_STATUS_NAMES[stop.estado] || 'Desconocido'}
          color={statusColor}
          bgColor={`${statusColor}25`}
          size="md"
        />
        <Text style={[styles.statusOrder, { color: statusColor }]}>
          Parada #{stop.ordenVisita}
        </Text>
      </View>

      {/* Client Info */}
      <Card className="mx-4 mb-3">
        <Text style={styles.cardLabel}>Cliente</Text>
        <Text style={styles.clientName}>{stop.clienteNombre}</Text>

        {stop.clienteDireccion && (
          <View style={styles.infoRow}>
            <MapPin size={14} color="#94a3b8" />
            <Text style={styles.infoText}>{stop.clienteDireccion}</Text>
          </View>
        )}

        {stop.horaEstimadaLlegada && (
          <View style={styles.infoRow}>
            <Clock size={14} color="#94a3b8" />
            <Text style={styles.infoText}>Estimada: {formatTime(stop.horaEstimadaLlegada)}</Text>
          </View>
        )}

        {stop.distanciaDesdeAnterior !== undefined && stop.distanciaDesdeAnterior > 0 && (
          <View style={styles.infoRow}>
            <Navigation size={14} color="#94a3b8" />
            <Text style={styles.infoText}>{stop.distanciaDesdeAnterior.toFixed(1)} km desde anterior</Text>
          </View>
        )}
      </Card>

      {/* Navigation Card */}
      {stop.clienteLatitud && stop.clienteLongitud && (
        <Card className="mx-4 mb-3">
          <Button
            title="Navegar con Google Maps"
            onPress={handleNavegar}
            variant="secondary"
            fullWidth
            icon={<Navigation size={18} color="#2563eb" />}
          />
        </Card>
      )}

      {/* Quick Actions */}
      {(isPendiente || isEnProgreso) && (
        <View style={styles.quickActions}>
          <Button
            title="Nuevo Pedido"
            onPress={() => router.push('/(tabs)/vender/crear' as any)}
            variant="secondary"
            fullWidth
            icon={<ShoppingBag size={18} color="#2563eb" />}
          />
          <Button
            title="Registrar Cobro"
            onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${stop.clienteId}&clienteNombre=${encodeURIComponent(stop.clienteNombre)}&saldo=0` as any)}
            variant="secondary"
            fullWidth
            icon={<Wallet size={18} color="#2563eb" />}
          />
        </View>
      )}

      {/* Action Buttons */}
      {isPendiente && (
        <View style={styles.mainActions}>
          <Button
            title="Llegué — Iniciar Visita"
            onPress={handleLlegar}
            loading={checkInMutation.isPending}
            fullWidth
            icon={<Play size={18} color="#ffffff" />}
          />
        </View>
      )}

      {stop.notas && (
        <Card className="mx-4 mb-3">
          <Text style={styles.cardLabel}>Notas</Text>
          <Text style={styles.notesText}>{stop.notas}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusOrder: { fontSize: 14, fontWeight: '700' },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  infoText: { fontSize: 13, color: '#64748b', flex: 1 },
  quickActions: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  mainActions: { paddingHorizontal: 16, marginBottom: 12 },
  notesText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
});
