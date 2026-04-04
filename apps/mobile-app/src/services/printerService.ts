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
import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { File, Directory, Paths } from 'expo-file-system';
import { METODO_PAGO } from '@/types/cobro';
import { requestBluetoothWithDialog } from '@/utils/permissions';

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
    if (__DEV__) console.warn('[Printer] Native modules not available:', e);
  }
}

// ---------- Core API ----------

export function isNativeAvailable(): boolean {
  loadNativeModules();
  return nativeAvailable;
}

// ---------- Bluetooth ----------

async function requestBluetoothPermissions(): Promise<boolean> {
  // Pre-permission dialog handles platform checks, already-granted checks,
  // and shows an explanatory Alert before the system prompt.
  return requestBluetoothWithDialog();
}

export async function enableBluetooth(): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable) return false;

  // Request runtime permissions first
  const permsOk = await requestBluetoothPermissions();
  if (!permsOk) return false;

  try {
    const result = await BluetoothManager.enableBluetooth();
    return !!result;
  } catch (e) {
    if (__DEV__) console.warn('[Printer] enableBluetooth failed:', e);
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
    if (__DEV__) console.warn('[Printer] BT scan failed:', e);
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
    if (__DEV__) console.warn('[Printer] BT connect failed:', e);
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
    if (__DEV__) console.warn('[Printer] WiFi connect failed:', e);
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

// ---------- Logo Printing ----------

/** Max width in pixels for thermal printer logos (80mm paper). */
const LOGO_MAX_WIDTH = 384;

/** Cache directory for downloaded logo images (auto-created on first use). */
const logoCacheDir = new Directory(Paths.cache, 'printer-logos');

/**
 * Downloads a remote image (or reads a local file) and returns its base64 string.
 * The result is cached locally so subsequent prints don't re-download.
 */
async function getImageBase64(imageUri: string): Promise<string | null> {
  try {
    // If the URI is already a local file, read it directly
    if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
      const localPath = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
      const localFile = new File(localPath);
      if (!localFile.exists) {
        if (__DEV__) console.warn('[Printer] Local logo file not found:', localPath);
        return null;
      }
      return await localFile.base64();
    }

    // Remote URL — download to cache first
    if (!logoCacheDir.exists) {
      logoCacheDir.create();
    }

    // Create a deterministic filename from the URL
    const hash = imageUri.replace(/[^a-zA-Z0-9]/g, '_').slice(-80);
    const ext = imageUri.match(/\.(png|jpg|jpeg|bmp|gif)(\?.*)?$/i)?.[1] || 'png';
    const cachedFile = new File(logoCacheDir, `${hash}.${ext}`);

    // Download directly to the deterministic cached path if not already cached
    if (!cachedFile.exists) {
      await File.downloadFileAsync(imageUri, cachedFile, {
        idempotent: true,
      });
    }

    if (!cachedFile.exists) {
      if (__DEV__) console.warn('[Printer] Logo download did not produce cached file');
      return null;
    }

    return await cachedFile.base64();
  } catch (e) {
    if (__DEV__) console.warn('[Printer] Failed to get image base64:', e);
    return null;
  }
}

/**
 * Prints a logo image on the thermal printer.
 * Downloads the image, converts to base64, and sends it via printPic.
 * The library handles monochrome conversion internally.
 *
 * @param imageUri - URL (http/https) or local file path of the logo
 * @returns true if printed successfully, false otherwise
 */
export async function printLogo(imageUri: string): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !BluetoothEscposPrinter) return false;

  try {
    const base64 = await getImageBase64(imageUri);
    if (!base64) {
      if (__DEV__) console.warn('[Printer] No base64 data for logo, skipping');
      return false;
    }

    const P = BluetoothEscposPrinter;
    const ALIGN = P.ALIGN || { LEFT: 0, CENTER: 1, RIGHT: 2 };

    // Center the logo
    await P.printerAlign(ALIGN.CENTER);

    // printPic sends the base64 image to the printer.
    // width = max paper width; the library scales/crops as needed.
    // left = 0 because we already set alignment to center.
    await P.printPic(base64, { width: LOGO_MAX_WIDTH, left: 0 });

    // Small line feed after logo for spacing
    await P.printText('\n', {});

    return true;
  } catch (e) {
    if (__DEV__) console.warn('[Printer] Logo print failed (non-fatal):', e);
    return false;
  }
}

