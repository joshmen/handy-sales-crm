/**
 * Converts a number to its Spanish words representation for Mexican CFDI invoices.
 * Example: 335.82 → "TRESCIENTOS TREINTA Y CINCO PESOS 82/100 M.N."
 */

const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TENS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const t = Math.floor(remainder / 10);
  const u = remainder % 10;

  let result = HUNDREDS[h];

  if (remainder === 0) return result;
  if (result) result += ' ';

  if (remainder < 10) {
    result += UNITS[remainder];
  } else if (remainder < 20) {
    result += TEENS[remainder - 10];
  } else if (remainder < 30 && u > 0) {
    result += 'VEINTI' + UNITS[u];
  } else {
    result += TENS[t];
    if (u > 0) result += ' Y ' + UNITS[u];
  }

  return result;
}

export function numberToSpanishWords(amount: number): string {
  if (amount === 0) return 'CERO PESOS 00/100 M.N.';

  const intPart = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - intPart) * 100);

  if (intPart === 0) {
    return `CERO PESOS ${String(cents).padStart(2, '0')}/100 M.N.`;
  }

  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const units = intPart % 1000;

  let words = '';

  if (millions > 0) {
    if (millions === 1) {
      words += 'UN MILLON ';
    } else {
      words += convertGroup(millions) + ' MILLONES ';
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      words += 'MIL ';
    } else {
      words += convertGroup(thousands) + ' MIL ';
    }
  }

  if (units > 0) {
    words += convertGroup(units);
  }

  words = words.trim();
  const currency = intPart === 1 ? 'PESO' : 'PESOS';

  return `${words} ${currency} ${String(cents).padStart(2, '0')}/100 M.N.`;
}
