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
    if (__DEV__) console.log('[Printer] Running in Expo Go — native modules not available');
    return;
  }

  try {
    const mod = require('react-native-bluetooth-escpos-printer');
    BluetoothManager = mod.BluetoothManager;
    BluetoothEscposPrinter = mod.BluetoothEscposPrinter;
    NetPrinter = mod.NetPrinter ?? null;
    nativeAvailable = true;
    if (__DEV__) console.log('[Printer] Native modules loaded (BT + Net)');
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
  // Locale/TZ del tenant para formatear fecha y moneda en el ticket.
  // Si no se provee, cae a 'es-MX' / 'America/Mexico_City' / 'MXN' (legacy default).
  locale?: string;
  timezone?: string;
  currency?: string;
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

    // Date — usa TZ/locale del tenant si se proveyó (printerService no es React,
    // el caller debe pasar locale/timezone obtenidos de useTenantLocale)
    const printLocale = data.locale ?? 'es-MX';
    const printTz = data.timezone ?? 'America/Mexico_City';
    const printCurrency = data.currency ?? 'MXN';
    const fechaStr = new Intl.DateTimeFormat(printLocale, { timeZone: printTz, dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.fecha));
    await P.printText(`Fecha: ${fechaStr}\n`, {});

    // Items (if present — Venta Directa)
    if (data.items && data.items.length > 0) {
      await P.printText('--------------------------------\n', {});
      const fmt = (n: number) => new Intl.NumberFormat(printLocale, { style: 'currency', currency: printCurrency }).format(n);
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
    if (__DEV__) console.error('[Printer] Print failed:', e);
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
  // Locale/TZ del tenant (caller los provee de useTenantLocale).
  // Default fallback: 'es-MX' / 'America/Mexico_City' / 'MXN'.
  locale?: string;
  timezone?: string;
  currency?: string;
}

export async function printOrderTicket(data: OrderTicketData): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !BluetoothEscposPrinter) return false;

  try {
    const P = BluetoothEscposPrinter;
    const ALIGN = P.ALIGN || { LEFT: 0, CENTER: 1, RIGHT: 2 };
    const printLocale = data.locale ?? 'es-MX';
    const printTz = data.timezone ?? 'America/Mexico_City';
    const printCurrency = data.currency ?? 'MXN';
    const fmt = (n: number) =>
      new Intl.NumberFormat(printLocale, { style: 'currency', currency: printCurrency }).format(n);

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
    await P.printText(`Fecha: ${new Intl.DateTimeFormat(printLocale, { timeZone: printTz, dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.fecha))}\n`, {});
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
    if (__DEV__) console.error('[Printer] Order ticket print failed:', e);
    return false;
  }
}

// ---------- CFDI Ticket Printing (80mm) ----------

export interface CfdiImpuestoConcepto {
  tipo: string;          // TRASLADO | RETENCION
  impuesto: string;      // 001=ISR, 002=IVA, 003=IEPS
  tipoFactor: string;    // Tasa | Cuota | Exento
  tasaOCuota?: number | null;
  base: number;
  importe?: number | null;
}

export interface CfdiTicketData {
  // Emisor
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimenFiscal: string;
  emisorDireccion?: string;
  emisorCp: string;
  lugarExpedicion: string;          // Anexo 20: C.P. del domicilio fiscal emisor
  // Receptor
  receptorRfc: string;
  receptorNombre: string;
  receptorRegimenFiscal: string;
  receptorUsoCfdi: string;
  receptorCp: string;
  // Comprobante
  uuid: string;
  serie?: string;
  folio?: string;
  fecha: string;
  tipoComprobante: string;          // Anexo 20 4.0: I/E/T/N/P (Ingreso, Egreso, Traslado, Nómina, Pago)
  formaPago: string;
  metodoPago: string;
  tipoExportacion: string;          // Anexo 20 4.0 obligatorio. Default "01 - No aplica"
  moneda: string;                   // ISO 4217: MXN, USD, EUR
  tipoCambio: number;               // 1 si MXN, otro valor si moneda extranjera
  // Items (con claves SAT obligatorias en CFDI 4.0)
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
    descuento: number;
    claveProductoServ: string;      // ClaveProdServ SAT (8 dígitos)
    claveUnidad: string;            // ClaveUnidad SAT (ej: "H87", "E48")
    unidad?: string | null;         // Texto descriptivo (ej: "Pieza", "Litro")
    objetoImpuesto: string;         // "01"|"02"|"03"|"04"
    impuestos: CfdiImpuestoConcepto[];
  }>;
  subtotal: number;
  descuento: number;                // Descuento global (suma de descuentos de líneas)
  iva: number;                      // Total impuestos trasladados
  totalRetenciones: number;         // Total impuestos retenidos
  total: number;
  totalLetra: string;
  // Timbrado
  selloCfdi: string;
  selloSat: string;
  cadenaOriginal: string;
  noCertificadoEmisor: string;
  noCertificadoSat: string;
  fechaTimbrado: string;            // ISO string desde server; el template formatea con TZ
  fechaCertificacion?: string | null;
  rfcPac: string;                   // RfcProvCertif del TimbreFiscalDigital
  // Extras
  vendedorName: string;
  logoUri?: string;
}

