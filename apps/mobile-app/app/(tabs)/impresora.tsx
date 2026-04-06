import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';
import { usePrinterStore } from '@/stores/printerStore';
import {
  isNativeAvailable,
  enableBluetooth,
  scanBluetoothDevices,
  connectDevice,
  disconnectDevice,
  printReceipt,
} from '@/services/printerService';
import type { PrinterDevice, ConnectionType } from '@/services/printerService';
import { useAuthStore } from '@/stores';
import {
  Printer,
  Bluetooth,
  BluetoothOff,
  Wifi,
  RefreshCcw,
  CheckCircle,
  Smartphone,
  AlertTriangle,
  Zap,
  ChevronLeft,
} from 'lucide-react-native';

type Tab = 'bluetooth' | 'wifi';

export default function ImpresoraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    connectedDevice,
    savedDevice,
    isConnecting,
    paperWidth,
    setConnectedDevice,
    setSavedDevice,
    setConnecting,
    setPaperWidth,
    restoreSaved,
  } = usePrinterStore();

  const [available, setAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('bluetooth');
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [printing, setPrinting] = useState(false);

  // WiFi form
  const [wifiHost, setWifiHost] = useState('');
  const [wifiPort, setWifiPort] = useState('9100');
  const [wifiName, setWifiName] = useState('');

  useEffect(() => {
    const native = isNativeAvailable();
    setAvailable(native);
    restoreSaved();
  }, []);

  // --- Bluetooth scan ---
  const handleBtScan = useCallback(async () => {
    setScanning(true);
    try {
      const btOn = await enableBluetooth();
      if (!btOn) {
        Toast.show({
          type: 'error',
          text1: 'Bluetooth',
          text2: 'No se pudo activar el Bluetooth. Verifica que esté encendido y acepta los permisos.',
        });
        return;
      }
      const found = await scanBluetoothDevices();
      setDevices(found);
      if (found.length === 0) {
        Toast.show({ type: 'error', text1: 'Sin dispositivos', text2: 'No se encontraron impresoras emparejadas. Empareja tu impresora desde Ajustes de Android primero.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error al escanear dispositivos' });
    } finally {
      setScanning(false);
    }
  }, []);

  // --- Connect (any type) ---
  const handleConnect = useCallback(async (device: PrinterDevice) => {
    setConnecting(true);
    try {
      const ok = await connectDevice(device);
      if (ok) {
        setConnectedDevice(device);
        setSavedDevice(device);
        Toast.show({ type: 'success', text1: 'Conectada', text2: `"${device.name}" conectada exitosamente` });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo conectar' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error de conexión' });
    } finally {
      setConnecting(false);
    }
  }, []);

  // --- WiFi connect ---
  const handleWifiConnect = useCallback(() => {
    const host = wifiHost.trim();
    if (!host) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Ingresa la dirección IP de la impresora' });
      return;
    }
    const port = parseInt(wifiPort, 10) || 9100;
    const name = wifiName.trim() || `Impresora ${host}`;
    const device: PrinterDevice = {
      name,
      address: `${host}:${port}`,
      type: 'wifi',
    };
    handleConnect(device);
  }, [wifiHost, wifiPort, wifiName, handleConnect]);

  // --- Disconnect ---
  const handleDisconnect = useCallback(async () => {
    await disconnectDevice();
    setConnectedDevice(null);
  }, []);

  // --- Test print ---
  const handleTestPrint = useCallback(async () => {
    setPrinting(true);
    try {
      const ok = await printReceipt({
        companyName: user?.tenantName || 'Handy Suites',
        clienteNombre: 'Cliente de Prueba',
        monto: 1500.00,
        metodoPago: 0,
        referencia: 'TEST-001',
        fecha: new Date().toISOString(),
        vendedorName: user?.name || 'Vendedor',
        logoUri: user?.tenantLogo || undefined,
      });
      if (ok) {
        Toast.show({ type: 'success', text1: 'Listo', text2: 'Impresión de prueba enviada' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo imprimir. Verifica la conexión.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error al imprimir' });
    } finally {
      setPrinting(false);
    }
  }, [user]);

  // --- Not available (Expo Go) ---
  if (!available) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Impresora</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.body}>
        <View style={styles.unavailableCard}>
          <View style={styles.unavailableIcon}>
            <BluetoothOff size={48} color="#94a3b8" />
          </View>
          <Text style={styles.unavailableTitle}>No disponible en Expo Go</Text>
          <Text style={styles.unavailableDesc}>
            La conexión con impresoras requiere un APK nativo. Genera un build con EAS para usar la impresora térmica.
          </Text>
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Cómo activar:</Text>
            <Text style={styles.step}>1. Ejecuta: eas build --platform android --profile preview</Text>
            <Text style={styles.step}>2. Instala el APK generado en tu celular</Text>
            <Text style={styles.step}>3. Conecta tu impresora (Bluetooth o WiFi)</Text>
            <Text style={styles.step}>4. Regresa aquí para configurar</Text>
          </View>
        </View>
        </View>
      </ScrollView>
    );
  }

  // --- Native available (APK) ---
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impresora</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>

      {/* Connection Status */}
      {connectedDevice && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={[styles.statusCard, styles.statusConnected]}>
          <View style={styles.statusRow}>
            {connectedDevice.type === 'wifi' ? (
              <Wifi size={24} color="#16a34a" />
            ) : (
              <Bluetooth size={24} color="#16a34a" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Conectada</Text>
              <Text style={styles.statusDevice}>
                {connectedDevice.name} ({connectedDevice.type === 'wifi' ? 'WiFi' : 'Bluetooth'})
              </Text>
            </View>
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} accessibilityLabel="Desconectar impresora" accessibilityRole="button">
              <Text style={styles.disconnectText}>Desconectar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.testPrintBtn}
            onPress={handleTestPrint}
            disabled={printing}
            activeOpacity={0.7}
            accessibilityLabel="Imprimir prueba"
            accessibilityRole="button"
          >
            {printing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Zap size={18} color={COLORS.primary} />
            )}
            <Text style={styles.testPrintText}>
              {printing ? 'Imprimiendo...' : 'Imprimir prueba'}
            </Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      )}

      {/* Paper width toggle */}
      <Animated.View entering={FadeInDown.duration(400).delay(150)}>
        <View style={styles.statusCard}>
          <Text style={[styles.statusTitle, { marginBottom: 8 }]}>Ancho de papel</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.widthChip, paperWidth === 58 && styles.widthChipActive]}
              onPress={() => setPaperWidth(58)}
              accessibilityLabel="Papel 58 milímetros"
              accessibilityState={{ selected: paperWidth === 58 }}
            >
              <Text style={[styles.widthChipText, paperWidth === 58 && styles.widthChipTextActive]}>58mm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.widthChip, paperWidth === 80 && styles.widthChipActive]}
              onPress={() => setPaperWidth(80)}
              accessibilityLabel="Papel 80 milímetros"
              accessibilityState={{ selected: paperWidth === 80 }}
            >
              <Text style={[styles.widthChipText, paperWidth === 80 && styles.widthChipTextActive]}>80mm</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 6 }}>
            {paperWidth === 80 ? 'Soporta ticket CFDI completo' : 'Solo nota de venta + QR'}
          </Text>
        </View>
      </Animated.View>

      {/* Saved device quick-connect */}
      {!connectedDevice && savedDevice && (
        <TouchableOpacity
          style={styles.savedCard}
          onPress={() => handleConnect(savedDevice)}
          disabled={isConnecting}
          activeOpacity={0.7}
        >
          <View style={styles.savedIcon}>
            <Printer size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.savedName}>{savedDevice.name}</Text>
            <Text style={styles.savedHint}>
              Última usada ({savedDevice.type === 'wifi' ? 'WiFi' : 'Bluetooth'}) — toca para reconectar
            </Text>
          </View>
          {isConnecting ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Bluetooth size={18} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      )}

      {/* Connection Type Tabs */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bluetooth' && styles.tabActive]}
          onPress={() => setActiveTab('bluetooth')}
          accessibilityLabel="Bluetooth"
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'bluetooth' }}
        >
          <Bluetooth size={16} color={activeTab === 'bluetooth' ? COLORS.primary : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'bluetooth' && styles.tabTextActive]}>
            Bluetooth
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wifi' && styles.tabActive]}
          onPress={() => setActiveTab('wifi')}
          accessibilityLabel="WiFi / Red"
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'wifi' }}
        >
          <Wifi size={16} color={activeTab === 'wifi' ? COLORS.primary : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'wifi' && styles.tabTextActive]}>
            WiFi / Red
          </Text>
        </TouchableOpacity>
      </View>
      </Animated.View>

      {/* Bluetooth Panel */}
      {activeTab === 'bluetooth' && (
        <View>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={handleBtScan}
            disabled={scanning}
            activeOpacity={0.7}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <RefreshCcw size={18} color="#ffffff" />
            )}
            <Text style={styles.scanBtnText}>
              {scanning ? 'Buscando...' : 'Buscar Impresoras Bluetooth'}
            </Text>
          </TouchableOpacity>

          {devices.length > 0 && (
            <View style={styles.devicesSection}>
              <Text style={styles.sectionTitle}>Dispositivos encontrados</Text>
              {devices.map((d) => {
                const isCurrent = connectedDevice?.address === d.address;
                return (
                  <TouchableOpacity
                    key={d.address}
                    style={[styles.deviceCard, isCurrent && styles.deviceCardConnected]}
                    onPress={() => !isCurrent && handleConnect(d)}
                    disabled={isConnecting || isCurrent}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.deviceIcon, isCurrent && styles.deviceIconConnected]}>
                      <Smartphone size={18} color={isCurrent ? '#16a34a' : '#64748b'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName}>{d.name}</Text>
                      <Text style={styles.deviceAddress}>{d.address}</Text>
                    </View>
                    {isCurrent ? (
                      <CheckCircle size={20} color="#16a34a" />
                    ) : isConnecting ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* WiFi Panel */}
      {activeTab === 'wifi' && (
        <View style={styles.wifiPanel}>
          <Text style={styles.sectionTitle}>Conectar por IP</Text>

          <Text style={styles.inputLabel}>Nombre (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Impresora Oficina"
            placeholderTextColor="#94a3b8"
            value={wifiName}
            onChangeText={setWifiName}
          />

          <Text style={styles.inputLabel}>Dirección IP</Text>
          <TextInput
            style={styles.input}
            placeholder="192.168.1.100"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            value={wifiHost}
            onChangeText={setWifiHost}
          />

          <Text style={styles.inputLabel}>Puerto</Text>
          <TextInput
            style={styles.input}
            placeholder="9100"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={wifiPort}
            onChangeText={setWifiPort}
          />

          <TouchableOpacity
            style={[styles.scanBtn, { marginTop: 8 }]}
            onPress={handleWifiConnect}
            disabled={isConnecting}
            activeOpacity={0.7}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Wifi size={18} color="#ffffff" />
            )}
            <Text style={styles.scanBtnText}>
              {isConnecting ? 'Conectando...' : 'Conectar'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tips */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <AlertTriangle size={16} color="#d97706" />
          <Text style={styles.tipsTitle}>Consejos</Text>
        </View>
        <Text style={styles.tipText}>
          <Text style={{ fontWeight: '700' }}>Bluetooth:</Text> Empareja la impresora desde Ajustes de Android primero, luego escanea aquí.
        </Text>
        <Text style={styles.tipText}>
          <Text style={{ fontWeight: '700' }}>WiFi:</Text> La impresora y el celular deben estar en la misma red. Puerto estándar: 9100.
        </Text>
        <Text style={styles.tipText}>• Compatible con impresoras ESC/POS de 58mm y 80mm</Text>
        <Text style={styles.tipText}>• Modelos probados: PT-210, PT-220, MTP-II, Epson TM-T20</Text>
      </View>
      </Animated.View>
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 20 },

  // Status
  statusCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statusConnected: { backgroundColor: COLORS.card, borderColor: '#dcfce7' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: COLORS.brand },
  statusDevice: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  disconnectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.destructive },
  disconnectText: { fontSize: 12, fontWeight: '600', color: COLORS.headerText },
  testPrintBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primaryLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  testPrintText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Paper width
  widthChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: COLORS.border },
  widthChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  widthChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  widthChipTextActive: { color: COLORS.primary },

  // Saved
  savedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, gap: 12, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  savedIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  savedName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  savedHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.borderMedium,
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textTertiary },
  tabTextActive: { color: COLORS.primary },

  // Scan
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.headerText },

  // Devices
  devicesSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: COLORS.textTertiary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  deviceCardConnected: { borderColor: '#dcfce7', backgroundColor: COLORS.card },
  deviceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  deviceIconConnected: { backgroundColor: '#dcfce7' },
  deviceName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  deviceAddress: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },

  // WiFi
  wifiPanel: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: COLORS.borderMedium,
  },

  // Tips
  tipsCard: {
    backgroundColor: '#fffbeb', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#fde68a', marginTop: 4,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  tipText: { fontSize: 13, color: '#78350f', lineHeight: 20, marginBottom: 4 },

  // Unavailable
  unavailableCard: {
    alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  unavailableIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  unavailableTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginBottom: 8 },
  unavailableDesc: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 20 },
  stepsCard: { marginTop: 20, backgroundColor: COLORS.background, borderRadius: 12, padding: 14, width: '100%' },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  step: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 20 },
});
