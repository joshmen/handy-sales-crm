import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Abre Chromium con perfil persistente. Las cookies (Vercel + app) quedan
 * guardadas en `e2e/.auth/staging-profile/` así que cerrar y reabrir NO
 * pierde la sesión. Solo logueas la primera vez.
 *
 * El script termina solo cuando detecta una URL autenticada de la app y
 * además exporta el storageState a `e2e/.auth/staging.json` para que los
 * tests Playwright lo carguen.
 */
async function main() {
  const PROFILE_DIR = path.resolve(__dirname, '.auth', 'staging-profile');
  const STORAGE_FILE = path.resolve(__dirname, '.auth', 'staging.json');
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
  });
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto('https://staging.handysuites.com/');

  console.log('\n========================================');
  console.log('  Perfil persistente:', PROFILE_DIR);
  console.log('  Logueate en el navegador (solo la primera vez):');
  console.log('  1. Pasá el gate de Vercel');
  console.log('  2. Login con tu admin de staging');
  console.log('  3. Esperá a estar en /dashboard. Auto-guarda y cierra.');
  console.log('========================================\n');

  // Espera que tanto la URL sea autenticada COMO que NextAuth haya seteado
  // su session-token (httpOnly). Sin esa cookie los tests reabren la pantalla
  // de login. Verificamos cookies cada loop iteration.
  while (true) {
    const url = page.url();
    const cookies = await context.cookies();
    const hasNextAuthSession = cookies.some(c =>
      c.name.includes('next-auth.session-token') ||
      c.name === 'authjs.session-token'
    );
    const isAuthedUrl = url.startsWith('https://staging.handysuites.com/') &&
      (url.includes('/dashboard') || url.match(/\/(clients|orders|products|promotions|routes|settings|inventory|team)/));

    if (isAuthedUrl && hasNextAuthSession) {
      console.log(`Detectado URL autenticado + session-token: ${url}`);
      await page.waitForTimeout(2000);

      // context.storageState() a veces omite cookies httpOnly+Secure de NextAuth.
      // Componemos el archivo manualmente: cookies frescas vía context.cookies()
      // (que SÍ las trae) y origins via storageState() para localStorage.
      const freshCookies = await context.cookies();
      const stateRaw = await context.storageState();
      const merged = { cookies: freshCookies, origins: stateRaw.origins };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(merged, null, 2));

      const hasSessionInFile = freshCookies.some(c =>
        c.name === '__Secure-next-auth.session-token' || c.name.endsWith('next-auth.session-token')
      );
      console.log(`✅ Storage state guardado en ${STORAGE_FILE} (session-token=${hasSessionInFile})`);
      if (!hasSessionInFile) {
        console.error('❌ La cookie de sesión no quedó en el archivo. Re-corré el script.');
        process.exit(1);
      }
      break;
    }
    if (isAuthedUrl && !hasNextAuthSession) {
      console.log(`URL autenticada (${url}) pero falta session-token de NextAuth. Logueate completo en la app (email + password).`);
    }
    await page.waitForTimeout(2000);
  }

  await context.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