/**
 * Mapea TipoComprobante (1 letra) a su nombre Anexo 20 4.0 para representación impresa.
 */
export function tipoComprobanteLabel(t: string): string {
  switch ((t || '').toUpperCase()) {
    case 'I': return 'Ingreso';
    case 'E': return 'Egreso';
    case 'T': return 'Traslado';
    case 'N': return 'Nómina';
    case 'P': return 'Pago';
    default:  return t || '-';
  }
}

/**
 * Mapea Impuesto (clave SAT 3 dígitos) a nombre legible.
 */
export function impuestoLabel(codigo: string): string {
  switch (codigo) {
    case '001': return 'ISR';
    case '002': return 'IVA';
    case '003': return 'IEPS';
    default:    return codigo;
  }
}

export async function printCfdiTicket(data: CfdiTicketData): Promise<boolean> {
  loadNativeModules();
  if (!nativeAvailable || !BluetoothEscposPrinter) return false;

  try {
    const P = BluetoothEscposPrinter;
    const ALIGN = P.ALIGN || { LEFT: 0, CENTER: 1, RIGHT: 2 };
    const W = 48; // 80mm thermal printer char width
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
    const pad = (l: string, r: string, w = W) =>
      l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;
    const sep = '================================================\n';
    const sepThin = '------------------------------------------------\n';

    // Logo
    if (data.logoUri) {
      try { await printLogo(data.logoUri); } catch { /* skip */ }
    }

    // Helper: wrap texto largo en líneas de W chars. Se usa para sellos y cadena
    // (Anexo 20 exige imprimirlos completos, sin truncar).
    const wrap = async (s: string) => {
      for (let i = 0; i < s.length; i += W) {
        await P.printText(`${s.slice(i, i + W)}\n`, {});
      }
    };

    // ── Emisor header ──
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`${data.emisorNombre}\n`, { widthtimes: 1, heigthtimes: 1 });
    await P.printText(`RFC: ${data.emisorRfc}\n`, {});
    await P.printText(`Regimen Fiscal: ${data.emisorRegimenFiscal}\n`, {});
    if (data.emisorDireccion) {
      await P.printText(`${data.emisorDireccion}\n`, {});
    }
    await P.printText(`C.P. ${data.emisorCp}\n`, {});
    await P.printText(`Lugar de Expedicion: ${data.lugarExpedicion}\n`, {});
    await P.printText('\n', {});

    // ── Title ──
    await P.printText('FACTURA ELECTRONICA\n', { widthtimes: 1, heigthtimes: 1 });
    await P.printText(sep, {});

    // ── Serie / Folio / Fecha / Tipo Comprobante / Pago / Moneda / Tipo Exportación ──
    await P.printerAlign(ALIGN.LEFT);
    if (data.serie || data.folio) {
      await P.printText(`Serie: ${data.serie ?? '-'}  Folio: ${data.folio ?? '-'}\n`, {});
    }
    await P.printText(`Fecha: ${data.fecha}\n`, {});
    await P.printText(`Tipo Comprobante: ${data.tipoComprobante} - ${tipoComprobanteLabel(data.tipoComprobante)}\n`, {});
    await P.printText(`Forma Pago: ${data.formaPago}\n`, {});
    await P.printText(`Metodo Pago: ${data.metodoPago}\n`, {});
    await P.printText(`Moneda: ${data.moneda}`, {});
    if (data.moneda && data.moneda !== 'MXN' && data.tipoCambio && data.tipoCambio !== 1) {
      await P.printText(`  Tipo Cambio: ${data.tipoCambio.toFixed(4)}\n`, {});
    } else {
      await P.printText('\n', {});
    }
    await P.printText(`Tipo Exportacion: ${data.tipoExportacion}\n`, {});
    await P.printText(sepThin, {});

    // ── Receptor ──
    await P.printText('RECEPTOR\n', { widthtimes: 0, heigthtimes: 0 });
    await P.printText(`RFC: ${data.receptorRfc}\n`, {});
    await P.printText(`Nombre: ${data.receptorNombre}\n`, {});
    await P.printText(`Regimen Fiscal: ${data.receptorRegimenFiscal}\n`, {});
    await P.printText(`Uso CFDI: ${data.receptorUsoCfdi}\n`, {});
    await P.printText(`C.P. ${data.receptorCp}\n`, {});
    await P.printText(sepThin, {});

    // ── Items con claves SAT ──
    await P.printText('CONCEPTOS\n', {});
    for (const item of data.items) {
      await P.printerAlign(ALIGN.LEFT);
      const left = `${item.descripcion} x${item.cantidad}`;
      const right = fmt(item.importe);
      if (left.length + right.length + 1 > W) {
        await P.printText(`${item.descripcion}\n`, {});
        await P.printText(pad(`  x${item.cantidad} @${fmt(item.precioUnitario)}`, right) + '\n', {});
      } else {
        await P.printText(pad(left, right) + '\n', {});
      }
      // Sub-línea con claves SAT requeridas por CFDI 4.0
      const unidadTxt = item.unidad ? ` (${item.unidad})` : '';
      await P.printText(
        `  Clave SAT: ${item.claveProductoServ} | Unidad: ${item.claveUnidad}${unidadTxt} | ObjImp: ${item.objetoImpuesto}\n`,
        {}
      );
      // Descuento por concepto (si > 0)
      if (item.descuento && item.descuento > 0) {
        await P.printText(pad('  Descuento:', `-${fmt(item.descuento)}`) + '\n', {});
      }
      // Impuestos por concepto (Anexo 20 4.0: desglose obligatorio si ObjetoImp=02)
      for (const imp of item.impuestos ?? []) {
        const tasa = imp.tasaOCuota != null
          ? (imp.tipoFactor === 'Tasa' ? `${(imp.tasaOCuota * 100).toFixed(2)}%` : imp.tasaOCuota.toFixed(6))
          : 'Exento';
        const importeImp = imp.importe != null ? fmt(imp.importe) : '-';
        await P.printText(
          `  ${imp.tipo === 'RETENCION' ? 'Ret.' : 'Tras.'} ${impuestoLabel(imp.impuesto)} ${tasa}: ${importeImp}\n`,
          {}
        );
      }
    }
    await P.printText(sepThin, {});

    // ── Totals ──
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(pad('SUBTOTAL:', fmt(data.subtotal)) + '\n', {});
    if (data.descuento && data.descuento > 0) {
      await P.printText(pad('DESCUENTO:', `-${fmt(data.descuento)}`) + '\n', {});
    }
    await P.printText(pad('IVA Trasladado:', fmt(data.iva)) + '\n', {});
    if (data.totalRetenciones && data.totalRetenciones > 0) {
      await P.printText(pad('Retenciones:', `-${fmt(data.totalRetenciones)}`) + '\n', {});
    }
    await P.printText(sep, {});
    await P.printerAlign(ALIGN.CENTER);
    await P.printText(`TOTAL: ${fmt(data.total)}\n`, { widthtimes: 2, heigthtimes: 2 });
    await P.printText('\n', {});

    // ── Total in words ──
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(`${data.totalLetra}\n`, {});
    await P.printText(sepThin, {});

    // ── Folio fiscal ──
    await P.printerAlign(ALIGN.CENTER);
    await P.printText('FOLIO FISCAL\n', {});
    await P.printText(`${data.uuid}\n`, {});
    await P.printText('\n', {});

    // ── Certificados + fecha timbrado con TZ CDMX ──
    await P.printerAlign(ALIGN.LEFT);
    await P.printText(`No. Cert. Emisor: ${data.noCertificadoEmisor}\n`, {});
    await P.printText(`No. Cert. SAT: ${data.noCertificadoSat}\n`, {});
    await P.printText(`RFC PAC: ${data.rfcPac}\n`, {});
    {
      let fechaFmt = data.fechaTimbrado;
      try {
        fechaFmt = new Date(data.fechaTimbrado).toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }) + ' (CDMX)';
      } catch { /* usar el raw si no parsea */ }
      await P.printText(`Fecha Timbrado: ${fechaFmt}\n`, {});
    }
    await P.printText(sepThin, {});

    // ── Sellos COMPLETOS (Anexo 20 4.0: no truncar) ──
    await P.printText('Sello Digital del CFDI:\n', {});
    await wrap(data.selloCfdi);
    await P.printText('\n', {});
    await P.printText('Sello Digital del SAT:\n', {});
    await wrap(data.selloSat);
    await P.printText(sepThin, {});

    // ── Cadena original del complemento de certificación ──
    await P.printText('Cadena Original del Complemento de\n', {});
    await P.printText('Certificacion Digital del SAT:\n', {});
    await wrap(data.cadenaOriginal);
    await P.printText(sepThin, {});

    // ── Leyenda ──
    await P.printerAlign(ALIGN.CENTER);
    await P.printText('Este documento es una\n', {});
    await P.printText('representacion impresa\n', {});
    await P.printText('de un CFDI\n', {});
    await P.printText('\n', {});

    // ── QR SAT verification ──
    const qrUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${data.uuid}&re=${data.emisorRfc}&rr=${data.receptorRfc}&tt=${data.total.toFixed(6)}&fe=${data.selloCfdi.slice(-8)}`;
    await P.printQRCode(qrUrl, 8, 1);
    await P.printText('\n', {});

    // ── Vendor ──
    await P.printText(`Atendido por: ${data.vendedorName}\n`, {});

    await P.printText('\n\n\n', {}); // feed paper

    return true;
  } catch (e) {
    if (__DEV__) console.error('[Printer] CFDI ticket print failed:', e);
    return false;
  }
}
