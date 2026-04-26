import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Genera (o lee la existente) la clave AES-256 que SQLCipher usa como passphrase
 * para encriptar la base WatermelonDB local.
 *
 * Almacenamiento:
 *  - Android: Keystore (TEE/StrongBox cuando disponible)
 *  - iOS: Keychain (kSecClassKey)
 *
 * La clave NUNCA se loggea ni se envía al backend. Si el dispositivo se rootea
 * o el usuario reinstala la app, expo-secure-store decide qué hacer (Keystore
 * sobrevive update, no sobrevive uninstall en Android salvo caso de backup).
 *
 * Para activar SQLCipher en producción se necesita ADEMÁS:
 *   1. EAS dev/preview build (no funciona en Expo Go — LokiJS es JS puro).
 *   2. Configurar el adapter SQLite con `passphrase: await getOrCreateDbEncryptionKey()`.
 *   3. Migración one-shot de DB plaintext → encrypted en primer launch post-update.
 */
const DB_KEY_NAME = 'handysuites_db_encryption_key_v1';

let cachedKey: string | null = null;

export async function getOrCreateDbEncryptionKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  try {
    const existing = await SecureStore.getItemAsync(DB_KEY_NAME);
    if (existing && existing.length === 64) {
      cachedKey = existing;
      return existing;
    }
  } catch (err) {
    // SecureStore puede fallar en Expo Go en algunos emuladores; caemos al fallback.
    console.warn('[dbEncryptionKey] SecureStore.getItem falló, generando temporal:', err);
  }

  // Generar 32 bytes (256 bits) en hex (64 chars).
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  try {
    await SecureStore.setItemAsync(DB_KEY_NAME, hex, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (err) {
    console.warn('[dbEncryptionKey] SecureStore.setItem falló, usando clave en memoria:', err);
  }

  cachedKey = hex;
  return hex;
}

/**
 * Borra la clave del Keychain. Solo usar en logout completo + uninstall flow.
 * Si se borra mientras la DB existe, la DB queda inaccesible.
 */
export async function clearDbEncryptionKey(): Promise<void> {
  cachedKey = null;
  try {
    await SecureStore.deleteItemAsync(DB_KEY_NAME);
  } catch (err) {
    console.warn('[dbEncryptionKey] SecureStore.deleteItem falló:', err);
  }
}
