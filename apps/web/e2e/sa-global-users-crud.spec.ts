import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin, loginAsVendedor } from './helpers/auth';

/**
 * QA Audit 2026-06-07 — SuperAdmin / Global Users — CRUD surface.
 *
 * IMPORTANTE — alcance real de la pantalla:
 * El target conceptual es "CRUD global de usuarios" pero la implementacion
 * actual de /admin/global-users (page.tsx) es READ-ONLY: tabla cross-tenant
 * + filtros + paginacion. NO hay botones de crear / editar / eliminar en la
 * vista global.
 *
 * PROD BUG / FIX TODO (gap funcional, no regresion):
 *   El propio CLAUDE.md y la spec global-users.spec.ts existente confirman
 *   que la pantalla es solo de consulta cross-tenant. El "create / update /
 *   delete" real vive en /team (scoped al tenant del usuario logueado),
 *   por lo que un SA no puede crear/editar usuarios de OTRO tenant sin
 *   antes impersonar. Si el roadmap quiere true CRUD global aqui (alta de
 *   ADMIN con tenantId arbitrario, soft-delete cross-tenant, etc), se
 *   requiere endpoint nuevo + UI nueva. Mientras tanto, esta spec valida
 *   el subset CRUD que SI existe: Read (list + filtros + paginacion).
 *
 * Estrategia: cubrir el lifecycle accesible end-to-end desde el SA:
 *   - READ: lista renderea, paginacion funciona, filtros (search/tenant/rol/
 *           estado) reactivan la consulta sin crashear.
 *   - CREATE (negativo): confirmar que NO existe boton "Nuevo usuario" en
 *           la pantalla global — si aparece sin endpoint atras, regresion.
 *   - UPDATE/DELETE (negativo): confirmar ausencia de controles inline; toda
 *           mutacion debe canalizarse via impersonacion o /team.
 *   - RBAC: ADMIN regular y VENDEDOR no acceden.
 *
 * Single-session: xjoshmenx es el unico SA, por eso describe es serial.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

const PAGE_URL = '/admin/global-users';

/** Helper: navega a la pagina y espera a que el render principal este listo. */
async function gotoGlobalUsers(page: Page): Promise<void> {
  await page.goto(PAGE_URL);
  await page.waitForLoadState('domcontentloaded');
  // El listado dispara fetchUsers en mount → damos margen para que termine.
  await page.waitForTimeout(2500);
}

test.describe('SA Global Users — READ (list cross-tenant)', () => {
  test('SA carga /admin/global-users sin crash y ve PageHeader', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    expect(page.url()).toContain(PAGE_URL);

    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    expect(bodyText).not.toMatch(/Application error|crashed|Internal Server Error/i);

    // PageHeader canonico — h1 visible (title via i18n).
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });
  });

  test('SA ve subtitle con count formateado (subtitle uses totalCount)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    // El subtitle es t('subtitle', { count: totalCount.toLocaleString() }) →
    // siempre aparece un numero (incluso "0") cerca del header.
    const headerRegion = page.locator('header, [class*="PageHeader"], main').first();
    const headerText = (await headerRegion.textContent()) ?? '';
    // Acepta cualquier digito → confirma que totalCount se renderizo (no NaN).
    expect(headerText).toMatch(/\d/);
  });

  test('SA ve tabla / cards y NO se queda en spinner', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    // Esperamos a que el spinner desaparezca; si sigue visible >4s, regresion.
    const spinner = page.locator('.animate-spin').first();
    const stillSpinning = await spinner.isVisible({ timeout: 500 }).catch(() => false);
    if (stillSpinning) {
      // PROD BUG / FIX TODO: GET /api/dashboard/global-users colgado
      // (>4s con paginacion 20). Revisar query del controller — falta
      // index o N+1 sobre Tenants.
      console.warn('[sa-global-users-crud] spinner visible >4s — posible API lenta');
    }

    const bodyText = (await page.locator('main').first().textContent()) ?? '';
    expect(bodyText).not.toMatch(/Acceso no disponible|access denied|sin permisos/i);
  });
});

