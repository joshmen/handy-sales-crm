import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Bidirectional dynamic patterns for messages with variables.
 * Each entry has regex for both languages + replacement templates.
 * Works with any numeric values — fully scalable.
 */
const PATTERNS: Array<{ es: RegExp; en: RegExp; toEs: string; toEn: string }> = [
  // Zone errors
  { es: /^No se puede eliminar la zona porque tiene (\d+) cliente\(s\) asociado\(s\).*$/, en: /^Cannot delete zone because it has (\d+) associated client\(s\).*$/, toEs: 'No se puede eliminar la zona porque tiene $1 cliente(s) asociado(s). Primero reasigne o elimine los clientes.', toEn: 'Cannot delete zone because it has $1 associated client(s). Reassign or remove the clients first.' },
  { es: /^No se puede desactivar la zona porque tiene (\d+) cliente\(s\) activo\(s\).*$/, en: /^Cannot deactivate zone because it has (\d+) active client\(s\).*$/, toEs: 'No se puede desactivar la zona porque tiene $1 cliente(s) activo(s).', toEn: 'Cannot deactivate zone because it has $1 active client(s).' },
  { es: /^La zona '(.+)' se traslapa con la zona '(.+)' \(distancia: (.+) km, solapamiento: (.+) km\)$/, en: /^Zone '(.+)' overlaps with zone '(.+)' \(distance: (.+) km, overlap: (.+) km\)$/, toEs: "La zona '$1' se traslapa con la zona '$2' (distancia: $3 km, solapamiento: $4 km)", toEn: "Zone '$1' overlaps with zone '$2' (distance: $3 km, overlap: $4 km)" },

  // Automation results
  { es: /^Clientes inactivos: (\d+), visitas agendadas: (\d+), notificaciones: (\d+)$/, en: /^Inactive clients: (\d+), visits scheduled: (\d+), notifications: (\d+)$/, toEs: 'Clientes inactivos: $1, visitas agendadas: $2, notificaciones: $3', toEn: 'Inactive clients: $1, visits scheduled: $2, notifications: $3' },
  { es: /^Resumen enviado: (\d+) ventas, (\d+) cobros, (\d+) visitas$/, en: /^Summary sent: (\d+) sales, (\d+) collections, (\d+) visits$/, toEs: 'Resumen enviado: $1 ventas, $2 cobros, $3 visitas', toEn: 'Summary sent: $1 sales, $2 collections, $3 visits' },
  { es: /^Alerta enviada: (\d+) productos con stock bajo$/, en: /^Alert sent: (\d+) products? with low stock$/, toEs: 'Alerta enviada: $1 productos con stock bajo', toEn: 'Alert sent: $1 product(s) with low stock' },
  { es: /^Alerta enviada: (\d+) productos sin inventario$/, en: /^Alert sent: (\d+) products? with zero inventory$/, toEs: 'Alerta enviada: $1 productos sin inventario', toEn: 'Alert sent: $1 product(s) with zero inventory' },
  { es: /^Bienvenida enviada para (\d+) clientes nuevos \((\d+) notificaciones\)$/, en: /^Welcome sent for (\d+) new clients \((\d+) notifications\)$/, toEs: 'Bienvenida enviada para $1 clientes nuevos ($2 notificaciones)', toEn: 'Welcome sent for $1 new clients ($2 notifications)' },
  { es: /^Recordatorios enviados: (\d+) notificaciones sobre (\d+) saldos vencidos$/, en: /^Reminders sent: (\d+) notifications about (\d+) overdue balances$/, toEs: 'Recordatorios enviados: $1 notificaciones sobre $2 saldos vencidos', toEn: 'Reminders sent: $1 notifications about $2 overdue balances' },
  { es: /^Reorden: (\d+) clientes con ciclo superado \((\d+) notificaciones\)$/, en: /^Reorder: (\d+) clients? with overdue cycle \((\d+) notifications\)$/, toEs: 'Reorden: $1 clientes con ciclo superado ($2 notificaciones)', toEn: 'Reorder: $1 client(s) with overdue cycle ($2 notifications)' },
  { es: /^(\d+) rutas semanales generadas$/, en: /^(\d+) weekly routes generated$/, toEs: '$1 rutas semanales generadas', toEn: '$1 weekly routes generated' },
  { es: /^(\d+) meta(?:s)? renovada(?:s)?$/, en: /^(\d+) goal\(?s?\)? renewed$/, toEs: '$1 meta(s) renovada(s)', toEn: '$1 goal(s) renewed' },
  { es: /^Todos los vendedores están al ≥(\d+)% de su meta$/, en: /^All vendors are at ≥(\d+)% of their goal$/, toEs: 'Todos los vendedores están al ≥$1% de su meta', toEn: 'All vendors are at ≥$1% of their goal' },
  { es: /^Cobro registrado: (.+) — (.+)$/, en: /^Payment registered: (.+) — (.+)$/, toEs: 'Cobro registrado: $1 — $2', toEn: 'Payment registered: $1 — $2' },
];

/**
 * Bidirectional backend message translation hook.
 * Uses CompanyContext for reactive language detection.
 * Translates ES↔EN based on current tenant language setting.
 */
export function useBackendTranslation() {
  const t = useTranslations('backendMessages');
  const { settings } = useCompany();
  const lang = settings?.language || 'es';

  const tApi = useCallback(
    (message: string | undefined | null): string => {
      if (!message) return '';

      // 1. Exact match in backendMessages dictionary
      try {
        const translated = t(message);
        if (!translated.startsWith('backendMessages.')) {
          return translated;
        }
      } catch { /* not found */ }

      // 2. Bidirectional dynamic patterns
      for (const p of PATTERNS) {
        if (lang === 'en' && p.es.test(message)) {
          return message.replace(p.es, p.toEn);
        }
        if (lang !== 'en' && p.en.test(message)) {
          return message.replace(p.en, p.toEs);
        }
      }

      // 3. Return original
      return message;
    },
    [t, lang]
  );

  return { tApi };
}
