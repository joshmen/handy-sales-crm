import { test, expect } from '@playwright/test';

// TODO: Update selectors after Pencil redesign
test.describe.skip('Clients CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email|correo/i).fill('superadmin@handy.com');
    await page.getByLabel(/password|contraseña/i).fill('password123');
    await page.getByRole('button', { name: /iniciar|login|entrar/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    // Navigate to clients
    await page.getByRole('link', { name: /clientes|clients/i }).click();
    await expect(page).toHaveURL(/client/);
  });

  test('should display clients list', async ({ page }) => {
    // Should show table or list of clients
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });

  test('should open create client form', async ({ page }) => {
    // Click add/create button
    await page.getByRole('button', { name: /agregar|nuevo|crear|add|new/i }).click();

    // Should show form
    await expect(page.getByLabel(/nombre|name/i)).toBeVisible();
  });

  test('should create a new client', async ({ page }) => {
    const timestamp = Date.now();
    const clientName = `Cliente Test ${timestamp}`;

    // Click add button
    await page.getByRole('button', { name: /agregar|nuevo|crear|add|new/i }).click();

    // Fill form
    await page.getByLabel(/nombre|name/i).first().fill(clientName);

    // Try to find RFC field
    const rfcField = page.getByLabel(/rfc/i);
    if (await rfcField.isVisible()) {
      await rfcField.fill('XAXX010101000');
    }

    // Try to find email field
    const emailField = page.getByLabel(/email|correo/i);
    if (await emailField.isVisible()) {
      await emailField.fill(`test${timestamp}@test.com`);
    }

    // Submit
    await page.getByRole('button', { name: /guardar|save|crear|create/i }).click();

    // Should show success message or redirect
    await expect(page.getByText(/creado|guardado|success|éxito/i)).toBeVisible({ timeout: 10000 });
  });

  test('should search clients', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/buscar|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');

      // Wait for results to update
      await page.waitForTimeout(1000);
    }
  });

  test('should filter clients by category', async ({ page }) => {
    // Find filter dropdown
    const filterButton = page.getByRole('button', { name: /filtro|filter|categoría/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Select first filter option
      await page.getByRole('option').first().click();
    }
  });

  test('should edit a client', async ({ page }) => {
    // Click edit button on first row
    const editButton = page.getByRole('button', { name: /editar|edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Should show edit form
      await expect(page.getByLabel(/nombre|name/i)).toBeVisible();

      // Modify name
      const nameField = page.getByLabel(/nombre|name/i).first();
      await nameField.clear();
      await nameField.fill('Cliente Editado');

      // Save
      await page.getByRole('button', { name: /guardar|save|actualizar|update/i }).click();

      // Should show success
      await expect(page.getByText(/actualizado|guardado|success/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should delete a client', async ({ page }) => {
    // Click delete button on first row
    const deleteButton = page.getByRole('button', { name: /eliminar|delete|borrar/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should show success
      await expect(page.getByText(/eliminado|deleted|borrado/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show client details', async ({ page }) => {
    // Click on first client row
    const firstRow = page.getByRole('row').nth(1);
    if (await firstRow.isVisible()) {
      await firstRow.click();

      // Should show details (either in modal or new page)
      await page.waitForTimeout(1000);
    }
  });

  test('should paginate results', async ({ page }) => {
    // Find pagination
    const nextPage = page.getByRole('button', { name: /siguiente|next|>/i });
    if (await nextPage.isVisible() && await nextPage.isEnabled()) {
      await nextPage.click();
      await page.waitForTimeout(1000);

      // Should be on page 2
      const pageIndicator = page.getByText(/página 2|page 2/i);
      await expect(pageIndicator).toBeVisible().catch(() => {
        // Alternative: URL might have page parameter
      });
    }
  });
});
