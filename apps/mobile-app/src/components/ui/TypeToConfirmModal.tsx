import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Keyboard,
  Animated as RNAnimated,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

/**
 * Modal sibling de ConfirmModal con TextInput controlado para acciones
 * irreversibles que requieren type-to-confirm (escribir una palabra antes
 * de habilitar el boton de confirmar).
 *
 * Caso de uso primario: "Restaurar desde servidor" (wipe completo WDB).
 * El usuario debe tipear `requiredText` exacto antes de que el boton
 * Confirmar se habilite.
 *
 * NO extender ConfirmModal porque agregar useState({typedText}) +
 * KeyboardAvoiding + validacion rompe el contrato stateless de
 * ConfirmModal (14 call sites delicados, incluido el logout block).
 *
 * Convenciones:
 *  - Patron Android Modal+Keyboard: Keyboard.addListener + Animated translateY
 *    (NO KeyboardAvoidingView, documentado en feedback_modal_keyboard_android.md)
 *  - autoCapitalize='characters' por default para palabras uppercase tipo RESTAURAR
 *  - Reset del input cuando visible pasa de true a false (con useEffect)
 *  - Confirm disabled si no match O loading=true
 */
interface TypeToConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** Palabra exacta que el usuario debe tipear. Ej: 'RESTAURAR'. */
  requiredText: string;
  /** Placeholder del input. Default: requiredText. */
  placeholder?: string;
  /** Default true. Si false, hace toUpperCase() antes de comparar. */
  caseSensitive?: boolean;
  /** Default 'characters'. */
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Default true (este modal solo tiene sentido para acciones destructivas). */
  destructive?: boolean;
  /** Si true, muestra spinner en el boton y deshabilita ambos botones. */
  loading?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function TypeToConfirmModal({
  visible,
  title,
  message,
  requiredText,
  placeholder,
  caseSensitive = true,
  autoCapitalize = 'characters',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  destructive = true,
  loading = false,
}: TypeToConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const keyboardOffset = useRef(new RNAnimated.Value(0)).current;

  // Reset del input cada vez que el modal se cierra para que la proxima
  // apertura empiece limpia (no quedar con el match anterior pegado).
  useEffect(() => {
    if (!visible) {
      setTyped('');
    }
  }, [visible]);

  // Keyboard listener: en Android los Modals tienen adjustNothing softInputMode,
  // ni KeyboardAvoidingView ni ScrollView funcionan. Patron probado: trasladar
  // el card hacia arriba con Animated.translateY cuando aparece el teclado.
  useEffect(() => {
    if (!visible) return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      RNAnimated.timing(keyboardOffset, {
        toValue: -(e.endCoordinates.height / 2.5),
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      RNAnimated.timing(keyboardOffset, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, keyboardOffset]);

  const normalizedTyped = caseSensitive ? typed.trim() : typed.trim().toUpperCase();
  const normalizedRequired = caseSensitive ? requiredText : requiredText.toUpperCase();
  const matches = normalizedTyped === normalizedRequired;
  const confirmDisabled = !matches || loading;

  const confirmBg = destructive ? '#E11D48' : '#1565C0';
  const iconCircleBg = destructive ? '#FEE2E2' : '#DBEAFE';
  const iconColor = destructive ? '#E11D48' : '#1565C0';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <RNAnimated.View
          style={[styles.card, { transform: [{ translateY: keyboardOffset }] }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
            <AlertTriangle size={28} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.requiredHintRow}>
            <Text style={styles.requiredHintLabel}>Para continuar, escribe:</Text>
            <Text style={styles.requiredHintWord}>{requiredText}</Text>
          </View>

          <TextInput
            style={[
              styles.input,
              matches ? styles.inputMatch : null,
            ]}
            value={typed}
            onChangeText={setTyped}
            placeholder={placeholder ?? requiredText}
            placeholderTextColor="#94a3b8"
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            editable={!loading}
            accessibilityLabel={`Escribe ${requiredText} para confirmar`}
            accessibilityHint="Habilita el boton de confirmar cuando el texto coincide"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={onCancel}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityLabel={cancelText}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: confirmBg },
                confirmDisabled && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={confirmDisabled}
              accessibilityLabel={confirmText}
              accessibilityRole="button"
              accessibilityState={{ disabled: confirmDisabled, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000050',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 64, 360),
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  requiredHintRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  requiredHintLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  requiredHintWord: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputMatch: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
