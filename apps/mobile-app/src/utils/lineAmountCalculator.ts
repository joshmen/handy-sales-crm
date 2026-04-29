/**
 * Mirror del backend `LineAmountCalculator` (libs/HandySuites.Application/Common).
 * Calcula subtotal/impuesto/total de una línea de pedido respetando si el
 * precio del producto incluye IVA o no, y la tasa de impuesto del producto.
 *
 * Cuando precioIncluyeIva = true (default): el precio es lo que el cliente paga,
 * el sistema desglosa la base sin impuesto.
 *
 * Bug 2026-04-28: ticket cobraba $98.60 por $17×5 (sumando 16% sobre $85).
 * Ahora con este helper: $17×5 IVA-incluido = $85 total exacto.
 */

import { round2 } from './money';

export interface LineAmounts {
  subtotal: number;
  impuesto: number;
  total: number;
}

export function calculateLineAmounts(
  precioUnitario: number,
  cantidad: number,
  descuento: number,
  tasa: number,
  precioIncluyeIva: boolean,
): LineAmounts {
  if (precioIncluyeIva) {
    // Total = lo que paga el cliente. Subtotal = base sin impuesto.
    const totalLinea = precioUnitario * cantidad - descuento;
    const divisor = 1 + tasa;
    const subtotalLinea = divisor === 0 ? totalLinea : totalLinea / divisor;
    const impuestoLinea = totalLinea - subtotalLinea;
    return {
      subtotal: round2(subtotalLinea),
      impuesto: round2(impuestoLinea),
      total: round2(totalLinea),
    };
  } else {
    // Subtotal = base. Impuesto se suma. Total = lo que paga el cliente.
    const subtotalLinea = precioUnitario * cantidad - descuento;
    const impuestoLinea = subtotalLinea * tasa;
    const totalLinea = subtotalLinea + impuestoLinea;
    return {
      subtotal: round2(subtotalLinea),
      impuesto: round2(impuestoLinea),
      total: round2(totalLinea),
    };
  }
}
