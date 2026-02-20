import { test, expect, Page } from '@playwright/test';

/**
 * Debug test for impersonation flow.
 * Captures all network requests to identify the root cause of the 400 error.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await page.locator('#email').fill('superadmin@handy.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });

  await expect(page).toHaveURL(/dashboard|system-dashboard/, { timeout: 15000 });
  console.log('Login successful, URL:', page.url());
}

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(1000);
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(2000);
}

test.describe('Impersonation Debug', () => {
  test('Full impersonation flow with network logging', async ({ page }) => {
    // Capture ALL network requests/responses
    const networkLogs: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('impersonation') || (url.includes('/auth/') && req.method() === 'POST')) {
        networkLogs.push(`>> ${req.method()} ${url}`);
        if (req.postData()) {
          networkLogs.push(`   BODY: ${req.postData()}`);
        }
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('impersonation')) {
        let body = '';
        try { body = await res.text(); } catch { body = '[unreadable]'; }
        networkLogs.push(`<< ${res.status()} ${res.url()}`);
        networkLogs.push(`   BODY: ${body}`);
      }
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Login
    console.log('\n=== STEP 1: Login ===');
    await loginAsSuperAdmin(page);

    // Step 2: Navigate to tenant detail page
    console.log('\n=== STEP 2: Navigate to /admin/tenants/1 ===');
    await page.goto('/admin/tenants/1');
    await waitForPageLoad(page);
    console.log('URL:', page.url());

    await page.screenshot({ path: 'e2e/screenshots/debug-01-tenant-detail.png', fullPage: true });

    // Step 3: Find and click Impersonar button
    console.log('\n=== STEP 3: Click Impersonar ===');
    const impersonarBtn = page.getByRole('button', { name: /impersonar/i });
    const btnCount = await impersonarBtn.count();
    console.log('Impersonar buttons found:', btnCount);

    if (btnCount === 0) {
      // Debug: list all buttons
      const allButtons = page.locator('button');
      const total = await allButtons.count();
      console.log('Total buttons:', total);
      for (let i = 0; i < Math.min(total, 20); i++) {
        const text = await allButtons.nth(i).textContent();
        console.log(`  Button[${i}]: "${text?.trim()}"`);
      }
      throw new Error('Impersonar button not found');
    }

    await impersonarBtn.first().click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/debug-02-modal-opened.png', fullPage: true });

    // Step 4: Check if "existing session" view is shown
    const bodyText = await page.textContent('body') || '';
    if (bodyText.includes('Sesión Activa Existente')) {
      console.log('\n!!! EXISTING SESSION VIEW DETECTED !!!');
      await page.screenshot({ path: 'e2e/screenshots/debug-03-existing-session.png', fullPage: true });

      // Print network logs at this point
      console.log('\n=== NETWORK LOGS ===');
      networkLogs.forEach(l => console.log(l));
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach(e => console.log(e));
      return;
    }

    // Step 5: Fill the form
    console.log('\n=== STEP 4: Fill form ===');
    const reasonField = page.locator('textarea');
    await reasonField.fill('Testing impersonation from Playwright E2E test - debug session flow');
    console.log('Reason filled');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    console.log('Checkbox checked');

    await page.screenshot({ path: 'e2e/screenshots/debug-03-form-filled.png', fullPage: true });

    // Step 6: Submit
    console.log('\n=== STEP 5: Submit ===');
    const submitBtn = page.getByRole('button', { name: /iniciar sesión de soporte/i });
    console.log('Submit visible:', await submitBtn.isVisible());
    console.log('Submit disabled:', await submitBtn.isDisabled());

    await submitBtn.click();
    console.log('Submit clicked, waiting for response...');

    // Wait for network response
    await page.waitForTimeout(5000);

    // Step 7: Results
    console.log('\n=== RESULTS ===');
    console.log('Final URL:', page.url());

    console.log('\n--- NETWORK LOGS ---');
    networkLogs.forEach(l => console.log(l));

    console.log('\n--- CONSOLE ERRORS ---');
    consoleErrors.forEach(e => console.log(e));

    await page.screenshot({ path: 'e2e/screenshots/debug-04-final.png', fullPage: true });

    // Check for error toasts
    const toasts = page.locator('[data-state="open"], [role="status"]');
    const toastCount = await toasts.count();
    if (toastCount > 0) {
      for (let i = 0; i < toastCount; i++) {
        const text = await toasts.nth(i).textContent();
        console.log(`Toast[${i}]: "${text}"`);
      }
    }
  });
});
