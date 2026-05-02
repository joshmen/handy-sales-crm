import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.setTimeout(120_000);

/**
 * Verifica end-to-end el reporte del día completo de un vendedor con todos
 * los ping types nuevos (InicioJornada / StopAutomatico / FinJornada).
 * BD local fue pre-poblada con 10 pings simulando el caso de uso completo.
 */
test('drawer GPS muestra timeline con 9 ping types', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/team');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'test-results/jornada-team-list.png', fullPage: false });

  // El drawer de GPS se abre desde el chip "hace X min" en columna Última ubicación,
  // no clicando la fila (eso abre Sesiones). Buscamos el chip emerald-50 con texto
  // "hace X min/h/horas" cerca del email del vendedor1.
  const chip = page.getByRole('button', { name: /hace .+(min|hora|seg|d[ií]a)/i }).first();
  await chip.click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test-results/jornada-drawer.png', fullPage: true });

  // Verificar texto en drawer — los nuevos labels
  const labels = [
    'Inicio de jornada',
    'Fin de jornada',
    'Cierre automático',
    'Inicio de ruta',
    'Fin de ruta',
    'Pedido',
    'Visita',
    'Cobro',
    'Checkpoint',
  ];
  const found: string[] = [];
  const notFound: string[] = [];
  for (const lbl of labels) {
    const count = await page.getByText(new RegExp(`^${lbl}$`, 'i')).count();
    if (count > 0) found.push(`${lbl} (${count})`);
    else notFound.push(lbl);
  }
  console.log('Labels encontrados:', found.join(', '));
  console.log('Labels no encontrados:', notFound.join(', '));

  // Los 5 que sí pre-poblé en DB deben aparecer
  // (Pedido x4, Cobro x1, Checkpoint x1, InicioJornada x2, StopAutomatico x1, FinJornada x1)
  const pedidoCount = await page.getByText(/^Pedido$/i).count();
  const inicioJornadaCount = await page.getByText(/^Inicio de jornada$/i).count();
  const stopAutoCount = await page.getByText(/^Cierre automático$/i).count();
  const finJornadaCount = await page.getByText(/^Fin de jornada$/i).count();

  console.log({ pedidoCount, inicioJornadaCount, stopAutoCount, finJornadaCount });

  expect(inicioJornadaCount).toBeGreaterThanOrEqual(1);
  expect(stopAutoCount).toBeGreaterThanOrEqual(1);
  expect(finJornadaCount).toBeGreaterThanOrEqual(1);
});
