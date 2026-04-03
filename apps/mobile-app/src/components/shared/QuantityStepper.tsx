import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({ value, onChange, min = 0, max = 999 }: QuantityStepperProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
        onPress={() => canDecrement && onChange(value - 1)}
        activeOpacity={0.7}
        disabled={!canDecrement}
        accessibilityLabel="Disminuir cantidad"
        accessibilityRole="button"
      >
        <Minus size={16} color={canDecrement ? COLORS.primary : '#cbd5e1'} />
      </TouchableOpacity>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, styles.buttonAdd, !canIncrement && styles.buttonDisabled]}
        onPress={() => canIncrement && onChange(value + 1)}
        activeOpacity={0.7}
        disabled={!canIncrement}
        accessibilityLabel="Aumentar cantidad"
        accessibilityRole="button"
      >
        <Plus size={16} color={canIncrement ? '#ffffff' : '#cbd5e1'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
  },
  buttonAdd: {
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    backgroundColor: '#f8fafc',
  },
  valueContainer: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
});
