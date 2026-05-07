import { calculateLineAmounts } from '../lineAmountCalculator';

/**
 * Tests del cálculo de IVA por línea — espejo del backend
 * `LineAmountCalculator`. Bug histórico (2026-04-28): ticket cobraba $98.60
 * por $17×5 (sumando 16% sobre $85). El fix con `precioIncluyeIva=true`
 * deja $85 total exacto.
 */
describe('calculateLineAmounts', () => {
  describe('precio incluye IVA (caso default mexicano)', () => {
    it('redondea a 2 decimales sin sumar IVA encima del precio', () => {
      // $17 × 5 = $85 total. IVA 16% se desglosa de la base, no se suma.
      const r = calculateLineAmounts(17, 5, 0, 0.16, true);
      expect(r.total).toBe(85);
      expect(r.subtotal).toBeCloseTo(73.28, 2); // 85 / 1.16
      expect(r.impuesto).toBeCloseTo(11.72, 2); // 85 - 73.28
    });

    it('aplica descuento antes de desglosar IVA', () => {
      const r = calculateLineAmounts(100, 2, 20, 0.16, true);
      expect(r.total).toBe(180); // 100 × 2 - 20
      expect(r.subtotal).toBeCloseTo(155.17, 2);
      expect(r.impuesto).toBeCloseTo(24.83, 2);
    });

    it('total negativo si descuento > subtotal (caller debe validar)', () => {
      // El cálculo en sí no valida — el caller (PedidoCreateDtoValidator)
      // debe rechazar descuentos > subtotal antes de llegar aquí.
      const r = calculateLineAmounts(10, 1, 50, 0.16, true);
      expect(r.total).toBe(-40);
    });

    it('tasa 0 (producto exento) → no impuesto, total = subtotal = precio', () => {
      const r = calculateLineAmounts(50, 3, 0, 0, true);
      expect(r.total).toBe(150);
      expect(r.subtotal).toBe(150);
      expect(r.impuesto).toBe(0);
    });
  });

  describe('precio NO incluye IVA (caso B2B con factura)', () => {
    it('suma IVA encima del subtotal', () => {
      const r = calculateLineAmounts(100, 1, 0, 0.16, false);
      expect(r.subtotal).toBe(100);
      expect(r.impuesto).toBe(16);
      expect(r.total).toBe(116);
    });

    it('descuento se aplica al subtotal antes del IVA', () => {
      const r = calculateLineAmounts(100, 2, 50, 0.16, false);
      expect(r.subtotal).toBe(150); // 100 × 2 - 50
      expect(r.impuesto).toBe(24); // 150 × 0.16
      expect(r.total).toBe(174);
    });
  });

  describe('precisión y redondeo', () => {
    it('redondea cada componente a 2 decimales para evitar drift acumulado', () => {
      // Caso clásico de drift: 0.1 + 0.2 = 0.30000000000000004 en JS.
      // round2 debe garantizar 2 decimales exactos.
      const r = calculateLineAmounts(0.1, 1, 0, 0.16, true);
      expect(Number.isInteger(r.total * 100)).toBe(true);
      expect(Number.isInteger(r.subtotal * 100)).toBe(true);
      expect(Number.isInteger(r.impuesto * 100)).toBe(true);
    });
  });
});
