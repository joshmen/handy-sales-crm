/**
 * Thermal Printer Service — Bluetooth + WiFi (TCP/IP)
 *
 * Wraps react-native-bluetooth-escpos-printer with graceful fallback.
 * In Expo Go, native modules are unavailable — all methods return
 * isAvailable: false. In EAS builds (APK), real connections are used.
 *
 * Supports:
 * - Bluetooth Classic (SPP) — PT-210, PT-220, MTP-II, etc.
 * - WiFi/Red (TCP/IP) — any ESC/POS network printer
 */
import Constants from 'expo-constants';
import { METODO_PAGO } from '@/types/cobro';

// ---------- Types ----------
export type ConnectionType = 'bluetooth' | 'wifi';

export interface PrinterDevice {
  name: string;
  address: string; // MAC for Bluetooth, IP:PORT for WiFi
  type: ConnectionType;
}

// ---------- Lazy native module ----------
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;
let NetPrinter: any = null;
let nativeAvailable = false;
let _loaded = false;

function loadNativeModules() {
  if (_loaded) return;
  _loaded = true;

  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('[Printer] Running in Expo Go — native modules not available');
    return;
  }

  try {
    const mod = require('react-native-bluetooth-escpos-printer');
    BluetoothManager = mod.BluetoothManager;
    BluetoothEscposPrinter = mod.BluetoothEscposPrinter;
    NetPrinter = mod.NetPrinter ?? null;
    nativeAvailable = true;
    console.log('[Printer] Native modules loaded (BT + Net)');
  } catch (e) {
    console.warn('[Printer] Native modules not available:', e);
  }
}

// ---------- Core API ----------

export function isNativeAvailable(): boolean {
  loadNativeModules();
  return nativeAvailable;
}

// ---------- Bluetooth ----------

export async function enableBluetooth(): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable) return false;
  try {
    const result = await BluetoothManager.enableBluetooth();
    return !!result;
  } catch {
    return false;
  }
}

export async function scanBluetoothDevices(): Promise<PrinterDevice[]> {
  loadNativeModules();
  if (!nativeAvailable) return [];
  try {
    const paired = await BluetoothManager.scanDevices();
    const parsed = typeof paired === 'string' ? JSON.parse(paired) : paired;
    return (parsed?.paired || parsed || [])
      .filter((d: any) => d.name && d.address)
      .map((d: any) => ({ name: d.name, address: d.address, type: 'bluetooth' as const }));
  } catch (e) {
    console.warn('[Printer] BT scan failed:', e);
    return [];
  }
}

export async function connectBluetooth(address: string): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable) return false;
  try {
    await BluetoothManager.connect(address);
    return true;
  } catch (e) {
    console.warn('[Printer] BT connect failed:', e);
    return false;
  }
}

// ---------- WiFi / Network ----------

export async function connectWifi(host: string, port: number): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !NetPrinter) return false;
  try {
    await NetPrinter.connectTcp(host, port);
    return true;
  } catch (e) {
    console.warn('[Printer] WiFi connect failed:', e);
    return false;
  }
}

// ---------- Common ----------

export async function disconnectDevice(): Promise<void> {
  loadNativeModules();
  if (!nativeAvailable) return;
  try {
    await BluetoothManager.disconnect?.();
  } catch {
    // ignore
  }
}

export async function connectDevice(device: PrinterDevice): Promise<boolean> {
  if (device.type === 'bluetooth') {
    return connectBluetooth(device.address);
  }
  // WiFi — address format: "IP:PORT"
  const [host, portStr] = device.address.split(':');
  const port = parseInt(portStr, 10) || 9100;
  return connectWifi(host, port);
}

// ---------- Receipt Printing ----------

export interface ReceiptData {
  companyName: string;
  clienteNombre: string;
  monto: number;
  metodoPago: number;
  referencia?: string;
  notas?: string;
  fecha: string;
  vendedorName: string;
}

export async function printReceipt(data: ReceiptData): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !BluetoothEscposPrinter) return false;

  try {
    const P = BluetoothEscposPrinter;
    const ALIGN = P.ALIGN || { LEFT: 0, CENTER: 1, RIGHT: 2 };

    // Header
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`${data.companyName}\n`, { widthtimes: 1, heigthtimes: 1 });
    await P.printText('RECIBO DE COBRO\n', {});
    await P.printText('================================\n', {});

    // Client
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(`Cliente: ${data.clienteNombre}\n`, {});

    // Date
    const fechaStr = new Date(data.fecha).toLocaleString('es-MX');
    await P.printText(`Fecha: ${fechaStr}\n`, {});

    // Separator
    await P.printText('--------------------------------\n', {});

    // Amount (big)
    await P.printerAlign(ALIGN.CENTER);
    const montoStr = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(data.monto);
    await P.printText(`${montoStr}\n`, { widthtimes: 2, heigthtimes: 2 });

    // Payment method
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(`\nMetodo: ${METODO_PAGO[data.metodoPago] || 'Otro'}\n`, {});

    if (data.referencia) {
      await P.printText(`Ref: ${data.referencia}\n`, {});
    }
    if (data.notas) {
      await P.printText(`Notas: ${data.notas}\n`, {});
    }

    // Footer
    await P.printText('--------------------------------\n', {});
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`Atendido por: ${data.vendedorName}\n`, {});
    await P.printText('Gracias por su pago\n', {});
    await P.printText('\n\n\n', {}); // feed paper

    return true;
  } catch (e) {
    console.error('[Printer] Print failed:', e);
    return false;
  }
}
