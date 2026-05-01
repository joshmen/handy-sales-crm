import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { secureStorage } from '@/utils/storage';
import { useAuthStore } from '@/stores';

const STORAGE_KEY = 'privacy_consent_seen_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Aviso único al primer login post-deploy del feature de jornada/tracking.
 * Explica al vendedor cómo funciona el control de su ubicación.
 *
 * Mounted desde el root layout. Se muestra solo una vez por device — la
 * confirmación queda persistida en secureStorage.
 */
export function PrivacyConsentModal() {
  const { isAuthenticated, user } = useAuthStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await secureStorage.get(STORAGE_KEY);
        if (!cancelled && !seen) setVisible(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  const handleClose = async () => {
    setVisible(false);
    try { await secureStorage.set(STORAGE_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconCircle}>
            <MapPin size={32} color="#16a34a" />
          </View>
          <Text style={styles.title}>Sobre tu ubicación</Text>
          <Text style={styles.message}>
            Tu ubicación se registra <Text style={styles.bold}>solo durante tu jornada laboral</Text>, para que tu supervisor pueda ver tu actividad del día.
          </Text>
          <Text style={styles.message}>
            Tú controlas cuándo inicia y termina la jornada con los botones <Text style={styles.bold}>Iniciar jornada</Text> / <Text style={styles.bold}>Finalizar jornada</Text> en tu pantalla principal.
          </Text>
          <Text style={[styles.message, styles.note]}>
            Fuera de la jornada, no se registra absolutamente nada de tu ubicación.
          </Text>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={handleClose}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: { fontWeight: '700', color: '#0f172a' },
  note: {
    fontStyle: 'italic',
    color: '#64748b',
    fontSize: 13,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
