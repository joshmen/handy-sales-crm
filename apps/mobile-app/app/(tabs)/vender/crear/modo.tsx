import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrderDraftStore } from '@/stores';
import { Zap } from 'lucide-react-native';
import { SbOrders } from '@/components/icons/DashboardIcons';

export default function ModoVentaScreen() {
  const router = useRouter();
  const { setTipoVenta, reset } = useOrderDraftStore();

  const handleSelect = (tipo: number) => {
    reset();
    setTipoVenta(tipo);
    router.push('/(tabs)/vender/crear' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Tipo de Venta</Text>
      <Text style={styles.subheading}>Selecciona el modo de venta</Text>

      <View style={styles.cards}>
        {/* Preventa */}
        <TouchableOpacity
          style={[styles.card, styles.cardPreventa]}
          onPress={() => handleSelect(0)}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, styles.iconPreventa]}>
            <SbOrders size={32} />
          </View>
          <Text style={[styles.cardTitle, styles.textPreventa]}>Preventa</Text>
          <Text style={styles.cardSubtitle}>
            Levantar pedido para entrega posterior
          </Text>
        </TouchableOpacity>

        {/* Venta Directa */}
        <TouchableOpacity
          style={[styles.card, styles.cardDirecta]}
          onPress={() => handleSelect(1)}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, styles.iconDirecta]}>
            <Zap size={32} color="#16a34a" />
          </View>
          <Text style={[styles.cardTitle, styles.textDirecta]}>Venta Directa</Text>
          <Text style={styles.cardSubtitle}>
            Vender, cobrar y entregar ahora
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  cardPreventa: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  cardDirecta: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconPreventa: {
    backgroundColor: '#dbeafe',
  },
  iconDirecta: {
    backgroundColor: '#dcfce7',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  textPreventa: {
    color: '#2563eb',
  },
  textDirecta: {
    color: '#16a34a',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
