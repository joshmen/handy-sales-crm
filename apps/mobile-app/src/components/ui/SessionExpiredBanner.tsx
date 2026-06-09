import React, { useEffect } from 'react';
import { AccessibilityInfo, Platform, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const BANNER_HEIGHT = 44;
// Audit 2026-06-01 (v6) — F2 revert: el reviewer de v4/v5 estaba equivocado.
// En RN, `position: 'absolute'` + `bottom: X` mide DESDE EL BORDE DE LA
// PANTALLA, no desde el tab bar. El tab bar real tiene altura
// `60 + insets.bottom` (ver app/(tabs)/_layout.tsx:53), así que para
// sentarnos JUSTO arriba del tab bar necesitamos `bottom = 60 + insets.bottom`.
// Sin el inset, el banner queda OCLUIDO por el área safe-area del tab bar
// en devices con home-indicator (iPhone X+) o gesture nav (Android 10+).
const TAB_BAR_HEIGHT = 60;
// Audit 2026-06-01 (v5) — F6: cuando OfflineBanner está visible, ocupa
// 30dp encima del tab bar (ver src/components/ui/OfflineBanner.tsx:6).
// El SessionExpiredBanner debe desplazarse esa misma cantidad para no
// ocluirlo en Android 3-button nav (donde no hay safe-area inset bottom).
const OFFLINE_BANNER_HEIGHT = 30;

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
  const insets = useSafeAreaInsets();
  // Audit 2026-06-01 (v5) — F6: cuando el OfflineBanner está visible (offline),
  // se monta a `bottom: TAB_BAR_HEIGHT` con altura 30dp. Sin offset, el
  // SessionExpiredBanner aterrizaría sobre el OfflineBanner y lo ocluiría
  // (sobre todo en Android con 3-button nav donde no hay inset bottom que
  // los separe). Desplazamos el banner de sesión hacia arriba lo que mide
  // el OfflineBanner cuando aplica.
  const { isConnected } = useNetworkStatus();

  // Audit 2026-06-01 (v6) — F5 fix: el componente está montado SIEMPRE en
  // (tabs)/_layout.tsx (solo renderiza null cuando flag=false vía early
  // return abajo). El effect anterior corría en CADA mount, incluso después
  // de login fresh, así que iOS VoiceOver anunciaba "Tu sesión necesita
  // renovarse" sin que el banner fuera visible. Gateamos con `sessionExpired`
  // para anunciar SOLO cuando el flag flip de false→true.
  useEffect(() => {
    if (Platform.OS === 'ios' && sessionExpired) {
      AccessibilityInfo.announceForAccessibility(
        'Tu sesión necesita renovarse. Toca para iniciar sesión de nuevo.'
      );
    }
  }, [sessionExpired]);

  if (!sessionExpired) return null;

  // Audit 2026-06-01 (v6) — F2 revert: sumar `insets.bottom` para sentarnos
  // sobre el tab bar real (que mide `60 + insets.bottom`). Ver TAB_BAR_HEIGHT
  // arriba para el razonamiento completo.
  // NOTA: OfflineBanner.tsx NO suma insets.bottom (usa `bottom: TAB_BAR_HEIGHT`
  // plano). Esa asimetría es un bug separado en OfflineBanner — debería sumar
  // inset por la misma razón que aquí. Ver warning en el output del audit.
  const computedBottom = TAB_BAR_HEIGHT + insets.bottom + (isConnected ? 0 : OFFLINE_BANNER_HEIGHT);

  return (
    <View
      style={[styles.banner, { bottom: computedBottom }]}
      // Audit 2026-06-01 (v4) — a11y: lectores de pantalla deben anunciar el
      // banner cuando aparece (es información crítica de sesión). `polite`
      // espera a que termine la lectura actual; `alert` lo marca como rol
      // crítico para TalkBack/VoiceOver. (Android: este atributo es
      // suficiente. iOS no lo respeta; ver useEffect arriba.)
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <AlertCircle size={16} color="#ffffff" />
      <Text style={styles.text} numberOfLines={1}>
        Tu sesión expiró
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/(auth)/login')}
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
    // bottom se inyecta inline: TAB_BAR_HEIGHT (60) + insets.bottom (safe-area)
    // + OFFLINE_BANNER_HEIGHT cuando hay OfflineBanner visible. El tab bar real
    // mide `60 + insets.bottom`, así que para sentarnos sobre él necesitamos
    // ambos sumandos (ver (tabs)/_layout.tsx:53).
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
    // Audit 2026-06-01 (v4) — touch target 44dp (Apple HIG / Material 48dp
    // mínimo cómodo). Antes el botón tenía ~28dp de altura efectiva
    // (paddingVertical 6 + line-height del fontSize 12), insuficiente.
    minHeight: 44,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
});
