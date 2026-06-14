import { test, expect, Page, BrowserContext } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * E2E "DESDE CERO" — Onboarding + compra Stripe + facturación de un tenant nuevo.
 *
 * Flujo continuo en UN navegador (page compartido) para poder seguirlo visualmente:
 *   1. Registro self-service de un tenant NUEVO via /register (UI real).
 *   2. Login (verificación de email bypass dev via DB).
 *   3. Compra de timbres con Stripe (pago real test-mode + webhook via Stripe CLI)
 *      → verifica que los timbres AUMENTAN en la BD.
 *
 * Requiere Stripe CLI corriendo:
 *   stripe listen --forward-to http://localhost:1050/api/stripe/webhook
 */

test.describe.configure({ mode: 'serial' });
test.use({ launchOptions: { slowMo: 700 } });

const STAMP = Date.now().toString().slice(-9);
const EMAIL = `e2e.cero.${STAMP}@handytest.mx`;
const PASSWORD = `Qx7v!Kp${STAMP}zR2`; // fuerte y única (backend rechaza passwords filtradas)
// El tenant se da de alta con la identidad fiscal del emisor de prueba IVD920810GU2.
const RFC_EMISOR = 'IVD920810GU2';
const EMPRESA = 'INNOVACION VALOR Y DESARROLLO SA';
// CSD de prueba de IVD920810GU2 (descargado de la wiki Finkok), password 12345678a.
const CER_PATH = 'C:\\tmp\\finkok_certs\\ivd920810gu2\\CSD_IVD920810GU2_20230518062600\\CSD_Sucursal_1_IVD920810GU2_20230518_062554.cer';
const KEY_PATH = 'C:\\tmp\\finkok_certs\\ivd920810gu2\\CSD_IVD920810GU2_20230518062600\\CSD_Sucursal_1_IVD920810GU2_20230518_062554.key';
const CSD_PASSWORD = '12345678a';

let context: BrowserContext;
let page: Page;
let TENANT_ID = '';

/** SQL en el contenedor postgres local. */
function psql(sql: string, db = 'handy_erp'): string {
  const cmd = `docker exec -i handysuites_postgres_dev psql -U handy_user -d ${db} -t -A -c "${sql.replace(/"/g, '\\"')}"`;
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

/** Lee el código de verificación de 6 dígitos desde Mailpit (captura SMTP local). */
async function getVerificationCode(email: string): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const list = await (await fetch('http://localhost:8025/api/v1/messages')).json();
    const msg = (list.messages || []).find((m: { To?: { Address: string }[] }) =>
      (m.To || []).some(t => t.Address?.toLowerCase() === email.toLowerCase()));
    if (msg) {
      const full = await (await fetch(`http://localhost:8025/api/v1/message/${msg.ID}`)).json();
      const text = `${full.Text || ''} ${full.HTML || ''}`;
      const code = text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`No llegó email de verificación para ${email} a Mailpit`);
}

test.beforeAll(async ({ browser }) => {
  // Higiene: el RFC del emisor es ÚNICO por empresa (regla de negocio). Liberar el RFC
  // de prueba de corridas previas para que el alta nueva no choque con la constraint.
  psql(`UPDATE "DatosEmpresa" SET identificador_fiscal = NULL WHERE identificador_fiscal = '${RFC_EMISOR}'`);

  // Contexto LIMPIO (sin sesión): alta desde cero.
  context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  page = await context.newPage();
});

test.afterAll(async () => {
  await context?.close();
});

test('1. Alta de tenant nuevo desde cero (/register)', async () => {
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');

  const cookieBtn = page.getByRole('button', { name: /^Aceptar$/i });
  if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) await cookieBtn.click();

  await page.locator('input[name="nombre"]').fill('Admin IVD');
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirmPassword"]').fill(PASSWORD);
  await page.locator('input[name="nombreEmpresa"]').fill(EMPRESA);
  // RFC del emisor (identidad fiscal del tenant) = IVD920810GU2.
  await page.locator('input[name="identificadorFiscal"]').fill(RFC_EMISOR);
  await page.locator('input[name="aceptaTerminos"]').check();
  await page.getByRole('button', { name: /Crear mi cuenta|Crear cuenta|Create account/i }).click();

  await page.waitForURL(/verify-email|onboarding|dashboard/, { timeout: 20000 });

  let row = '';
  for (let i = 0; i < 10 && !row; i++) {
    row = psql(`SELECT id, tenant_id FROM "Usuarios" WHERE email='${EMAIL}'`);
    if (!row) await page.waitForTimeout(500);
  }
  expect(row, `usuario ${EMAIL} debe existir tras registro`).not.toBe('');
  const [userId, tenantId] = row.split('|');
  expect(Number(userId)).toBeGreaterThan(0);
  expect(Number(tenantId)).toBeGreaterThan(0);
  TENANT_ID = tenantId;
});

