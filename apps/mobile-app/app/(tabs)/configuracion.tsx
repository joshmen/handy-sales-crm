import { View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Card } from '@/components/ui';
import { Bell, Wifi, Info, Shield, FileText, ChevronLeft, MapPin } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Application from 'expo-application';
import { secureStorage } from '@/utils/storage';
import { COLORS } from '@/theme/colors';
import { useAuthStore } from '@/stores';
import { useTrackingGpsEnabled } from '@/hooks/useTrackingGpsEnabled';
import {
  ensureBackgroundLocationPermission,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
} from '@/services/locationCheckpoint';

const PUSH_KEY = 'config_push_enabled';
const SYNC_KEY = 'config_auto_sync';
const GPS_KEY = 'config_gps_tracking';

export default function ConfiguracionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const trackingGpsEnabled = useTrackingGpsEnabled();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  // Reliability Fase 3: default ON per decision usuario (admin policy).
  // Vendedor puede pausar pero ese gesto lo registra explicito.
  const [gpsTracking, setGpsTracking] = useState(true);
  const [gpsSaving, setGpsSaving] = useState(false);

  // Load persisted settings
  useEffect(() => {
    secureStorage.get(PUSH_KEY).then((v) => { if (v !== null) setPushEnabled(v === 'true'); });
    secureStorage.get(SYNC_KEY).then((v) => { if (v !== null) setAutoSync(v === 'true'); });
    secureStorage.get(GPS_KEY).then((v) => { if (v !== null) setGpsTracking(v === 'true'); });
  }, []);

  const togglePush = (val: boolean) => {
    setPushEnabled(val);
    secureStorage.set(PUSH_KEY, String(val)).catch(() => {});
  };

  const toggleSync = (val: boolean) => {
    setAutoSync(val);
    secureStorage.set(SYNC_KEY, String(val)).catch(() => {});
  };

  const toggleGps = async (val: boolean) => {
    if (gpsSaving) return;
    setGpsSaving(true);
    try {
      if (val) {
        // Activar: pedir permisos foreground + background (Android 10+ obliga
        // a 2 prompts separados). Si user solo da "Mientras uso la app",
        // background queda inactivo y mostramos Alert explicativo.
        const granted = await ensureBackgroundLocationPermission();
        if (!granted) {
          Alert.alert(
            'Permiso de ubicación incompleto',
            'Para que el supervisor vea tu ruta aunque cierres la app, abre Ajustes y permite acceder a la ubicación "Todo el tiempo".',
            [
              { text: 'Más tarde', style: 'cancel' },
              { text: 'Abrir Ajustes', onPress: () => Linking.openSettings().catch(() => {}) },
            ]
          );
          setGpsSaving(false);
          return; // No persistir true si no se concedio
        }
        if (user?.id) {
          const uid = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
          await startBackgroundLocationUpdates(uid);
        }
      } else {
        await stopBackgroundLocationUpdates();
        Toast.show({
          type: 'info',
          text1: 'Tracking GPS pausado',
          text2: 'El supervisor no recibira tu ubicacion hasta que reactives.',
          visibilityTime: 3500,
        });
      }
      setGpsTracking(val);
      await secureStorage.set(GPS_KEY, String(val));
    } catch (err) {
      if (__DEV__) console.warn('[Configuracion] toggleGps error:', err);
      Toast.show({
        type: 'error',
        text1: 'No se pudo cambiar el tracking',
        text2: 'Intenta nuevamente en un momento.',
      });
    } finally {
      setGpsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
      {/* Notifications */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <Card className="mb-4">
          <View style={styles.settingRow}>
            <Bell size={18} color="#6b7280" style={{ marginRight: 12 }} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Notificaciones push</Text>
              <Text style={styles.settingDesc}>Recibe alertas de pedidos y rutas</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={pushEnabled ? '#16a34a' : '#f1f5f9'}
              accessibilityLabel="Notificaciones push"
              accessibilityRole="switch"
            />
          </View>
        </Card>
      </Animated.View>

      {/* Data */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <Text style={styles.sectionTitle}>Datos</Text>
        <Card className="mb-4">
          <View style={styles.settingRow}>
            <Wifi size={18} color="#6b7280" style={{ marginRight: 12 }} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Sincronización automática</Text>
              <Text style={styles.settingDesc}>Sincronizar datos cuando haya conexión</Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={toggleSync}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={autoSync ? '#16a34a' : '#f1f5f9'}
              accessibilityLabel="Sincronización automática"
              accessibilityRole="switch"
            />
          </View>
        </Card>
      </Animated.View>

      {/* Privacidad — visible solo si el plan tenant incluye tracking_vendedor */}
      {trackingGpsEnabled && (
        <Animated.View entering={FadeInDown.duration(400).delay(250)}>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          <Card className="mb-4">
            <View style={styles.settingRow}>
              <MapPin size={18} color="#6b7280" style={{ marginRight: 12 }} />
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Tracking GPS en segundo plano</Text>
                <Text style={styles.settingDesc}>
                  El supervisor ve tu ubicacion durante la jornada laboral.
                  Veras una notificacion persistente mientras esta activo.
                </Text>
              </View>
              <Switch
                value={gpsTracking}
                onValueChange={toggleGps}
                disabled={gpsSaving}
                trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                thumbColor={gpsTracking ? '#16a34a' : '#f1f5f9'}
                accessibilityLabel="Tracking GPS background"
                accessibilityRole="switch"
              />
            </View>
          </Card>
        </Animated.View>
      )}

      {/* About */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
      <Text style={styles.sectionTitle}>Acerca de</Text>
      <Card className="mb-4">
        <View style={styles.aboutItem}>
          <Info size={18} color="#6b7280" style={{ marginRight: 12 }} />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Versión</Text>
            <Text style={styles.settingDesc}>
              {Application.nativeApplicationVersion || '1.0.0'} ({Application.nativeBuildVersion || '1'})
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.aboutItem}
          onPress={() => Linking.openURL('https://handysuites.com/privacidad').catch(() => {})}
          activeOpacity={0.7}
          accessibilityLabel="Abrir política de privacidad"
          accessibilityRole="link"
        >
          <Shield size={18} color="#6b7280" style={{ marginRight: 12 }} />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Privacidad</Text>
            <Text style={styles.settingDesc}>Política de privacidad</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.aboutItem}
          onPress={() => Linking.openURL('https://handysuites.com/terminos').catch(() => {})}
          activeOpacity={0.7}
          accessibilityLabel="Abrir términos y condiciones"
          accessibilityRole="link"
        >
          <FileText size={18} color="#6b7280" style={{ marginRight: 12 }} />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Términos</Text>
            <Text style={styles.settingDesc}>Términos y condiciones</Text>
          </View>
        </TouchableOpacity>
      </Card>
      </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 60 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  settingDesc: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
    marginLeft: 30,
  },
});
