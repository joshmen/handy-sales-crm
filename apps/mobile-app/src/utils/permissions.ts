/**
 * Pre-Permission Dialogs
 *
 * Custom Alert dialogs shown BEFORE the system permission request,
 * explaining WHY the app needs each permission. Google-recommended
 * best practice that increases acceptance rates from ~40% to ~80%+.
 *
 * Each helper checks if the permission is already granted — if so,
 * it skips the dialog entirely and returns true.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';
import { usePermissionDialogStore } from '@/stores/permissionDialogStore';

// ---------------------------------------------------------------------------
// Core dialog utility — uses custom ConfirmModal via global store
// ---------------------------------------------------------------------------

/**
 * Shows a custom ConfirmModal explaining why a permission is needed.
 * Returns `true` if the user taps "Permitir", `false` for "Ahora no".
 */
export function showPrePermissionDialog(
  title: string,
  message: string,
): Promise<boolean> {
  return usePermissionDialogStore.getState().show(title, message);
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/**
 * Request foreground location with a pre-permission dialog.
 *
 * Returns the expo-location PermissionStatus so callers can react to the
 * actual grant result (not just the dialog tap).
 */
export async function requestLocationWithDialog(): Promise<boolean> {
  // Check if already granted — skip dialog
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;

  // Show pre-permission dialog
  const accepted = await showPrePermissionDialog(
    'Permiso de ubicación',
    'Handy Suites necesita tu ubicación para:\n\n' +
      '\u2022 Optimizar tu ruta de visitas\n' +
      '\u2022 Registrar check-in en clientes\n' +
      '\u2022 Mostrar clientes cercanos en el mapa\n\n' +
      'Tu ubicación nunca se comparte con terceros.',
  );

  if (!accepted) return false;

  // Now trigger the real system prompt
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// ---------------------------------------------------------------------------
// Bluetooth (Android only)
// ---------------------------------------------------------------------------

/**
 * Request Bluetooth permissions with a pre-permission dialog.
 *
 * On iOS this is a no-op (returns true) — iOS handles BT permissions
 * differently via Info.plist and automatic prompts.
 */
export async function requestBluetoothWithDialog(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  // Android 12+ (API 31): BLUETOOTH_CONNECT + BLUETOOTH_SCAN
  if (Platform.Version >= 31) {
    const connectStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
    const scanStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    );

    if (connectStatus && scanStatus) return true;

    // Show pre-permission dialog
    const accepted = await showPrePermissionDialog(
      'Dispositivos cercanos',
      'Handy Suites necesita acceso a dispositivos cercanos para:\n\n' +
        '\u2022 Conectar con tu impresora térmica\n' +
        '\u2022 Imprimir recibos de cobro\n\n' +
        'Solo se usa para la impresora, no rastreamos dispositivos.',
    );

    if (!accepted) return false;

    // Now trigger the real system prompt
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);

      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch (e) {
      console.warn('[Permissions] BT permission request failed:', e);
      return false;
    }
  }

  // Android <12 (API <=30): BT scanning needs ACCESS_FINE_LOCATION
  const locGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (locGranted) return true;

  // Show location dialog (BT on older Android needs location)
  const accepted = await showPrePermissionDialog(
    'Permiso de ubicación',
    'Para conectar con la impresora Bluetooth, Android requiere el permiso de ubicación.\n\n' +
      'Solo se usa para detectar la impresora, no rastreamos tu ubicación.',
  );

  if (!accepted) return false;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
