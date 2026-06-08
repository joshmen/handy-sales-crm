import React from 'react';
import { Banknote, ArrowRightLeft, FileText, CreditCard, Receipt } from 'lucide-react-native';

/**
 * Sprint 3 audit code-quality: METODO_ICONS extraido a constants.
 *
 * Antes: duplicado en cobrar/historial.tsx:15 (size=16) y cobrar/registrar.tsx:36
 * (size=20). Cambiar iconografia requeria buscar+reemplazar en 2 archivos.
 *
 * Ahora: helper getPaymentIcon(metodo, size, color) configurable.
 *
 * Numeros de metodoPago corresponden al enum MetodoPago del backend:
 *   0=Efectivo, 1=Transferencia, 2=Cheque, 3=TarjetaCredito, 4=TarjetaDebito, 5=Otro
 */

export type MetodoPagoId = 0 | 1 | 2 | 3 | 4 | 5;

export interface PaymentIconOpts {
  size?: number;
  color?: string;
}

export function getPaymentIcon(metodo: number, opts?: PaymentIconOpts): React.ReactElement {
  const size = opts?.size ?? 16;
  const color = opts?.color ?? '#6b7280';
  switch (metodo) {
    case 0: return <Banknote size={size} color={color} />;
    case 1: return <ArrowRightLeft size={size} color={color} />;
    case 2: return <FileText size={size} color={color} />;
    case 3:
    case 4: return <CreditCard size={size} color={color} />;
    case 5:
    default: return <Receipt size={size} color={color} />;
  }
}

/**
 * Labels en espanol para los metodos. Mismo orden que el enum backend.
 * Usar getPaymentLabel(metodoPago) para evitar el ternary chain duplicado
 * en CobroRepository.cs y multiples lugares mobile.
 */
const PAYMENT_LABELS: Record<number, string> = {
  0: 'Efectivo',
  1: 'Transferencia',
  2: 'Cheque',
  3: 'Tarjeta de Crédito',
  4: 'Tarjeta de Débito',
  5: 'Otro',
};

export function getPaymentLabel(metodo: number): string {
  return PAYMENT_LABELS[metodo] ?? 'Otro';
}
