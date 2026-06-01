import * as SecureStore from 'expo-secure-store';

/**
 * Wrapper sobre expo-secure-store con try/catch defensivo.
 *
 * Razón (Reliability Sprint Fase 1): SecureStore puede rechazar reads en
 * escenarios borde — OEM Android low-memory durante app suspend, device sin
 * lock screen configurado (Android requiere keyguard para Keystore en algunos
 * OEMs), o race con app kill mid-write. Sin try/catch el reject bubbleaba al
 * interceptor del API client y el siguiente request salía sin Authorization
 * header → 401 falso → banner "sesión expirada" pese a que el token estaba
 * intacto en disk.
 *
 * Política: ante error, retornar `null` (read) o swallow + warn (write).
 * El cold boot siguiente intenta de nuevo via restoreSession.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      if (__DEV__) console.warn(`[secureStorage] read failed for ${key}:`, err);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      if (__DEV__) console.warn(`[secureStorage] write failed for ${key}:`, err);
      // Re-throw — callers que necesitan saber que el write falló (login)
      // deben poder reaccionar. Solo el READ es silent-null.
      throw err;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      if (__DEV__) console.warn(`[secureStorage] delete failed for ${key}:`, err);
      // Swallow: si el delete falla, el next write o el explicit clear lo cubre.
    }
  },

  async clear(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.remove(k)));
  },
};
