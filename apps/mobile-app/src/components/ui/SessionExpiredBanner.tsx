import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores';

const BANNER_HEIGHT = 44;
const TAB_BAR_HEIGHT = 60;

/**
 * Audit 2026-05-19 — Banner persistente cuando authStore.sessionExpired === true.
 *
 * El redesign de sesiones (audit 2026-05-18) introdujo soft-logout: cuando el
 * backend retorna 401 SESSION_REVOKED o el refresh falla irrecuperablemente,
 * el cliente NO limpia tokens ni hace logout brusco — solo prende
 * `authStore.sessionExpired = true` para preservar WatermelonDB pending data.
 *
 * Pero NADIE leía esa bandera en la UI. Resultado: el user veía "Network Error"
 * genérico en pantallas como Sincronización y no sabía qué hacer (incident
 * vendedor@jeyma 2026-05-19 — 12 pedidos pendientes con flag activa pero sin
 * banner visible).
 *
 * Este componente consume `sessionExpired` y muestra banner persistente con
 * CTA "Iniciar sesión" que navega al login (preservando WDB local). Una vez
 * en login screen, el user re-loguea y la nueva sesión + tokens limpios
 * permiten que el sync engine retome los 12 pedidos pendientes.
 */
export function SessionExpiredBanner() {
  const sessionExpired = useAuthStore(s => s.sessionExpired);
  const router = useRouter();

  if (!sessionExpired) return null;

  return (
    <View style={styles.banner}>
      <AlertCircle size={16} color="#ffffff" />
      <Text style={styles.text} numberOfLines={1}>
        Tu sesión necesita renovarse
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/(auth)/login' as any)}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión de nuevo"
      >
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 1000,
    minHeight: BANNER_HEIGHT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
});
