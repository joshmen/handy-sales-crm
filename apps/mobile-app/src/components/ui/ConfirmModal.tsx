import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  destructive = false,
  icon,
}: ConfirmModalProps) {
  const confirmBg = destructive ? '#E11D48' : '#1565C0';
  const iconCircleBg = destructive ? '#FEE2E2' : '#DBEAFE';
  const iconColor = destructive ? '#E11D48' : '#1565C0';

  const defaultIcon = destructive
    ? <AlertTriangle size={28} color={iconColor} />
    : <Info size={28} color={iconColor} />;

  // When a custom icon is provided (e.g. 3D SVG), render it directly without
  // the colored circle background. Only use the circle for the default icons.
  const hasCustomIcon = !!icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {hasCustomIcon ? (
            <View style={styles.customIconWrapper}>
              {icon}
            </View>
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
              {defaultIcon}
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {cancelText !== '' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: confirmBg }, cancelText === '' && { flex: 1 }]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    width: Math.min(SCREEN_WIDTH - 64, 340),
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
  customIconWrapper: {
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
    marginBottom: 24,
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
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
