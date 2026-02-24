import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';

type Tab = 'bluetooth' | 'wifi';

export default function ImpresoraScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    connectedDevice,
    savedDevice,
    isConnecting,
    setConnectedDevice,
    setSavedDevice,
    setConnecting,
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
        Alert.alert('Bluetooth', 'No se pudo activar el Bluetooth. Actívalo manualmente.');
        return;
      }
      const found = await scanBluetoothDevices();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert('Sin dispositivos', 'No se encontraron impresoras emparejadas.\nEmpareja tu impresora desde Ajustes de Android primero.');
      }
    } catch {
      Alert.alert('Error', 'Error al escanear dispositivos');
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
        Alert.alert('Conectada', `"${device.name}" conectada exitosamente`);
      } else {
        Alert.alert('Error', 'No se pudo conectar');
      }
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setConnecting(false);
    }
  }, []);

  // --- WiFi connect ---
  const handleWifiConnect = useCallback(() => {
    const host = wifiHost.trim();
    if (!host) {
      Alert.alert('Error', 'Ingresa la dirección IP de la impresora');
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
      });
      if (ok) {
        Alert.alert('Listo', 'Impresión de prueba enviada');
      } else {
        Alert.alert('Error', 'No se pudo imprimir. Verifica la conexión.');
      }
    } catch {
      Alert.alert('Error', 'Error al imprimir');
    } finally {
      setPrinting(false);
    }
  }, [user]);

  // --- Not available (Expo Go) ---
  if (!available) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.pageTitle}>Impresora</Text>
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
      </ScrollView>
    );
  }

  // --- Native available (APK) ---
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Impresora</Text>

      {/* Connection Status */}
      {connectedDevice && (
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
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Text style={styles.disconnectText}>Desconectar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.testPrintBtn}
            onPress={handleTestPrint}
            disabled={printing}
            activeOpacity={0.7}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Zap size={18} color="#2563eb" />
            )}
            <Text style={styles.testPrintText}>
              {printing ? 'Imprimiendo...' : 'Imprimir prueba'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Saved device quick-connect */}
      {!connectedDevice && savedDevice && (
        <TouchableOpacity
          style={styles.savedCard}
          onPress={() => handleConnect(savedDevice)}
          disabled={isConnecting}
          activeOpacity={0.7}
        >
          <View style={styles.savedIcon}>
            <Printer size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.savedName}>{savedDevice.name}</Text>
            <Text style={styles.savedHint}>
              Última usada ({savedDevice.type === 'wifi' ? 'WiFi' : 'Bluetooth'}) — toca para reconectar
            </Text>
          </View>
          {isConnecting ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Bluetooth size={18} color="#2563eb" />
          )}
        </TouchableOpacity>
      )}

      {/* Connection Type Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bluetooth' && styles.tabActive]}
          onPress={() => setActiveTab('bluetooth')}
        >
          <Bluetooth size={16} color={activeTab === 'bluetooth' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'bluetooth' && styles.tabTextActive]}>
            Bluetooth
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wifi' && styles.tabActive]}
          onPress={() => setActiveTab('wifi')}
        >
          <Wifi size={16} color={activeTab === 'wifi' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'wifi' && styles.tabTextActive]}>
            WiFi / Red
          </Text>
        </TouchableOpacity>
      </View>

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
                      <ActivityIndicator size="small" color="#2563eb" />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 20 },

  // Status
  statusCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  statusConnected: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#16a34a' },
  statusDevice: { fontSize: 13, color: '#64748b', marginTop: 2 },
  disconnectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fee2e2' },
  disconnectText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  testPrintBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#eff6ff',
    borderWidth: 1, borderColor: '#dbeafe',
  },
  testPrintText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },

  // Saved
  savedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff',
    borderRadius: 14, padding: 14, gap: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#dbeafe',
  },
  savedIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  savedName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  savedHint: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#ffffff',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  tabActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#2563eb' },

  // Scan
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, marginBottom: 16,
  },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // Devices
  devicesSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  deviceCardConnected: { borderColor: '#dcfce7', backgroundColor: '#f0fdf4' },
  deviceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  deviceIconConnected: { backgroundColor: '#dcfce7' },
  deviceName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  deviceAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  // WiFi
  wifiPanel: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0',
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
    alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16,
    padding: 24, borderWidth: 1, borderColor: '#f1f5f9',
  },
  unavailableIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  unavailableTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginBottom: 8 },
  unavailableDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  stepsCard: { marginTop: 20, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, width: '100%' },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  step: { fontSize: 12, color: '#64748b', lineHeight: 20 },
});
