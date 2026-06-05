import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Trash2, AlertTriangle, AlertCircle, CheckCircle, WifiOff, RefreshCcw,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { TypeToConfirmModal } from '@/components/ui';
import { useCanResetSafely } from '@/hooks/useCanResetSafely';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores';
import { resetDatabase } from '@/db/database';
import { crashReporter } from '@/services/crashReporter';
import { COLORS } from '@/theme/colors';

/**
 * C.2 sub-pantalla dedicada (fix prod 2026-06-04 post-incidente Rodrigo):
 * "Restaurar desde servidor" extraido de sync.tsx a su propia pantalla bajo
 * (tabs)/restaurar-datos. Patron de hardening recomendado por workflow de
 * analisis paralelo (3 lenses):
 *   - Mover lejos del scroll diario de sync (reduce tap accidental)
 *   - Re-etiquetar 'BORRADO DE DATOS' + icono Trash2 (alinea senales destructivas)
 *   - Mostrar blockers desglosados con counts reales (no solo "tienes pendientes")
 *   - TypeToConfirmModal con palabra "RESTAURAR" como fricion final
 *   - Funnel telemetry via crashReporter.reportEvent (sin SDK nuevo)
 *
 * NO se borra SecureStore (JWT/deviceId): el restore NO es logout. El usuario
 * sigue identificado, solo le bajamos el dataset fresh del server.
 */