// ---------- Receipt Printing ----------

export interface ReceiptData {
  companyName: string;
  empresa?: EmpresaHeader;
  clienteNombre: string;
  monto: number;
  metodoPago: number;
  referencia?: string;
  notas?: string;
  fecha: string;
  vendedorName: string;
  logoUri?: string;
  isVentaDirecta?: boolean;
  items?: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
  subtotal?: number;
  descuento?: number;
  impuesto?: number;
  facturaUuid?: string;
  facturaUrl?: string;
  paperWidth?: 58 | 80;
}

export async function printReceipt(data: ReceiptData): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !BluetoothEscposPrinter) return false;

  try {
    const P = BluetoothEscposPrinter;
    const ALIGN = P.ALIGN || { LEFT: 0, CENTER: 1, RIGHT: 2 };

    // Logo (optional — failure is non-fatal, text header still prints)
    if (data.logoUri) {
      try {
        await printLogo(data.logoUri);
      } catch (e) {
        if (__DEV__) console.warn('[Printer] Logo print skipped:', e);
      }
    }

    // Header — Company info
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`${data.companyName}\n`, { widthtimes: 1, heigthtimes: 1 });
    if (data.empresa?.rfc) {
      await P.printText(`RFC: ${data.empresa.rfc}\n`, {});
    }
    if (data.empresa?.direccion) {
      await P.printText(`${data.empresa.direccion}\n`, {});
      const cityLine = [data.empresa.ciudad, data.empresa.estado, data.empresa.codigoPostal].filter(Boolean).join(', ');
      if (cityLine) await P.printText(`${cityLine}\n`, {});
    }
    if (data.empresa?.telefono) {
      await P.printText(`Tel: ${data.empresa.telefono}\n`, {});
    }
    const docTitle = data.isVentaDirecta ? 'NOTA DE VENTA' : 'RECIBO DE COBRO';
    await P.printText(`${docTitle}\n`, {});
    await P.printText('================================\n', {});

    // Client
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(`Cliente: ${data.clienteNombre}\n`, {});

    // Date
    const fechaStr = new Date(data.fecha).toLocaleString('es-MX');
    await P.printText(`Fecha: ${fechaStr}\n`, {});

    // Items (if present — Venta Directa)
    if (data.items && data.items.length > 0) {
      await P.printText('--------------------------------\n', {});
      const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
      const W = 32; // thermal printer char width
      for (const item of data.items) {
        await P.printerAlign(ALIGN.LEFT);
        const left = `${item.nombre} x${item.cantidad}`;
        const right = fmt(item.subtotal);
        const pad = Math.max(1, W - left.length - right.length);
        await P.printText(`${left}${' '.repeat(pad)}${right}\n`, {});
      }
      await P.printerAlign(ALIGN.LEFT);
      await P.printText('--------------------------------\n', {});
      if (data.subtotal != null) {
        const subRight = fmt(data.subtotal);
        await P.printText(`SUBTOTAL:${' '.repeat(Math.max(1, W - 9 - subRight.length))}${subRight}\n`, {});
      }
      if (data.descuento && data.descuento > 0) {
        const descRight = `-${fmt(data.descuento)}`;
        await P.printText(`DESCUENTO:${' '.repeat(Math.max(1, W - 10 - descRight.length))}${descRight}\n`, {});
      }
      if (data.impuesto != null) {
        const ivaRight = fmt(data.impuesto);
        await P.printText(`IVA 16%:${' '.repeat(Math.max(1, W - 8 - ivaRight.length))}${ivaRight}\n`, {});
      }
    } else {
      await P.printText('--------------------------------\n', {});
    }

    // Amount (big)
    await P.printerAlign(ALIGN.CENTER);
    const montoStr = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(data.monto);
    await P.printText(`TOTAL\n`, {});
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
    const totalArticulos = data.items?.reduce((s, i) => s + i.cantidad, 0) ?? 1;
    await P.printText(`Total articulos: ${totalArticulos}\n`, {});
    await P.printText(data.isVentaDirecta ? 'Gracias por su compra\n' : 'Gracias por su pago\n', {});

    // QR code for invoice download (if available)
    if (data.facturaUrl) {
      await P.printText('--------------------------------\n', {});
      await P.printerAlign(ALIGN.CENTER);
      await P.printText('Factura disponible en:\n', {});
      const qrSize = (data.paperWidth ?? 58) >= 80 ? 8 : 6;
      await P.printQRCode(data.facturaUrl, qrSize, 1);
      await P.printText('\nEscanee para descargar\n', {});
    }

    await P.printText('\n\n\n', {}); // feed paper

    return true;
  } catch (e) {
    console.error('[Printer] Print failed:', e);
    return false;
  }
}

