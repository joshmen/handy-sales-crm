import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderDraftStore } from '@/stores';
import { ClipboardList, Truck } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ModoVentaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setTipoVenta, reset } = useOrderDraftStore();
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (tipo: number) => {
    setSelected(tipo);
    reset();
    setTipoVenta(tipo);
    router.replace('/(tabs)/vender/crear' as any);
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Nuevo Pedido</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.subheading}>Selecciona el modo de venta</Text>

        <View style={styles.cards}>
          {/* Preventa */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <TouchableOpacity
              style={[styles.card, selected === 0 && styles.cardSelected]}
              onPress={() => handleSelect(0)}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>
                <ClipboardList size={32} color={COLORS.textTertiary} />
              </View>
              <Text style={styles.cardTitle}>Preventa</Text>
              <Text style={styles.cardSubtitle}>
                Levantar pedido para entrega posterior
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Venta Directa */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <TouchableOpacity
              style={[styles.card, selected === 1 && styles.cardSelected]}
              onPress={() => handleSelect(1)}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>
                <Truck size={32} color={COLORS.textTertiary} />
              </View>
              <Text style={styles.cardTitle}>Venta Directa</Text>
              <Text style={styles.cardSubtitle}>
                Vender, cobrar y entregar ahora
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.headerText,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderColor: COLORS.button,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