test('1b. Verificar email vía Mailpit (oficial, sin bypass DB)', async () => {
  // Leer el código de 6 dígitos del email real capturado por Mailpit.
  const code = await getVerificationCode(EMAIL);

  await page.goto(`/verify-email?email=${encodeURIComponent(EMAIL)}`);
  await page.waitForLoadState('domcontentloaded');
  // 6 inputs de 1 dígito con auto-submit al completar.
  const inputs = page.locator('input[inputmode="numeric"], input[maxlength="1"]');
  const count = await inputs.count();
  const digitInputs = count >= 6 ? inputs : page.locator('input');
  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill(code[i]);
  }
  // Tras verificar, redirige fuera de /verify-email (a onboarding/login/dashboard).
  await expect(page).not.toHaveURL(/verify-email/, { timeout: 15000 });

  const verified = psql(`SELECT email_verificado FROM "Usuarios" WHERE email='${EMAIL}'`);
  expect(verified, 'email debe quedar verificado oficialmente').toBe('t');
});

test('2. Completar onboarding por UI (identidad fiscal IVD)', async () => {
  // Tras verificar el email, el usuario quedó auto-logueado en /onboarding.
  await page.goto('/onboarding');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);

  // Paso 1: teléfono (requerido, >= 7 dígitos).
  const phone = page.locator('input[type="tel"]').first();
  if (await phone.isVisible({ timeout: 3000 }).catch(() => false)) await phone.fill('3312345678');
  else await page.locator('input').first().fill('3312345678');
  await page.getByRole('button', { name: /Continuar/i }).first().click();
  await page.waitForTimeout(1000);

  // Paso 2: empresa + identidad fiscal (RFC del emisor IVD).
  await page.locator('input[placeholder="Ej: Distribuidora Jeyma"]').fill('INNOVACION VALOR Y DESARROLLO');
  await page.locator('input[placeholder="Persona moral o física"]').fill(EMPRESA);
  await page.locator('input[placeholder="XAXX010101000"]').fill(RFC_EMISOR);
  await page.getByRole('button', { name: /Continuar/i }).first().click();
  await page.waitForTimeout(1000);

  // Paso 3: equipo → Omitir.
  await page.getByRole('button', { name: /Omitir|Saltar/i }).first().click()
    .catch(() => page.getByRole('button', { name: /Continuar/i }).first().click());
  await page.waitForTimeout(1000);

  // Paso 4: Comenzar → completa onboarding (completeOnboarding + redirect a dashboard).
  await page.getByRole('button', { name: /Comenzar|Empezar|Finalizar|Ir al|Listo|Entrar al/i }).first().click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 25000 });
});

/** Llena y envía el Stripe Embedded Checkout (tarjeta de prueba 4242). */
async function fillStripeCheckoutAndPay() {
  await page.waitForSelector('iframe[src*="stripe"]', { timeout: 45000 });
  await page.waitForTimeout(3000); // dejar montar los campos internos

  // Diagnóstico: listar TODOS los frames stripe (para entender la estructura).
  const frames = page.frames().map(f => f.url()).filter(u => /stripe/i.test(u));
  console.log('[stripe-frames] count=' + frames.length + ' ' + JSON.stringify(frames));

  const co = page.frameLocator('iframe[src*="stripe"]').first();
  // Email (embedded checkout suele pedirlo).
  const email = co.locator('input[name="email"], input[type="email"]').first();
  if (await email.isVisible({ timeout: 4000 }).catch(() => false)) await email.fill(EMAIL);

  // Card: directo o en iframe anidado.
  let target = co;
  if (!(await co.locator('input[name="cardNumber"]').isVisible({ timeout: 4000 }).catch(() => false))) {
    target = co.frameLocator('iframe').first();
  }
  await target.locator('input[name="cardNumber"]').fill('4242424242424242', { timeout: 30000 });
  await target.locator('input[name="cardExpiry"]').fill('1234');
  await target.locator('input[name="cardCvc"]').fill('123');
  for (const sel of ['input[name="billingName"]', 'input[name="cardholderName"]']) {
    const f = target.locator(sel);
    if (await f.isVisible({ timeout: 1500 }).catch(() => false)) { await f.fill('Admin E2E Cero'); break; }
  }
  const zip = target.locator('input[name="billingPostalCode"]');
  if (await zip.isVisible({ timeout: 1500 }).catch(() => false)) await zip.fill('44100');

  // Submit (Suscribirse / Start trial / Pay).
  await co.getByRole('button', { name: /Suscribirse|Start trial|Comenzar|Pagar|Pay|Subscribe/i })
    .first().click({ timeout: 15000 });
}

