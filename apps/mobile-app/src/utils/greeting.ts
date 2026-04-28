/**
 * Saludo localizado según la hora del tenant (no del device).
 *
 * El device puede estar en GMT (emulador), en TZ del usuario, o en cualquier
 * otra. Lo correcto es saludar usando la hora donde el tenant opera —
 * ej: tenant Mazatlán (UTC-7), si son las 7 PM allá pero el device está en
 * UTC (2 AM), debe decir "Buenas noches", no "Buenos días".
 */
export function getGreetingForTz(tz?: string): string {
  let hour: number;
  try {
    // Extrae la hora local en la TZ del tenant. Intl es la única forma
    // confiable cross-platform (date-fns-tz agregaría peso innecesario).
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    });
    hour = parseInt(fmt.format(new Date()), 10);
    if (isNaN(hour)) hour = new Date().getHours();
  } catch {
    // Fallback al device hour si la TZ es inválida o el runtime no soporta Intl
    hour = new Date().getHours();
  }
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}
