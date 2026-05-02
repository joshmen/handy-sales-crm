import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { Delete } from 'lucide-react-native';

interface QuantityNumericSheetProps {
  visible: boolean;
  productoNombre: string;
  precioUnitario: number;
  formatCurrency: (n: number) => string;
  initialQty?: number;
  maxQty?: number;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

/**
 * Sheet con teclado numérico grande para capturar cantidad de un producto.
 * Reemplaza el patrón "tap +1 cinco veces" por "1 tap → escribir → confirmar".
 *
 * Reduce friction principal del flujo de venta cuando vendedor tiene que
 * ingresar cantidades grandes (ej: 24 sodas) que con stepper +/- toma 24 taps.
 */
export function QuantityNumericSheet({
  visible,
  productoNombre,
  precioUnitario,
  formatCurrency,
  initialQty = 1,
  maxQty = 9999,
  onClose,
  onConfirm,
}: QuantityNumericSheetProps) {
  const [value, setValue] = useState(String(initialQty));
  const [isFresh, setIsFresh] = useState(true);

  // Re-sincronizar al abrir el sheet con un nuevo producto
  useEffect(() => {
    if (visible) {
      setValue(String(initialQty));
      setIsFresh(true);
    }
  }, [visible, initialQty]);

  const numericValue = Math.max(0, parseInt(value || '0', 10) || 0);
  const totalLine = numericValue * precioUnitario;
  const exceedsMax = numericValue > maxQty;

  const press = (k: string) => {
    if (k === '⌫') {
      setValue(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      setIsFresh(false);
      return;
    }
    if (k === '✓') {
      if (numericValue > 0 && !exceedsMax) {
        onConfirm(numericValue);
      }
      return;
    }
    // Tap de un dígito: si es la primera interacción tras abrir, sustituye
    // el initial qty (más natural — vendedor no quiere borrar y empezar).
    if (isFresh) {
      setValue(k);
      setIsFresh(false);
      return;
    }
    if (value === '0') {
      setValue(k);
      return;
    }
    if (value.length >= 5) return; // cap a 99999
    setValue(prev => prev + k);
  };

  return (
    <BottomSheet
      visible={visible}
      title={productoNombre}
      subtitle={`${formatCurrency(precioUnitario)} c/u`}
      onClose={onClose}
    >
      <View style={styles.body}>
        <View style={styles.displayBox}>
          <Text style={[styles.displayValue, exceedsMax && styles.displayError]}>
            {numericValue}
          </Text>
          <Text style={styles.displayTotal}>
            {formatCurrency(totalLine)}
          </Text>
          {exceedsMax && (
            <Text style={styles.errorText}>Excede stock disponible ({maxQty})</Text>
          )}
        </View>

        <View style={styles.keypad}>
          {KEYS.map((k) => {
            const isConfirm = k === '✓';
            const isDelete = k === '⌫';
            const disabled = isConfirm && (numericValue <= 0 || exceedsMax);
            return (
              <TouchableOpacity
                key={k}
                style={[
                  styles.key,
                  isConfirm && styles.keyConfirm,
                  isDelete && styles.keyDelete,
                  disabled && styles.keyDisabled,
                ]}
                onPress={() => press(k)}
                disabled={disabled}
                activeOpacity={0.7}
                accessibilityLabel={
                  isConfirm ? 'Confirmar cantidad' : isDelete ? 'Borrar' : `Tecla ${k}`
                }
                accessibilityRole="button"
              >
                {isDelete ? (
                  <Delete size={22} color={COLORS.foreground} />
                ) : (
                  <Text
                    style={[
                      styles.keyText,
                      isConfirm && styles.keyConfirmText,
                    ]}
                  >
                    {k}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 12 },
  displayBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  displayValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.foreground,
    lineHeight: 52,
  },
  displayError: { color: '#dc2626' },
  displayTotal: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  key: {
    width: '31%',
    aspectRatio: 1.3,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 24, fontWeight: '700', color: COLORS.foreground },
  keyConfirm: { backgroundColor: '#16a34a' },
  keyConfirmText: { color: '#ffffff', fontSize: 26 },
  keyDelete: { backgroundColor: '#fee2e2' },
  keyDisabled: { opacity: 0.4 },
});