export default function RestaurarDatosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    canReset,
    hardBlockers,
    softWarnings,
    isLoading,
    isOnline,
    isSyncing,
    sessionExpired,
    sessionExpiredBlocksDestructive,
  } = useCanResetSafely();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Fix prod 2026-06-05 (data-loss prevention): telemetria del pattern Rodrigo
  // cuando el user llega a esta pantalla con sesion expirada. Se logueo en prod
  // para cuantificar cuantas veces ocurre el escenario que detectamos en QA.
  useEffect(() => {
    if (sessionExpired) {
      void crashReporter.reportEvent('restore_database_session_expired_view', {
        hardBlockerCount: hardBlockers.length,
        softWarningCount: softWarnings.length,
      });
    }
  }, [sessionExpired, hardBlockers.length, softWarnings.length]);

  const handleReLogin = () => {
    void crashReporter.reportEvent('restore_database_session_expired_relogin_clicked');
    router.replace('/(auth)/login' as any);
  };

  const handleOpenConfirm = () => {
    void crashReporter.reportEvent('restore_database_modal_open', {
      hardBlockerCount: hardBlockers.length,
      softWarningCount: softWarnings.length,
    });
    setShowConfirm(true);
  };

  const handleRestore = async () => {
    // Guard final hardening 2026-06-05: lectura FRESH del store (no closure)
    // para cubrir el window entre tap del modal y este handler (otro device
    // pudo revocar la sesion entre render y confirm). Si sessionExpired,
    // abortar ANTES de tocar resetDatabase() INDEPENDIENTE de hardBlockers:
    // sin auth, sync pull post-wipe falla 401 -> WDB en cero sin recovery.
    const freshSessionExpired = useAuthStore.getState().sessionExpired;
    if (freshSessionExpired) {
      Toast.show({
        type: 'error',
        text1: 'Sesion expirada',
        text2: 'Inicia sesion antes de restaurar.',
        visibilityTime: 5000,
      });
      setShowConfirm(false);
      return;
    }
    setRestoring(true);
    void crashReporter.reportEvent('restore_database_confirmed', {
      sessionExpired,
      forceOverride: false,
    });
    try {
      await resetDatabase();
      void crashReporter.reportEvent('restore_database_success');
      // Sync fresh from server
      try {
        await useSyncStore.getState().sync();
      } catch {
        // si el primer sync falla, no es bloqueante. El usuario lo vera en
        // pantalla de Sync y puede reintentar manualmente.
      }
      setShowConfirm(false);
      Toast.show({
        type: 'success',
        text1: 'Datos restaurados',
        text2: 'Los datos del servidor estan actualizados en tu dispositivo.',
        visibilityTime: 5000,
      });
      // Navegar a Hoy: el contexto de "Restaurar" ya termino, lo logico es
      // volver al home, no quedarse en una pantalla que ya no aplica.
      router.replace('/(tabs)/mas' as any);
    } catch (err: any) {
      const message = err?.message ?? 'Intenta de nuevo en un momento.';
      void crashReporter.reportEvent('restore_database_error', { message });
      Toast.show({
        type: 'error',
        text1: 'Error al restaurar',
        text2: message,
        visibilityTime: 6000,
      });
    } finally {
      setRestoring(false);
    }
  };

  /**
   * Override para casos extremos: sesion expirada + pendientes. El user acepta
   * conscientemente perder los pendientes (sync push fallara 401) a cambio de
   * limpiar el dispositivo y poder re-loguearse con dataset fresh.
   *
   * Caso real: vendedor cambio de tenant, fue dado de baja, o password reseteado
   * - los pendientes son irrecuperables de todos modos. Mejor permitirle salir
   * del limbo que dejarlo atrapado sin recovery posible.
   */
  const handleForceRestore = async () => {
    setRestoring(true);
    void crashReporter.reportEvent('restore_database_force_override', {
      hardBlockerCount: hardBlockers.length,
      sessionExpired: true,
    });
    try {
      await resetDatabase();
      // NO intentamos sync — sabemos que fallaria con 401. El user re-loguea despues.
      setShowForceConfirm(false);
      Toast.show({
        type: 'success',
        text1: 'Datos borrados',
        text2: 'Inicia sesion para descargar de nuevo.',
        visibilityTime: 5000,
      });
      router.replace('/(auth)/login' as any);
    } catch (err: any) {
      const message = err?.message ?? 'Intenta de nuevo en un momento.';
      void crashReporter.reportEvent('restore_database_force_override_error', { message });
      Toast.show({
        type: 'error',
        text1: 'Error al restaurar',
        text2: message,
        visibilityTime: 6000,
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleSyncNow = () => {
    // Defense-in-depth: si la sesion expiro, no dispares sync (fallara 401).
    // Redirige directamente al re-login para evitar el loop visual del blocker.
    if (sessionExpired) {
      handleReLogin();
      return;
    }
    void useSyncStore.getState().sync().catch(() => {});
  };

  // Boton principal deshabilitado SIEMPRE que sessionExpired (hardening
  // 2026-06-05): sin auth, sync pull post-wipe falla 401 -> WDB en cero sin
  // recovery + toast de exito miente. Forzar Iniciar sesion como CTA primario.
  // El override 'Restaurar de todos modos' (dentro del SessionExpiredCard)
  // solo aparece cuando hardBlockers > 0 (hay algo conscientemente que perder).
  const buttonDisabled = !canReset || restoring || isLoading || sessionExpiredBlocksDestructive;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header indigo */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.navigate('/(tabs)/mas' as any)}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Borrado de datos</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        {/* Intro */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Trash2 size={28} color="#dc2626" />
            </View>
            <Text style={styles.introTitle}>Borrar datos locales y volver a descargar</Text>
            <Text style={styles.introBody}>
              Esta accion BORRA toda la informacion guardada en tu dispositivo (clientes,
              productos, pedidos, fotos) y la descarga de nuevo desde el servidor.
              {'\n\n'}
              Usala solo si crees que tus datos estan danados o no se ven correctamente.
            </Text>
          </View>
        </Animated.View>

        {/* Branch A: sesion expirada (fix prod 2026-06-05 data-loss prevention).
            Cuando server revoco la sesion, el sync push falla 401 y el blocker
            anterior creaba un loop visual sin CTA accionable. Mostramos card
            amarilla con boton 'Iniciar sesion' (mismo handler que SessionExpiredBanner).
            Si ademas hay pendientes, ofrecemos override 'Restaurar de todos
            modos' con confirmation distinta ('PERDER PENDIENTES'). */}
        {!isLoading && sessionExpired && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sessionExpiredTitle}>TU SESION EXPIRO</Text>
            <View style={styles.sessionExpiredCard}>
              <View style={styles.sessionExpiredHeader}>
                <AlertCircle size={20} color="#d97706" />
                <Text style={styles.sessionExpiredHeaderText}>Tu sesion expiro</Text>
              </View>
              <Text style={styles.sessionExpiredSubtitle}>
                {hardBlockers.length > 0
                  ? 'Inicia sesion para sincronizar tus pendientes y poder restaurar.'
                  : 'Inicia sesion para descargar los datos del servidor.'}
              </Text>
              {hardBlockers.length > 0 && (
                <View style={styles.blockerList}>
                  {hardBlockers.map((b) => (
                    <View key={b.table} style={styles.blockerRow}>
                      <View style={[styles.blockerDot, { backgroundColor: '#d97706' }]} />
                      <Text style={styles.blockerLabel}>{b.label}</Text>
                      <Text style={[styles.blockerCount, { color: '#d97706' }]}>{b.count}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.reLoginButton}
                onPress={handleReLogin}
                activeOpacity={0.8}
                accessibilityLabel="Iniciar sesion"
                accessibilityRole="button"
              >
                <Text style={styles.reLoginButtonText}>Iniciar sesion</Text>
              </TouchableOpacity>
              {sessionExpired && hardBlockers.length > 0 && (
                <TouchableOpacity
                  style={styles.forceOverrideButton}
                  onPress={() => setShowForceConfirm(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="Restaurar de todos modos perderas pendientes"
                  accessibilityRole="button"
                >
                  <Text style={styles.forceOverrideText}>Restaurar de todos modos</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Branch B: pendientes SIN sesion expirada -> bloque rojo original */}
        {!isLoading && !sessionExpired && hardBlockers.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sectionTitle}>NO PUEDES RESTAURAR AUN</Text>
            <View style={styles.blockerCard}>
              <View style={styles.blockerHeader}>
                <AlertTriangle size={20} color="#dc2626" />
                <Text style={styles.blockerHeaderText}>
                  Tienes informacion sin enviar al servidor
                </Text>
              </View>
              <Text style={styles.blockerSubtitle}>
                Si restauras ahora se perdera para siempre. Sincroniza primero.
              </Text>
              <View style={styles.blockerList}>
                {hardBlockers.map((b) => (
                  <View key={b.table} style={styles.blockerRow}>
                    <View style={styles.blockerDot} />
                    <Text style={styles.blockerLabel}>{b.label}</Text>
                    <Text style={styles.blockerCount}>{b.count}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.syncButton, (isSyncing || !isOnline) && styles.syncButtonDisabled]}
                onPress={handleSyncNow}
                activeOpacity={0.8}
                disabled={isSyncing || !isOnline}
                accessibilityLabel="Sincronizar ahora"
                accessibilityRole="button"
              >
                <RefreshCcw size={16} color={isSyncing || !isOnline ? '#94a3b8' : COLORS.headerText} />
                <Text style={[styles.syncButtonText, (isSyncing || !isOnline) && styles.syncButtonTextDisabled]}>
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Soft warnings (jornada activa, GPS pendings, etc.) */}
        {!isLoading && softWarnings.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View style={styles.warnCard}>
              <View style={styles.warnHeader}>
                <AlertCircle size={18} color="#d97706" />
                <Text style={styles.warnHeaderText}>Tambien perderas</Text>
              </View>
              <View style={styles.warnList}>
                {softWarnings.map((b) => (
                  <View key={b.table} style={styles.warnRow}>
                    <View style={styles.warnDot} />
                    <Text style={styles.warnLabel}>{b.label}</Text>
                    {b.count > 0 && b.table !== 'jornada' && (
                      <Text style={styles.warnCount}>{b.count}</Text>
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.warnFootnote}>
                Esta informacion es operacional pero no es input directo tuyo. Puedes
                continuar si entiendes que se perdera.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Green status si todo limpio Y sesion valida. Si sessionExpired,
            el SessionExpiredCard amarillo arriba ya da el contexto correcto. */}
        {!isLoading && !sessionExpired && hardBlockers.length === 0 && isOnline && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.okCard}>
            <CheckCircle size={20} color="#16a34a" />
            <Text style={styles.okText}>
              No tienes datos sin sincronizar. Puedes restaurar de forma segura.
            </Text>
          </Animated.View>
        )}

        {/* Offline warning */}
        {!isOnline && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.offlineCard}>
            <WifiOff size={20} color="#dc2626" />
            <Text style={styles.offlineText}>
              Sin conexion. Necesitas internet para descargar los datos del servidor.
            </Text>
          </Animated.View>
        )}

        {/* Restore button - siempre visible pero gated */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginTop: 24 }}>
          <TouchableOpacity
            style={[styles.restoreButton, buttonDisabled && styles.restoreButtonDisabled]}
            onPress={handleOpenConfirm}
            activeOpacity={0.8}
            disabled={buttonDisabled}
            accessibilityLabel="Borrar datos locales y descargar de nuevo"
            accessibilityRole="button"
            accessibilityState={{ disabled: buttonDisabled }}
          >
            <Trash2 size={18} color={buttonDisabled ? '#9ca3af' : '#ffffff'} />
            <Text style={[styles.restoreButtonText, buttonDisabled && styles.restoreButtonTextDisabled]}>
              Borrar datos locales y volver a descargar
            </Text>
          </TouchableOpacity>
          <Text style={styles.restoreHint}>
            Ultimo recurso. Esta accion no se puede deshacer.
          </Text>
        </Animated.View>
      </View>

      <TypeToConfirmModal
        visible={showConfirm}
        title="Borrar datos locales"
        message="Esto borrara toda la informacion guardada en tu dispositivo y la descargara de nuevo del servidor. Esta accion no se puede deshacer."
        requiredText="RESTAURAR"
        autoCapitalize="characters"
        confirmText="Borrar y descargar"
        cancelText="Cancelar"
        destructive
        loading={restoring}
        onConfirm={handleRestore}
        onCancel={() => {
          if (!restoring) {
            setShowConfirm(false);
          }
        }}
      />

      {/* Override modal: solo se abre desde el SessionExpiredCard cuando hay
          pendientes + sesion expirada. Palabra distinta a 'RESTAURAR' para
          forzar consciencia del costo (perder pendientes irrecuperables). */}
      <TypeToConfirmModal
        visible={showForceConfirm}
        title="Perderas pendientes"
        message={`Tienes ${hardBlockers.reduce((s, b) => s + b.count, 0)} registros sin enviar al servidor. Como tu sesion expiro, NO se podran recuperar. Si continuas, se perderan para siempre.`}
        requiredText="PERDER PENDIENTES"
        autoCapitalize="characters"
        confirmText="Si, borrar de todos modos"
        cancelText="Cancelar"
        destructive
        loading={restoring}
        onConfirm={handleForceRestore}
        onCancel={() => {
          if (!restoring) {
            setShowForceConfirm(false);
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  introCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  introBody: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 12,
  },
  blockerCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  blockerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  blockerHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    flex: 1,
  },
  blockerSubtitle: {
    fontSize: 12,
    color: '#7f1d1d',
    marginBottom: 12,
  },
  blockerList: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  blockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  blockerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  blockerLabel: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  blockerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.headerBg,
    paddingVertical: 12,
    borderRadius: 10,
  },
  syncButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headerText,
  },
  syncButtonTextDisabled: {
    color: '#94a3b8',
  },
  warnCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  warnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warnHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  warnList: {
    marginBottom: 8,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  warnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  warnLabel: {
    fontSize: 13,
    color: '#78350f',
    flex: 1,
  },
  warnCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  warnFootnote: {
    fontSize: 11,
    color: '#92400e',
    fontStyle: 'italic',
    marginTop: 4,
  },
  okCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  okText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  restoreButtonDisabled: {
    backgroundColor: '#f1f5f9',
    shadowOpacity: 0,
    elevation: 0,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  restoreButtonTextDisabled: {
    color: '#9ca3af',
  },
  restoreHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },
  // SessionExpiredCard (fix prod 2026-06-05 data-loss prevention).
  // Color amber (#d97706) consistente con SessionExpiredBanner que ya existe
  // en (tabs)/_layout.tsx. NO uso rojo (#dc2626) para no confundirse con el
  // bloque hard blockers "NO PUEDES RESTAURAR AUN" — son escenarios distintos.
  sessionExpiredTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 12,
  },
  sessionExpiredCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sessionExpiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sessionExpiredHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    flex: 1,
  },
  sessionExpiredSubtitle: {
    fontSize: 13,
    color: '#78350f',
    marginBottom: 12,
    lineHeight: 18,
  },
  reLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  reLoginButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  forceOverrideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  forceOverrideText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
  },
});
