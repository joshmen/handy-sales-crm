import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { CheckCircle, Eye, Plus, Home } from 'lucide-react-native';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';

export default function PedidoExitoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { numero, id, tipo } = useLocalSearchParams<{ numero: string; id: string; tipo?: string }>();

  const isDirecta = tipo === 'directa';
  const title = isDirecta ? 'Venta Completada' : 'Pedido Levantado';
  const subtitle = isDirecta
    ? 'Venta cobrada y entregada exitosamente'
    : 'Tu pedido ha sido levantado exitosamente';
  const iconColor = isDirecta ? '#16a34a' : '#16a34a';
  const badgeBg = isDirecta ? '#f0fdf4' : '#f0fdf4';
  const badgeBorder = isDirecta ? '#dcfce7' : '#dcfce7';
  const badgeLabelColor = isDirecta ? '#16a34a' : '#16a34a';
  const badgeNumberColor = isDirecta ? '#15803d' : '#15803d';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Animated.View entering={BounceIn.delay(200).duration(600)} style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <CheckCircle size={56} color={iconColor} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(400)}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>

      {numero && (
        <Animated.View entering={FadeInDown.delay(700).duration(400)} style={[styles.orderBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Text style={[styles.orderBadgeLabel, { color: badgeLabelColor }]}>
            {isDirecta ? 'Referencia' : 'Número de Pedido'}
          </Text>
          <Text style={[styles.orderBadgeNumber, { color: badgeNumberColor }]}>#{numero}</Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(900).duration(400)} style={styles.actions}>
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
          onPress={() => router.replace('/(tabs)/vender/crear/modo' as any)}
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
      </Animated.View>
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
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
  },
  orderBadgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  orderBadgeNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
});
