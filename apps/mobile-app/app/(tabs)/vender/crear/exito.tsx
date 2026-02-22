import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { CheckCircle, Eye, Plus, Home } from 'lucide-react-native';

export default function PedidoExitoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { numero, id } = useLocalSearchParams<{ numero: string; id: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <CheckCircle size={56} color="#16a34a" />
        </View>
      </View>

      <Text style={styles.title}>Pedido Enviado</Text>
      <Text style={styles.subtitle}>Tu pedido ha sido creado y enviado exitosamente</Text>

      {numero && (
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeLabel}>Número de Pedido</Text>
          <Text style={styles.orderBadgeNumber}>#{numero}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {id && (
          <Button
            title="Ver Pedido"
            onPress={() => router.replace(`/(tabs)/vender/${id}` as any)}
            fullWidth
            icon={<Eye size={18} color="#ffffff" />}
          />
        )}
        <Button
          title="Nuevo Pedido"
          onPress={() => router.replace('/(tabs)/vender/crear' as any)}
          variant="secondary"
          fullWidth
          icon={<Plus size={18} color="#2563eb" />}
        />
        <Button
          title="Ir al Inicio"
          onPress={() => router.replace('/(tabs)' as any)}
          variant="ghost"
          fullWidth
          icon={<Home size={18} color="#64748b" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: { marginBottom: 24 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  orderBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  orderBadgeLabel: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
    marginBottom: 4,
  },
  orderBadgeNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#15803d',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
});