test('3. Pagar suscripción PRO con Stripe (desbloquea facturación)', async () => {
  await page.goto('/subscription');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  // "Agregar método de pago" = capturar tarjeta → el webhook fija subscription_plan_id
  // (desbloquea facturación). Es la acción de "pagar PRO" durante el trial.
  await page.getByRole('button', { name: /Agregar método de pago|Add payment method/i }).first().click();

  await fillStripeCheckoutAndPay();

  // El webhook (via Stripe CLI) fija subscription_plan_id=3 (PRO) + status Active.
  let planId = '';
  for (let i = 0; i < 40 && !planId; i++) {
    await page.waitForTimeout(2000);
    planId = psql(`SELECT COALESCE(subscription_plan_id::text,'') FROM "Tenants" WHERE id=${TENANT_ID}`);
  }
  expect(planId, 'subscription_plan_id debe quedar seteado tras pagar PRO').not.toBe('');
});

test('4. Comprar timbres con Stripe y verificar que AUMENTAN', async () => {
  test.setTimeout(150000);
  // Dejar que asiente la redirección post-pago de Stripe (/subscription?session_id=...).
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(2500);
  const before = Number(psql(`SELECT COALESCE(timbres_extras,0) FROM "Tenants" WHERE id=${TENANT_ID}`) || '0');

  await page.goto('/subscription/buy-timbres');
  await page.waitForLoadState('domcontentloaded');

  const packages = page.locator('[role="radio"]');
  await expect(packages.first()).toBeVisible({ timeout: 15000 });
  const cantidad = Number((await packages.first().innerText()).match(/\d+/)?.[0] ?? '25');
  await packages.first().click();
  await page.getByRole('button', { name: /Pay|Pagar/i }).first().click();

  await fillStripeCheckoutAndPay();

  // Webhook: timbres_extras += cantidad.
  let after = before;
  for (let i = 0; i < 40 && after <= before; i++) {
    await page.waitForTimeout(2000);
    after = Number(psql(`SELECT COALESCE(timbres_extras,0) FROM "Tenants" WHERE id=${TENANT_ID}`) || '0');
  }
  expect(after, `timbres_extras debe aumentar (antes=${before})`).toBeGreaterThan(before);
  expect(after - before).toBe(cantidad);
});

test('5. Subir CSD por UI → registrar el emisor NUEVO en Finkok', async () => {
  test.setTimeout(120000);
  // Estabilizar tras el redirect post-pago de Stripe de la etapa anterior.
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(2500);
  await page.goto('/billing/settings', { waitUntil: 'domcontentloaded' }).catch(async () => {
    await page.waitForTimeout(2000);
    await page.goto('/billing/settings', { waitUntil: 'domcontentloaded' });
  });
  await page.waitForTimeout(2000);

  // Inputs de archivo ocultos (.cer / .key) — setInputFiles funciona en inputs hidden.
  await page.locator('input[type="file"][accept=".cer"]').setInputFiles(CER_PATH);
  await page.locator('input[type="file"][accept=".key"]').setInputFiles(KEY_PATH);
  await page.locator('input[type="password"]').first().fill(CSD_PASSWORD);
  await page.getByRole('button', { name: /Subir certificados|Cargar certificados|Subir CSD/i }).first().click();

  // El backend valida el CSD, lo cifra y dispara el `add` de Finkok (registra el emisor).
  await expect(
    page.getByText(/habilitado para facturar en Finkok|Certificado cargado|reactivado en Finkok/i)
  ).toBeVisible({ timeout: 45000 });

  // Confirmar en BD que el emisor quedó REGISTRADO en Finkok.
  const reg = psql(`SELECT finkok_emisor_registrado FROM configuracion_fiscal WHERE tenant_id='${TENANT_ID}'`, 'handy_billing');
  expect(reg, 'el emisor IVD debe quedar registrado en Finkok').toBe('t');
});