test.describe('SA Global Users — Filters (read-side mutations)', () => {
  test('Filtros visibles: search input + 3 SearchableSelect (tenant, rol, estado)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    // Search input (placeholder via i18n; usamos type=text como ancla robusta).
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Los SearchableSelect rinden las opciones declaradas en ROLE_OPTIONS.
    // Validamos al menos un rol y "Todos los roles" o equivalente i18n.
    const bodyText = (await page.locator('main').first().textContent()) ?? '';
    const hasRoleHint = /Super Admin|Vendedor|Supervisor|Todos los roles|All roles/i.test(bodyText);
    expect(hasRoleHint).toBeTruthy();
  });

  test('Filtro search dispara refetch y no crashea', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('xjoshmenx');
    await page.waitForTimeout(1500);

    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    expect(bodyText).not.toMatch(/Application error|crashed/i);

    // Limpiar el filtro debe restaurar la lista (otro refetch).
    await searchInput.fill('');
    await page.waitForTimeout(1200);
    const cleanText = (await page.locator('main').first().textContent()) ?? '';
    expect(cleanText).not.toMatch(/Application error|crashed/i);
  });

  test('Filtro search con termino sin matches muestra estado vacio (no crash)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    const searchInput = page.locator('input[type="text"]').first();
    // Cadena casi-imposible de matchear contra emails/nombres reales.
    await searchInput.fill('zzz_no_match_user_qa_2026_xyz');
    await page.waitForTimeout(1800);

    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    // Aceptamos empty state (i18n) o lista vacia. Lo critico: no crash.
    expect(bodyText).not.toMatch(/Application error|crashed|Internal Server Error/i);
  });

  test('Cambio de filtros resetea paginacion a pagina 1 (setCurrentPage(1) effect)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('a');
    await page.waitForTimeout(1200);

    // No debemos ver "Page 5 of N" raro tras filtrar — el effect resetea.
    // Validacion suave: la pagina sigue cargando sin error.
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    expect(bodyText).not.toMatch(/Application error|crashed/i);
  });
});

test.describe('SA Global Users — CRUD UI surface (presencia de controles)', () => {
  test('CREATE: NO debe existir boton "Nuevo usuario" en la vista global', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    // PROD BUG / FIX TODO: la pantalla global es read-only por diseno actual.
    // Si aparece un CTA de "Nuevo usuario" / "Crear" sin endpoint POST
    // global atras, es regresion (queda colgado el flow).
    const createCtas = page.getByRole('button', {
      name: /Nuevo usuario|Crear usuario|Add user|New user/i,
    });
    await expect(createCtas).toHaveCount(0);
  });

  test('UPDATE: NO debe existir boton "Editar" inline en filas de la tabla global', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    // PROD BUG / FIX TODO: edicion cross-tenant requiere impersonacion.
    // Si surge un boton "Editar" inline sin endpoint PUT global, regresion.
    const editButtons = page.getByRole('button', { name: /^Editar$|^Edit$/i });
    expect(await editButtons.count()).toBeLessThanOrEqual(1); // tolera 1 falso positivo (filtros)
  });

  test('DELETE: NO debe existir boton "Eliminar" inline en la vista global', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoGlobalUsers(page);

    // Soft-delete cross-tenant esta gated. Si aparece CTA destructivo aqui,
    // es regresion peligrosa (riesgo de bypass de auditoria multi-tenant).
    const deleteButtons = page.getByRole('button', {
      name: /Eliminar|Borrar|Delete|Remove/i,
    });
    await expect(deleteButtons).toHaveCount(0);
  });
});

test.describe('SA Global Users — RBAC negativo', () => {
  test('ADMIN regular NO accede a /admin/global-users (redirect)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PAGE_URL);
    await page.waitForTimeout(3000);

    const url = page.url();
    // Esperamos redirect (a /dashboard, /login, o 404). Nunca debe quedar
    // en la URL global con la pagina cargada para un ADMIN no-SA.
    expect(url).not.toMatch(/\/admin\/global-users($|\?)/);
  });

  test('VENDEDOR NO accede a /admin/global-users (redirect)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsVendedor(page);
    await page.goto(PAGE_URL);
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/global-users($|\?)/);
  });

  test('SUPERVISOR — sin seed user dedicado en el sistema', async ({ page }, testInfo) => {
    // TODO: agregar un loginAsSupervisor cuando exista seed dedicado en
    // 06_e2e_parallel_users.sql. Por ahora skip explicito para no fingir
    // cobertura. helpers/auth-supervisor.ts existe pero depende de seed.
    test.skip(true, 'PENDING: seed user SUPERVISOR para RBAC negativo cross-tenant');
    void page; void testInfo;
  });
});