// ---------- Order Ticket Printing ----------

export interface EmpresaHeader {
  rfc?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  telefono?: string | null;
}

export interface OrderTicketData {
  companyName: string;
  empresa?: EmpresaHeader;
  clienteNombre: string;
  numeroPedido: string;
  fecha: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
  vendedorName: string;
  tipoVenta: 'Preventa' | 'Venta Directa';
  logoUri?: string;
  facturaUrl?: string;
  paperWidth?: 58 | 80;
}

export async function printOrderTicket(data: OrderTicketData): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !BluetoothEscposPrinter) return false;

  try {
    const P = BluetoothEscposPrinter;
    const ALIGN = P.ALIGN || { LEFT: 0, CENTER: 1, RIGHT: 2 };
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    // Logo
    if (data.logoUri) {
      try { await printLogo(data.logoUri); } catch { /* skip */ }
    }

    // Header — Company info
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`${data.companyName}\n`, { widthtimes: 1, heigthtimes: 1 });
    if (data.empresa?.rfc) {
      await P.printText(`RFC: ${data.empresa.rfc}\n`, {});
    }
    if (data.empresa?.direccion) {
      await P.printText(`${data.empresa.direccion}\n`, {});
      const cityLine = [data.empresa.ciudad, data.empresa.estado, data.empresa.codigoPostal].filter(Boolean).join(', ');
      if (cityLine) await P.printText(`${cityLine}\n`, {});
    }
    if (data.empresa?.telefono) {
      await P.printText(`Tel: ${data.empresa.telefono}\n`, {});
    }
    await P.printText(`TICKET DE ${data.tipoVenta === 'Preventa' ? 'PEDIDO' : 'VENTA'}\n`, {});
    await P.printText('================================\n', {});

    // Order info
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(`Pedido: ${data.numeroPedido}\n`, {});
    await P.printText(`Cliente: ${data.clienteNombre}\n`, {});
    await P.printText(`Fecha: ${new Date(data.fecha).toLocaleString('es-MX')}\n`, {});
    await P.printText(`Tipo: ${data.tipoVenta}\n`, {});
    await P.printText('--------------------------------\n', {});

    // Items — single line: "Nombre x3        $55.50"
    const W = 32; // thermal printer char width
    for (const item of data.items) {
      await P.printerAlign(ALIGN.LEFT);
      const left = `${item.nombre} x${item.cantidad}`;
      const right = fmt(item.subtotal);
      const pad = Math.max(1, W - left.length - right.length);
      await P.printText(`${left}${' '.repeat(pad)}${right}\n`, {});
    }

    // Totals — aligned with spaces
    await P.printerAlign(ALIGN.LEFT);
    await P.printText('--------------------------------\n', {});

    const printRow = async (label: string, value: string) => {
      const pad = Math.max(1, W - label.length - value.length);
      await P.printText(`${label}${' '.repeat(pad)}${value}\n`, {});
    };

    await printRow('Subtotal:', fmt(data.subtotal));
    if (data.descuento > 0) await printRow('Descuento:', `-${fmt(data.descuento)}`);
    await printRow('IVA 16%:', fmt(data.impuesto));

    await P.printText('================================\n', {});
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`TOTAL: ${fmt(data.total)}\n`, { widthtimes: 2, heigthtimes: 2 });

    // Footer
    await P.printText('\n', {});
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`Atendido por: ${data.vendedorName}\n`, {});
    await P.printText('Gracias por su compra\n', {});

    // QR code for invoice download (if available)
    if (data.facturaUrl) {
      await P.printText('--------------------------------\n', {});
      await P.printerAlign(ALIGN.CENTER);
      await P.printText('Factura disponible en:\n', {});
      const qrSize = (data.paperWidth ?? 58) >= 80 ? 8 : 6;
      await P.printQRCode(data.facturaUrl, qrSize, 1);
      await P.printText('\nEscanee para descargar\n', {});
    }

    await P.printText('\n\n\n', {}); // feed paper

    return true;
  } catch (e) {
    console.error('[Printer] Order ticket print failed:', e);
    return false;
  }
}
