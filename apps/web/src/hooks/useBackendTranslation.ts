import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

/**
 * Dynamic patterns for zone errors with dynamic variables.
 * Keep minimal — prefer exact matches in backendMessages JSON.
 */
const DYNAMIC_PATTERNS: Array<[RegExp, string]> = [
  [/^No se puede eliminar la zona porque tiene (\d+) cliente\(s\) asociado\(s\).*$/, 'Cannot delete zone because it has $1 associated client(s). Reassign or remove the clients first.'],
  [/^No se puede desactivar la zona porque tiene (\d+) cliente\(s\) activo\(s\).*$/, 'Cannot deactivate zone because it has $1 active client(s). Deactivate or reassign the clients first.'],
  [/^No se pueden desactivar las siguientes zonas porque tienen clientes activos: (.+)$/, 'Cannot deactivate the following zones because they have active clients: $1'],
  [/^La zona '(.+)' se traslapa con la zona '(.+)' \(distancia: (.+) km, solapamiento: (.+) km\)$/, "Zone '$1' overlaps with zone '$2' (distance: $3 km, overlap: $4 km)"],
  [/^La latitud debe estar entre .+ Valor recibido: (.+)$/, 'Latitude must be between 14.0 and 33.0 (Mexico limits). Received: $1'],
  [/^La longitud debe estar entre .+ Valor recibido: (.+)$/, 'Longitude must be between -118.0 and -86.0 (Mexico limits). Received: $1'],
  [/^Ya existe una zona con nombre '(.+)'$/, "A zone with name '$1' already exists"],
  [/^Zona '(.+)' no encontrada\. Zonas disponibles: (.+)$/, "Zone '$1' not found. Available zones: $2"],
];

/**
 * Bidirectional reverse map: English value → Spanish key.
 * Used when the user is in Spanish but the DB has English messages
 * (saved when the tenant was temporarily in English).
 */
const EN_TO_ES: Record<string, string> = {
  'No goals to auto-renew': 'Sin metas para auto-renovar',
  'No new routes to generate (already exist or no assigned clients)': 'Sin rutas nuevas por generar (ya existen o sin clientes asignados)',
  'No new clients': 'Sin clientes nuevos',
  'No products with low stock': 'Sin productos con stock bajo',
  'No overdue balances': 'Sin saldos vencidos',
  'All clients have recent visits': 'Todos los clientes tienen visitas recientes',
  'All clients are within their normal order cycle': 'Todos los clientes están dentro de su ciclo normal de pedido',
  'No active vendors': 'Sin vendedores activos',
  'No goals configured for the current period': 'Sin metas configuradas para el período actual',
  'No new payments since last execution': 'Sin cobros nuevos desde la última ejecución',
  'No products with zero inventory': 'Sin productos con inventario en cero',
  'Goals auto-renewed': 'Metas auto-renovadas',
  'Payment registered successfully': 'Cobro registrado exitosamente',
  'Summary sent: 0 sales, 0 collections, 0 visits': 'Resumen enviado: 0 ventas, 0 cobros, 0 visitas',
  'An error occurred while executing the automation.': 'Error al ejecutar la automatización.',
};

/**
 * Hook that provides bidirectional backend message translation.
 * Translates Spanish→English when locale is "en", and English→Spanish when locale is "es".
 */
export function useBackendTranslation() {
  const tEn = useTranslations('backendMessages');

  // Detect current language
  const lang = useMemo(() => {
    try {
      const s = JSON.parse(localStorage.getItem('company_settings') || '{}');
      return s.language || 'es';
    } catch { return 'es'; }
  }, []);

  const tApi = useCallback(
    (message: string | undefined | null): string => {
      if (!message) return '';

      // 1. Try exact match in backendMessages dictionary (es key → current locale value)
      try {
        const translated = tEn(message);
        if (!translated.startsWith('backendMessages.')) {
          return translated;
        }
      } catch { /* key not found */ }

      // 2. Reverse lookup: if current locale is "es" and message is in English
      if (lang === 'es' && EN_TO_ES[message]) {
        return EN_TO_ES[message];
      }

      // 3. Dynamic patterns (zone errors)
      for (const [pattern, replacement] of DYNAMIC_PATTERNS) {
        if (pattern.test(message)) {
          return message.replace(pattern, replacement);
        }
      }

      // 4. Return original
      return message;
    },
    [tEn, lang]
  );

  return { tApi };
}
