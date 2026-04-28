import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingBag, ChevronRight } from 'lucide-react-native';
import { useTenantLocale } from '@/hooks';
import { COLORS } from '@/theme/colors';

interface CartBarProps {
  itemCount: number;
  total: number;
  onPress: () => void;
  label?: string;
}

export function CartBar({ itemCount, total, onPress, label = 'Revisar pedido' }: CartBarProps) {
  const { money: formatCurrency } = useTenantLocale();
  if (itemCount === 0) return null;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.bar} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.left}>
          <View style={styles.badge}>
            <ShoppingBag size={16} color="#ffffff" />
            <Text style={styles.badgeText}>{itemCount}</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
          <ChevronRight size={18} color="#ffffff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  label: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  total: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
});
