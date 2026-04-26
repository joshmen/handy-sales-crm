/**
 * Helpers de aritmética monetaria con redondeo seguro a 2 decimales.
 *
 * JS Number es float64 (IEEE 754) → operaciones suman drift:
 *   0.1 + 0.2 = 0.30000000000000004
 *   100 * 17.17 = 1716.9999999999998
 *
 * En contexto $ esto produce totales que muestran 1716.99 cuando deberían
 * ser 1717.00, IVA off-by-cent vs backend, comparaciones `>` que rechazan
 * pagos válidos por fracciones invisibles.
 *
 * Regla pre-producción: TODO valor monetario que se almacene, envíe al
 * backend, o se use en comparaciones debe pasar por `round2()`. El display
 * vía Intl.NumberFormat ya redondea a su style:'currency', así que para UI
 * pura no es necesario.
 */

/**
 * Redondea a 2 decimales (centavos). Usar antes de:
 *   - Almacenar en DB (subtotal, total, descuento, impuesto)
 *   - Enviar al backend (request body)
 *   - Comparar con `===`, `>`, `<`, `>=`, `<=` (validar saldo, etc.)
 *
 * @example
 *   round2(0.1 + 0.2)         // → 0.3 (no 0.30000000000000004)
 *   round2(100 * 17.17)       // → 1717 (no 1716.9999999999998)
 *   round2(1717 * 0.16)       // → 274.72 (no 274.71999999999997)
 */
export function round2(n: number): number {
  // Math.round trabaja sobre número, no string — más rápido y sin issues de
  // toFixed (que trunca 1.005 a 1.00 en vez de 1.01 por banker's rounding inverso).
  return Math.round(n * 100) / 100;
}

/**
 * Suma una lista de números monetarios redondeando solo el resultado final.
 * Sumar paso-a-paso con round2() introduciría error acumulado; aquí dejamos
 * que el float sume y redondeamos al final.
 */
export function sumMoney(values: number[]): number {
  return round2(values.reduce((s, v) => s + v, 0));
}
