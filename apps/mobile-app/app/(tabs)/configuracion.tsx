import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';
import { Bell, Wifi, Info, Shield, FileText } from 'lucide-react-native';
import * as Application from 'expo-application';
import { secureStorage } from '@/utils/storage';

const PUSH_KEY = 'config_push_enabled';
const SYNC_KEY = 'config_auto_sync';

export default function ConfiguracionScreen() {
  const insets = useSafeAreaInsets();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  // Load persisted settings
  useEffect(() => {
    secureStorage.get(PUSH_KEY).then((v) => { if (v !== null) setPushEnabled(v === 'true'); });
    secureStorage.get(SYNC_KEY).then((v) => { if (v !== null) setAutoSync(v === 'true'); });
  }, []);

  const togglePush = (val: boolean) => {
    setPushEnabled(val);
    secureStorage.set(PUSH_KEY, String(val));
  };

  const toggleSync = (val: boolean) => {
    setAutoSync(val);
    secureStorage.set(SYNC_KEY, String(val));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Configuración</Text>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notificaciones</Text>
      <Card className="mb-4">
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: '#dbeafe' }]}>
            <Bell size={18} color="#2563eb" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Notificaciones push</Text>
            <Text style={styles.settingDesc}>Recibe alertas de pedidos y rutas</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={togglePush}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={pushEnabled ? '#2563eb' : '#f1f5f9'}
          />
        </View>
      </Card>

      {/* Data */}
      <Text style={styles.sectionTitle}>Datos</Text>
      <Card className="mb-4">
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: '#dcfce7' }]}>
            <Wifi size={18} color="#16a34a" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Sincronización automática</Text>
            <Text style={styles.settingDesc}>Sincronizar datos cuando haya conexión</Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={toggleSync}
            trackColor={{ false: '#e2e8f0', true: '#86efac' }}
            thumbColor={autoSync ? '#16a34a' : '#f1f5f9'}
          />
        </View>
      </Card>

      {/* About */}
      <Text style={styles.sectionTitle}>Acerca de</Text>
      <Card className="mb-4">
        <View style={styles.aboutItem}>
          <View style={[styles.settingIcon, { backgroundColor: '#f1f5f9' }]}>
            <Info size={18} color="#64748b" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Versión</Text>
            <Text style={styles.settingDesc}>
              {Application.nativeApplicationVersion || '1.0.0'} ({Application.nativeBuildVersion || '1'})
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutItem}>
          <View style={[styles.settingIcon, { backgroundColor: '#ede9fe' }]}>
            <Shield size={18} color="#7c3aed" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Privacidad</Text>
            <Text style={styles.settingDesc}>Política de privacidad</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutItem}>
          <View style={[styles.settingIcon, { backgroundColor: '#fef3c7' }]}>
            <FileText size={18} color="#d97706" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Términos</Text>
            <Text style={styles.settingDesc}>Términos y condiciones</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  settingDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
    marginLeft: 48,
  },
});
