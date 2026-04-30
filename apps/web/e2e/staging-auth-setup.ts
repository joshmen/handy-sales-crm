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

  while (true) {
    const url = page.url();
    if (url.startsWith('https://staging.handysuites.com/') &&
        (url.includes('/dashboard') || url.match(/\/(clients|orders|products|promotions|routes|settings|inventory)/))) {
      console.log(`Detectado URL autenticado: ${url}`);
      await page.waitForTimeout(3000);
      await context.storageState({ path: STORAGE_FILE });
      console.log(`✅ Storage state guardado en ${STORAGE_FILE}`);
      break;
    }
    await page.waitForTimeout(1500);
  }

  await context.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
