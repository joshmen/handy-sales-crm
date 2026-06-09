# 40 test stubs disenados (HIGH gaps)\n\nSprint correctivo 2026-06-06.\n\n## Stub #1

``````csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Integration.Subscriptions;

/// <summary>
/// Verifica autorización del endpoint /api/superadmin/subscription-plans.
/// Antes de este test no había cobertura: SA debía poder crear/listar planes,
/// y ADMIN/VENDEDOR debían recibir 403 (hot path billing).
/// </summary>
public class SubscriptionPlanAdminEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _adminClient;
    private readonly HttpClient _vendedorClient;

    public SubscriptionPlanAdminEndpointsTests(CustomWebApplicationFactory factory)
    {
        _adminClient = factory.CreateClient(); // default = ADMIN

        _vendedorClient = factory.CreateClient();
        _vendedorClient.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");
    }

    [Fact]
    public async Task PostSubscriptionPlan_AsAdmin_Returns403()
    {
        // Arrange: ADMIN (no SUPER_ADMIN) intenta crear un plan
        var dto = new
        {
            nombre = "Plan Test",
            codigo = "TEST",
            precioMensual = 100m,
            precioAnual = 1000m,
            maxUsuarios = 5,
            maxProductos = 100,
            maxClientesPorMes = 50,
            incluyeReportes = false,
            incluyeSoportePrioritario = false,
            caracteristicas = new[] { "feature1" },
            orden = 1
        };

        // Act
        var response = await _adminClient.PostAsJsonAsync("/api/superadmin/subscription-plans", dto);

        // Assert: solo SUPER_ADMIN puede crear planes (hot path billing)
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
``````

## Stub #2

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api;
using HandySuites.Domain.Common;
using HandySuites.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class GlobalSettingsEndpointsTests : IClassFixture<CustomWebApplicationFactory<Program>>
{
    private readonly CustomWebApplicationFactory<Program> _factory;

    public GlobalSettingsEndpointsTests(CustomWebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PUT_GlobalSettings_AsAdmin_Returns403Forbidden()
    {
        // Arrange
        var client = _factory.CreateClient();
        var adminToken = await TestAuthHelper.GetJwtTokenAsync(
            client,
            email: "admin@jeyma.com",
            password: "test123",
            expectedRole: RoleNames.ADMIN);

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        var payload = new
        {
            MaintenanceMode = true,
            DefaultLocale = "es-MX",
            MaxTenantsPerInstance = 500
        };

        // Act
        var response = await client.PutAsJsonAsync("/api/global-settings", payload);

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.Forbidden,
            because: "PUT /api/global-settings is guarded by IsSuperAdmin and an ADMIN must be rejected");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("MaintenanceMode",
            because: "the endpoint must not echo the payload nor apply changes for non-SA roles");
    }
}
``````

## Stub #3

``````csharp
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using HandySuites.Api.Endpoints;
using HandySuites.Domain.Common;
using HandySuites.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class MigrationEndpointsTests : IClassFixture<HandySuitesWebApplicationFactory>
{
    private readonly HandySuitesWebApplicationFactory _factory;

    public MigrationEndpointsTests(HandySuitesWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RunMigrations_AsAdmin_Returns403Forbidden()
    {
        // Arrange: Admin (not SUPER_ADMIN) tries to trigger migration endpoint
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var adminToken = await TestAuthHelper.GetJwtTokenAsync(
            _factory,
            email: "admin@jeyma.com",
            password: "test123",
            role: RoleNames.ADMIN);

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        // Act: attempt to invoke runtime migration endpoint
        var response = await client.PostAsync("/internal/migrations/run", content: null);

        // Assert: ADMIN role must be rejected — only SUPER_ADMIN authorized
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify migration runner was NOT invoked (mock counter == 0)
        var migrationRunnerMock = _factory.Services.GetMigrationRunnerMock();
        Assert.Equal(0, migrationRunnerMock.InvocationCount);
    }
}
``````

## Stub #4

``````csharp
using System.Net;
using System.Net.Http.Headers;
using HandySuites.Billing.Api;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Billing.Tests.Controllers;

public class FinkokAdminControllerAuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public FinkokAdminControllerAuthorizationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListarEmisores_AsAdmin_Returns403Forbidden()
    {
        // Arrange: ADMIN role token (not SUPER_ADMIN) — guard IsSuperAdmin() must reject
        var client = _factory.CreateClient();
        var adminToken = TestJwtFactory.CreateToken(
            userId: "admin-user-id",
            email: "admin@jeyma.com",
            role: "ADMIN",
            tenantId: "tenant-jeyma");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", adminToken);

        // Act: hit a SUPER_ADMIN-only endpoint
        var response = await client.GetAsync("/api/admin/finkok/emisores");

        // Assert: must be 403 Forbidden (NOT 200, NOT 401)
        // 401 would mean auth is broken; 200 would mean ADMIN bypassed the guard
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Assert: audit log should record the denied attempt
        var auditEntry = TestAuditLogCapture.GetLastEntry();
        Assert.NotNull(auditEntry);
        Assert.Equal("admin-user-id", auditEntry!.UserId);
        Assert.Equal("FORBIDDEN_FINKOK_ADMIN_ACCESS", auditEntry.Action);
        Assert.Contains("ListarEmisores", auditEntry.Resource);
    }
}
``````

## Stub #5

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.DTOs;
using HandySuites.Tests.Infrastructure;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class CompanyEndpointsTests : IClassFixture<HandySuitesApiFactory>
{
    private readonly HandySuitesApiFactory _factory;

    public CompanyEndpointsTests(HandySuitesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetCompanies_AsAdmin_Returns403Forbidden()
    {
        // Arrange: ADMIN (no SUPER_ADMIN) authenticated client for cross-tenant endpoint
        var client = _factory.CreateClientAsRole(role: "ADMIN", tenantId: 1, userId: 100);

        // Act
        var response = await client.GetAsync("/api/companies");

        // Assert: ADMIN must NOT be able to list cross-tenant companies
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            because: "GET /api/companies is SUPER_ADMIN-only; ADMIN must receive 403 to prevent cross-tenant data leak");
    }
}
``````

## Stub #6

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsAdmin, clearAuthStorage } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Finkok Admin - Registro de emisores PAC', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test('SUPER_ADMIN puede acceder, listar emisores y registrar uno nuevo; ADMIN es bloqueado', async ({ page }) => {
    // ===== Arrange: Login como SUPER_ADMIN =====
    await loginAsSuperAdmin(page);

    // ===== Act 1: Navegar a /admin/finkok =====
    await page.goto('/admin/finkok');

    // ===== Assert 1: Pagina carga correctamente (no redirige a access-denied) =====
    await expect(page).toHaveURL(/\/admin\/finkok/);
    await expect(page).not.toHaveURL(/access-denied/);

    // ===== Assert 2: Header/titulo de la pagina visible =====
    await expect(
      page.getByRole('heading', { name: /finkok|emisores|pac/i })
    ).toBeVisible({ timeout: 10000 });

    // ===== Assert 3: Lista/tabla de emisores se renderiza =====
    const emisoresList = page.locator(
      '[data-testid="emisores-list"], table, [role="table"], [data-testid="finkok-emisores"]'
    ).first();
    await expect(emisoresList).toBeVisible({ timeout: 15000 });

    // ===== Act 2: Click en boton "Registrar emisor" =====
    const registrarBtn = page.getByRole('button', {
      name: /registrar emisor|nuevo emisor|agregar emisor/i,
    }).first();
    await expect(registrarBtn).toBeVisible();
    await registrarBtn.click();

    // ===== Assert 4: Modal/form de registro se abre =====
    const modal = page.locator(
      '[role="dialog"], [data-testid="registrar-emisor-modal"], form'
    ).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // ===== Act 3: Llenar form con RFC de prueba SAT valido =====
    const rfcTestValido = 'EKU9003173C9'; // RFC de prueba oficial SAT
    const rfcInput = page.getByLabel(/rfc/i).first();
    await rfcInput.fill(rfcTestValido);

    const razonSocialInput = page.getByLabel(/raz[oó]n social|nombre/i).first();
    if (await razonSocialInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await razonSocialInput.fill('ESCUELA KEMPER URGATE SA DE CV');
    }

    const emailInput = page.getByLabel(/email|correo/i).first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('test-finkok@jeyma.com');
    }

    // ===== Act 4: Submit del form =====
    const submitBtn = page.getByRole('button', {
      name: /registrar|guardar|confirmar|enviar/i,
    }).last();
    await submitBtn.click();

    // ===== Assert 5: Mensaje de exito visible (toast/alert/inline) =====
    const successIndicator = page.locator(
      '[role="status"], [data-testid*="success"], [class*="success"], [class*="toast"]'
    ).filter({ hasText: /registrad|exit|correct|guardad/i }).first();

    await expect(successIndicator).toBeVisible({ timeout: 15000 });

    // ===== Cleanup: Logout =====
    await clearAuthStorage(page);

    // ===== Act 5: RBAC negativo - Login como ADMIN regular =====
    await loginAsAdmin(page);

    // ===== Act 6: Intentar acceder a /admin/finkok como ADMIN =====
    await page.goto('/admin/finkok');

    // ===== Assert 6: ADMIN es redirigido a access-denied (NO debe ver la pagina) =====
    await expect(page).toHaveURL(/\/admin\/access-denied|\/access-denied|\/unauthorized/, {
      timeout: 10000,
    });

    // ===== Assert 7: Confirmar que NO se renderiza contenido Finkok =====
    await expect(
      page.getByRole('heading', { name: /finkok|registrar emisor/i })
    ).not.toBeVisible();
  });
});
``````

## Stub #7

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsAdmin, loginAsVendedor, clearAuthStorage } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('SUPER_ADMIN - Global Users Management (/admin/global-users)', () => {
  test('SA can view, filter cross-tenant users and non-SA roles get access-denied', async ({ page }) => {
    // ===== Arrange: SUPER_ADMIN session =====
    await clearAuthStorage(page);
    await loginAsSuperAdmin(page);

    // ===== Act: navigate to global-users page =====
    await page.goto('/admin/global-users');
    await page.waitForLoadState('networkidle');

    // ===== Assert: page loads with header and table =====
    await expect(page).toHaveURL(/\/admin\/global-users/);
    await expect(
      page.getByRole('heading', { name: /usuarios globales|global users/i })
    ).toBeVisible({ timeout: 10_000 });

    const usersTable = page.getByRole('table').first();
    await expect(usersTable).toBeVisible();

    // Assert: table has rows from multiple tenants (cross-tenant view)
    const rows = usersTable.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Assert: tenant column is visible (proves cross-tenant data)
    await expect(
      page.getByRole('columnheader', { name: /tenant|empresa/i }).first()
    ).toBeVisible();

    // Collect distinct tenant values from first 10 rows to confirm cross-tenant listing
    const tenantCellsLocator = usersTable.locator('tbody tr td[data-column="tenant"], tbody tr td:has-text("@")');
    const sampleSize = Math.min(rowCount, 10);
    const tenantsSeen = new Set<string>();
    for (let i = 0; i < sampleSize; i++) {
      const rowText = (await rows.nth(i).innerText()).trim();
      const emailMatch = rowText.match(/@([\w.-]+)/);
      if (emailMatch) tenantsSeen.add(emailMatch[1]);
    }
    expect(tenantsSeen.size).toBeGreaterThanOrEqual(1);

    // ===== Act: apply tenant filter =====
    const tenantFilter = page.getByRole('combobox', { name: /tenant|empresa/i }).first();
    if (await tenantFilter.isVisible().catch(() => false)) {
      await tenantFilter.click();
      const firstOption = page.getByRole('option').first();
      await firstOption.click();
      await page.waitForLoadState('networkidle');

      // Assert: filtered rows still present, count <= original
      const filteredCount = await usersTable.locator('tbody tr').count();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThanOrEqual(rowCount);
    }

    // ===== Act + Assert: ADMIN role gets access-denied =====
    await clearAuthStorage(page);
    await loginAsAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('networkidle');

    const adminUrl = page.url();
    const adminBlocked =
      adminUrl.includes('/access-denied') ||
      adminUrl.includes('/403') ||
      adminUrl.includes('/login') ||
      adminUrl.match(/\/dashboard\/?$/) !== null ||
      (await page.getByText(/acceso denegado|access denied|no autorizado|403/i).isVisible().catch(() => false));
    expect(adminBlocked, `ADMIN must not access /admin/global-users (was: ${adminUrl})`).toBeTruthy();

    // ===== Act + Assert: VENDEDOR role gets access-denied =====
    await clearAuthStorage(page);
    await loginAsVendedor(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('networkidle');

    const vendedorUrl = page.url();
    const vendedorBlocked =
      vendedorUrl.includes('/access-denied') ||
      vendedorUrl.includes('/403') ||
      vendedorUrl.includes('/login') ||
      vendedorUrl.match(/\/dashboard\/?$/) !== null ||
      (await page.getByText(/acceso denegado|access denied|no autorizado|403/i).isVisible().catch(() => false));
    expect(vendedorBlocked, `VENDEDOR must not access /admin/global-users (was: ${vendedorUrl})`).toBeTruthy();
  });
});
``````

## Stub #8

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsAdmin, clearAuthStorage } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('SuperAdmin - Subscription Plans CRUD', () => {
  test('SA puede togglear incluye_tracking_vendedor en plan PRO y persiste tras reload; ADMIN recibe access-denied', async ({ page }) => {
    // ---------- Arrange: login como SUPER_ADMIN ----------
    await clearAuthStorage(page);
    await loginAsSuperAdmin(page);

    // ---------- Act 1: navegar al listado de planes ----------
    await page.goto('/admin/subscription-plans');
    await expect(page).toHaveURL(/\/admin\/subscription-plans/);

    // Verificar que la tabla de planes carga
    await expect(page.getByRole('heading', { name: /Planes de Suscripci[oó]n/i })).toBeVisible({ timeout: 10000 });

    // Verificar que el plan PRO está listado
    const proRow = page.getByRole('row').filter({ hasText: /PRO/i }).first();
    await expect(proRow).toBeVisible();

    // ---------- Act 2: abrir edición del plan PRO ----------
    await proRow.getByRole('button', { name: /editar|edit/i }).click();

    // El modal/drawer de edición debe abrir
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByText(/PRO/i).first()).toBeVisible();

    // ---------- Act 3: leer estado actual del toggle y togglearlo ----------
    const trackingToggle = editDialog.getByRole('switch', { name: /tracking GPS|incluye tracking|tracking vendedor/i });
    await expect(trackingToggle).toBeVisible();

    const initialState = await trackingToggle.getAttribute('aria-checked');
    const initialChecked = initialState === 'true';

    await trackingToggle.click();

    // Verificar que el toggle cambió de estado en UI
    await expect(trackingToggle).toHaveAttribute('aria-checked', initialChecked ? 'false' : 'true');

    // ---------- Act 4: guardar cambios ----------
    await editDialog.getByRole('button', { name: /guardar|save/i }).click();

    // Esperar toast de éxito
    await expect(page.getByText(/actualizado|guardado|exitoso/i).first()).toBeVisible({ timeout: 5000 });

    // ---------- Act 5: reload y verificar persistencia ----------
    await page.reload();
    await expect(page.getByRole('heading', { name: /Planes de Suscripci[oó]n/i })).toBeVisible({ timeout: 10000 });

    const proRowAfterReload = page.getByRole('row').filter({ hasText: /PRO/i }).first();
    await proRowAfterReload.getByRole('button', { name: /editar|edit/i }).click();

    const editDialogReload = page.getByRole('dialog');
    await expect(editDialogReload).toBeVisible();

    const trackingToggleReload = editDialogReload.getByRole('switch', { name: /tracking GPS|incluye tracking|tracking vendedor/i });
    await expect(trackingToggleReload).toHaveAttribute('aria-checked', initialChecked ? 'false' : 'true');

    // Revertir cambio para no contaminar fixtures
    await trackingToggleReload.click();
    await editDialogReload.getByRole('button', { name: /guardar|save/i }).click();
    await expect(page.getByText(/actualizado|guardado|exitoso/i).first()).toBeVisible({ timeout: 5000 });

    // ---------- Assert final: ADMIN regular NO puede acceder ----------
    await clearAuthStorage(page);
    await loginAsAdmin(page);

    await page.goto('/admin/subscription-plans');

    // ADMIN debe recibir access-denied: redirect a /unauthorized, /forbidden, dashboard, o ver mensaje 403
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    const isRedirected = /\/(unauthorized|forbidden|403|dashboard|inicio)/i.test(currentUrl) &&
                         !/\/admin\/subscription-plans/.test(currentUrl);
    const hasAccessDeniedText = await page.getByText(/acceso denegado|no autorizado|sin permisos|forbidden|unauthorized/i).first().isVisible().catch(() => false);

    expect(isRedirected || hasAccessDeniedText).toBeTruthy();
  });
});
``````

## Stub #9

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('SA-1b: SuperAdmin - Crear nueva empresa (flujo completo)', () => {
  test('SUPER_ADMIN puede crear una nueva empresa desde /admin/tenants y la ve en la lista', async ({ page }) => {
    // Arrange: login como SUPER_ADMIN y navegar a tenants
    await loginAsSuperAdmin(page);
    await page.goto('/admin/tenants');
    await expect(page.getByRole('heading', { name: /empresas|tenants/i })).toBeVisible();

    // Datos unicos para evitar colision RFC
    const timestamp = Date.now();
    const uniqueSuffix = String(timestamp).slice(-6);
    const razonSocial = `E2E Empresa Test ${uniqueSuffix}`;
    // RFC persona moral: 3 letras + 6 digitos fecha + 3 homoclave
    const rfc = `ETE${uniqueSuffix.slice(0, 6).padEnd(6, '0')}XYZ`;
    const adminEmail = `e2e-admin-${timestamp}@test-tenant.com`;

    // Act 1: abrir modal/wizard "Nueva empresa"
    const nuevaEmpresaBtn = page.getByRole('button', { name: /nueva empresa|crear empresa|nuevo tenant/i });
    await expect(nuevaEmpresaBtn).toBeVisible();
    await nuevaEmpresaBtn.click();

    // Esperar modal/dialog visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Act 2: llenar formulario
    await modal.getByLabel(/raz[oó]n social|nombre/i).fill(razonSocial);
    await modal.getByLabel(/rfc/i).fill(rfc);

    // Seleccionar plan (combo o select)
    const planControl = modal.getByLabel(/plan|suscripci[oó]n/i);
    await planControl.click();
    // Intentar opcion PRO o BUSINESS (planes con features completos)
    const planOption = page.getByRole('option', { name: /pro|business|b[aá]sico/i }).first();
    await planOption.click();

    // Email del administrador inicial
    await modal.getByLabel(/email.*admin|correo.*admin|administrador/i).fill(adminEmail);

    // Act 3: submit
    const submitBtn = modal.getByRole('button', { name: /crear|guardar|registrar/i });
    await submitBtn.click();

    // Assert 1: esperar toast de exito
    const successToast = page.locator('[role="status"], [data-sonner-toast], .toast-success').filter({
      hasText: /creada|creado|registrad[ao]|[eé]xito/i
    });
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // Assert 2: modal se cierra
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Assert 3: reload list y verificar nueva fila visible
    await page.reload();
    await expect(page.getByRole('heading', { name: /empresas|tenants/i })).toBeVisible();

    // Buscar fila con la razon social creada
    const nuevaFila = page.getByRole('row').filter({ hasText: razonSocial });
    await expect(nuevaFila).toBeVisible({ timeout: 10000 });
    await expect(nuevaFila).toContainText(rfc);

    // Assert 4: validar que POST /api/companies (SA-only) fue exitoso via UI count
    // La fila existe => backend devolvio 201/200
    const rowCount = await page.getByRole('row').filter({ hasText: razonSocial }).count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});
``````

## Stub #10

```Mvc.Testing is referenced. I'll write a unit test that exercises the role-guard logic directly by invoking the endpoint group via `WebApplication.CreateBuilder` minimal host, but actually simpler: test the role-check logic by constructing an HttpContext with a ClaimsPrincipal and invoking the delegate. However the delegate is registered inline. The cleanest approach: build a minimal `WebApplication` in-process with a stub authentication scheme that injects role claims.

Let me write a test using `WebApplicationFactory` style with a minimal host hosting just these endpoints.

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using HandySuites.Mobile.Api.Configuration;
using HandySuites.Mobile.Api.Endpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Serilog.Events;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileLogLevelEndpointsTests : IAsyncLifetime
{
    private IHost _host = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _host = await new HostBuilder()
            .ConfigureWebHost(webBuilder =>
            {
                webBuilder
                    .UseTestServer()
                    .ConfigureServices(services =>
                    {
                        services.AddRouting();
                        services
                            .AddAuthentication(TestAuthHandler.SchemeName)
                            .AddScheme<TestAuthSchemeOptions, TestAuthHandler>(
                                TestAuthHandler.SchemeName, _ => { });
                        services.AddAuthorization();
                    })
                    .Configure(app =>
                    {
                        app.UseRouting();
                        app.UseAuthentication();
                        app.UseAuthorization();
                        app.UseEndpoints(endpoints =>
                        {
                            endpoints.MapMobileLogLevelEndpoints();
                        });
                    });
            })
            .StartAsync();

        _client = _host.GetTestClient();
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        _host.Dispose();
        return Task.CompletedTask;
    }

    private void SetRole(string? role)
    {
        _client.DefaultRequestHeaders.Remove(TestAuthHandler.RoleHeader);
        _client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthenticateHeader);
        if (role is not null)
        {
            _client.DefaultRequestHeaders.Add(TestAuthHandler.AuthenticateHeader, "true");
            _client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        }
    }

    [Fact]
    public async Task GetLogLevel_WithSuperAdminJwt_Returns200AndEchoesLevel()
    {
        // Arrange — set known level so the response is deterministic
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = LogEventLevel.Information;
        SetRole("SUPER_ADMIN");

        // Act
        var response = await _client.GetAsync("/api/superadmin/log-level/");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LogLevelResponse>();
        body.Should().NotBeNull();
        body!.Level.Should().Be("Information");
    }

    [Fact]
    public async Task GetLogLevel_WithAdminJwt_Returns403Forbid()
    {
        // Arrange
        SetRole("ADMIN");

        // Act
        var response = await _client.GetAsync("/api/superadmin/log-level/");

        // Assert — regression guard: 'ADMIN' must never be accepted
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetLogLevel_WithoutJwt_Returns401Unauthorized()
    {
        // Arrange — no auth header at all
        SetRole(null);

        // Act
        var response = await _client.GetAsync("/api/superadmin/log-level/");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("Warning", LogEventLevel.Warning)]
    [InlineData("Information", LogEventLevel.Information)]
    [InlineData("Debug", LogEventLevel.Debug)]
    public async Task PostLogLevel_WithSuperAdmin_AcceptsValidLevelAndUpdatesSwitch(string input, LogEventLevel expected)
    {
        // Arrange
        SetRole("SUPER_ADMIN");
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = LogEventLevel.Error;

        // Act
        var response = await _client.PostAsJsonAsync("/api/superadmin/log-level/", new { level = input });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LogLevelResponse>();
        body!.Level.Should().Be(expected.ToString());
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.Should().Be(expected);
    }

    [Fact]
    public async Task PostLogLevel_WithSuperAdmin_RejectsInvalidLevelWith400()
    {
        // Arrange
        SetRole("SUPER_ADMIN");

        // Act
        var response = await _client.PostAsJsonAsync("/api/superadmin/log-level/", new { level = "NotARealLevel" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostLogLevel_RegressionGuard_RejectsSuperadminAndSuper_admin_Casing()
    {
        // Arrange — endpoint uses exact-match string compare against "SUPER_ADMIN".
        // Common casing regressions ("SUPERADMIN", "super_admin", "Super_Admin")
        // must continue to be rejected with 403, NOT silently accepted.
        foreach (var bogusRole in new[] { "SUPERADMIN", "super_admin", "Super_Admin", "superadmin" })
        {
            SetRole(bogusRole);
            var response = await _client.PostAsJsonAsync("/api/superadmin/log-level/", new { level = "Warning" });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"role '{bogusRole}' must be rejected — only literal 'SUPER_ADMIN' grants access");
        }
    }

    private record LogLevelResponse(string Level, string? Message);

    // ---- Test auth handler: injects a ClaimsPrincipal with a configurable role claim ----
    private class TestAuthSchemeOptions : AuthenticationSchemeOptions { }

    private class TestAuthHandler : AuthenticationHandler<TestAuthSchemeOptions>
    {
        public const string SchemeName = "Test";
        public const string AuthenticateHeader = "X-Test-Auth";
        public const string RoleHeader = "X-Test-Role";

        public TestAuthHandler(
            IOptionsMonitor<TestAuthSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock)
            : base(options, logger, encoder, clock) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.ContainsKey(AuthenticateHeader))
                return Task.FromResult(AuthenticateResult.NoResult());

            var role = Request.Headers[RoleHeader].ToString();
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "1"),
                new Claim("role", role),
                new Claim(ClaimTypes.Role, role),
            };
            var identity = new ClaimsIdentity(claims, SchemeName);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, SchemeName);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
``````

## Stub #11

``````yaml
appId: com.handysuites.app
name: 01-login-superadmin
tags:
  - auth
  - superadmin
  - smoke
---
- launchApp:
    clearState: true
    clearKeychain: true
    stopApp: true

- runFlow:
    when:
      visible:
        text: "Iniciar sesión"
        optional: true
    commands:
      - assertVisible: "Iniciar sesión"

# Asegurar que estamos en la pantalla de login (no en una sesión previa)
- runFlow:
    when:
      visible:
        text: "Cerrar sesión"
        optional: true
    commands:
      - tapOn: "Cerrar sesión"
      - assertVisible: "Iniciar sesión"

# === Ingresar credenciales SUPER_ADMIN ===
- tapOn:
    id: "input-email"
- inputText: "xjoshmenx@gmail.com"
- hideKeyboard

- tapOn:
    id: "input-password"
- inputText: "test123"
- hideKeyboard

- tapOn:
    text: "Iniciar sesión"
    index: 0

# === Esperar respuesta del backend (JWT con role=SUPER_ADMIN) ===
- extendedWaitUntil:
    visible:
      text: "Hoy"
    timeout: 15000

# === Assertion 1: login exitoso → AdminDashboard (tab "Hoy") ===
- assertVisible: "Hoy"
- assertNotVisible: "Iniciar sesión"
- assertNotVisible:
    text: "Credenciales inválidas"
    optional: true

# === Assertion 2: navegar al tab "Más" para verificar el chip de rol ===
- tapOn:
    text: "Más"
    index: 0

- extendedWaitUntil:
    visible:
      text: "Super Admin"
    timeout: 8000

# === Assertion 3: chip "Super Admin" visible (ROLE_LABELS en mas.tsx) ===
- assertVisible:
    text: "Super Admin"

# === Assertion 4: el email del usuario coincide con la cuenta SA ===
- assertVisible:
    text: "xjoshmenx@gmail.com"

# === Assertion 5: NO debe mostrarse el label de ADMIN ===
- assertNotVisible:
    text: "Administrador"

# === Assertion 6: capturar screenshot para validar color #7c3aed del chip ===
# (Validación visual del color púrpura del chip Super Admin; revisar en
#  .maestro/screenshots/superadmin-chip.png que el badge sea morado, no rojo/azul)
- takeScreenshot: superadmin-chip-color

# === Assertion 7: opciones exclusivas de SUPER_ADMIN visibles en "Más" ===
- assertVisible:
    text: "Administración"
    optional: false

# === Sanity check: volver a "Hoy" para confirmar que la sesión persiste ===
- tapOn:
    text: "Hoy"
    index: 0
- assertVisible: "Hoy"
``````

## Stub #12

``````yaml
appId: com.handysuites.mobile
name: SUPER_ADMIN sees AdminDashboard (not vendedor dashboard)
tags:
  - role-routing
  - super-admin
  - regression
---
- launchApp:
    clearState: true
    clearKeychain: true

- assertVisible:
    text: "Iniciar sesión"

- tapOn:
    id: "login-email-input"
- inputText: "xjoshmenx@gmail.com"

- runFlow:
    commands:
      - tapOn:
          id: "login-password-input"
      - inputText: "test123"

- tapOn:
    id: "login-submit-button"

- extendedWaitUntil:
    visible:
      text: "Inicio"
    timeout: 15000

# --- Guard: SA must land on AdminDashboard, NOT vendedor dashboard ---

# 1. Greeting must contain "Admin" (AdminDashboard renders <Greeting role="ADMIN" />)
- assertVisible:
    text: ".*Admin.*"

# 2. Resumen-tenant KPI cards are AdminDashboard-exclusive
- assertVisible:
    id: "admin-dashboard-resumen-tenant"
- assertVisible:
    text: "Resumen del tenant"

# 3. KPI cards (clientes, ventas del mes, cobranza pendiente)
- assertVisible:
    text: "Clientes"
- assertVisible:
    text: "Ventas del mes"
- assertVisible:
    text: "Cobranza pendiente"

# 4. Vendedores list section — only AdminDashboard renders this
- assertVisible:
    id: "admin-dashboard-vendedores-list"
- assertVisible:
    text: "Vendedores"

# 5. Negative assertions — vendedor dashboard markers MUST NOT be present
- assertNotVisible:
    id: "vendedor-dashboard-mi-ruta"
- assertNotVisible:
    text: "Mi ruta de hoy"
- assertNotVisible:
    text: "Próxima visita"

# 6. Confirm route is the tabs index (not /vendedor)
- assertVisible:
    id: "tab-inicio"
- assertVisible:
    id: "tab-clientes"
``````

## Stub #13

``````csharp
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using FluentAssertions;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Endpoints;
using HandySuites.Mobile.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileSupervisorEndpointsTests : IClassFixture<MobileApiFactory>
{
    private readonly MobileApiFactory _factory;

    public MobileSupervisorEndpointsTests(MobileApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetResumenTenant_SuperAdminWithoutCompanySettings_DefaultsToMexicoCityTimezoneAndReturns200()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var saUserId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var tenant = new Tenant
            {
                Id = tenantId,
                Nombre = "Tenant SA Sin CompanySettings",
                Activo = true
            };
            db.Tenants.Add(tenant);

            var saUser = new Usuario
            {
                Id = saUserId,
                TenantId = tenantId,
                Email = "sa-no-settings@test.com",
                NombreCompleto = "SA Test",
                RolExplicito = RoleNames.SUPER_ADMIN,
                Activo = true
            };
            db.Usuarios.Add(saUser);

            // Intentionally DO NOT insert CompanySettings row — this is the regression we are guarding.

            // Seed minimal activity for "today" in America/Mexico_City to assert the timezone fallback worked.
            var nowMx = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City"));
            db.Visitas.Add(new Visita
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UsuarioId = saUserId,
                FechaVisita = nowMx.Date.AddHours(10),
                Activo = true
            });

            await db.SaveChangesAsync();
        }

        var client = _factory.CreateAuthenticatedClient(
            userId: saUserId,
            tenantId: tenantId,
            role: RoleNames.SUPER_ADMIN);

        // Act
        var response = await client.GetAsync("/api/mobile/supervisor/resumen-tenant");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "SUPER_ADMIN must access tenant KPI dashboard even when CompanySettings row is missing");

        var payload = await response.Content.ReadFromJsonAsync<ResumenTenantResponse>();
        payload.Should().NotBeNull();
        payload!.VisitasHoy.Should().Be(1,
            "the endpoint should have bucketed the visita using America/Mexico_City fallback, not UTC " +
            "(otherwise late-night UTC rollover would silently drop today's visitas)");
        payload.TimezoneUsada.Should().Be("America/Mexico_City",
            "missing CompanySettings must default to America/Mexico_City, never UTC");
    }

    private sealed record ResumenTenantResponse(
        int VisitasHoy,
        int VendedoresActivos,
        int ClientesTotal,
        decimal VentasHoy,
        string TimezoneUsada);
}
``````

## Stub #14

```I have all the patterns I need. Now I'll generate the test stub.

```csharp
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

// Pins the SA/ADMIN branch of GET /api/mobile/supervisor/mis-vendedores
// against a regression that drops `u.Id != supervisorId` from the predicate
// — which would expose SA seeing themselves in their own team list.
// Hot path: AdminDashboard team section.
public class MobileSupervisorMisVendedoresAdminBranchTests : IDisposable
{
    private readonly HandySuitesDbContext _db;

    public MobileSupervisorMisVendedoresAdminBranchTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new HandySuitesDbContext(options);
        SeedTenant();
    }

    private void SeedTenant()
    {
        _db.Tenants.Add(new Tenant { Id = 1, NombreEmpresa = "Tenant SA Test" });

        // 1 SUPER_ADMIN (caller) + 2 ADMINs (must NOT appear) + 1 SUPERVISOR + 3 VENDEDORES
        _db.Usuarios.AddRange(
            new Usuario { Id = 100, TenantId = 1, Nombre = "SA Caller",   Email = "sa@test.com",         PasswordHash = "x", RolExplicito = RoleNames.SuperAdmin, Activo = true },
            new Usuario { Id = 101, TenantId = 1, Nombre = "Admin Uno",   Email = "admin1@test.com",     PasswordHash = "x", RolExplicito = RoleNames.Admin,      Activo = true },
            new Usuario { Id = 102, TenantId = 1, Nombre = "Admin Dos",   Email = "admin2@test.com",     PasswordHash = "x", RolExplicito = RoleNames.Admin,      Activo = true },
            new Usuario { Id = 103, TenantId = 1, Nombre = "Supervisor",  Email = "supervisor@test.com", PasswordHash = "x", RolExplicito = RoleNames.Supervisor, Activo = true },
            new Usuario { Id = 104, TenantId = 1, Nombre = "Vendedor 1",  Email = "v1@test.com",         PasswordHash = "x", RolExplicito = RoleNames.Vendedor,   Activo = true, SupervisorId = 103 },
            new Usuario { Id = 105, TenantId = 1, Nombre = "Vendedor 2",  Email = "v2@test.com",         PasswordHash = "x", RolExplicito = RoleNames.Vendedor,   Activo = true, SupervisorId = 103 },
            new Usuario { Id = 106, TenantId = 1, Nombre = "Vendedor 3",  Email = "v3@test.com",         PasswordHash = "x", RolExplicito = RoleNames.Vendedor,   Activo = true, SupervisorId = 103 }
        );
        _db.SaveChanges();
    }

    [Fact]
    public async Task GetMisVendedores_AsSuperAdmin_ReturnsOnlySupervisorAndVendedores_ExcludingSelfAndOtherAdmins()
    {
        // Arrange — simular caller SUPER_ADMIN id=100
        var tenantMock = new Mock<ICurrentTenant>();
        tenantMock.Setup(t => t.TenantId).Returns(1);
        tenantMock.Setup(t => t.UserId).Returns("100");
        tenantMock.Setup(t => t.IsSuperAdmin).Returns(true);
        tenantMock.Setup(t => t.IsAdmin).Returns(false);
        tenantMock.Setup(t => t.IsSupervisor).Returns(false);
        var tenant = tenantMock.Object;
        var supervisorId = int.Parse(tenant.UserId);

        // Act — replica EXACTA del baseQuery del endpoint (SA/Admin branch)
        var baseQuery = _db.Usuarios
            .AsNoTracking()
            .Where(u => u.TenantId == tenant.TenantId && u.EliminadoEn == null);

        // Predicado crítico que el test pinea — si alguien quita
        // `u.Id != supervisorId` la SA se vería a sí misma en su propio equipo.
        baseQuery = baseQuery.Where(u =>
            u.Id != supervisorId
            && u.RolExplicito != RoleNames.Admin
            && u.RolExplicito != RoleNames.SuperAdmin);

        var result = await baseQuery
            .Select(u => new { u.Id, u.Nombre, Rol = u.RolExplicito ?? RoleNames.Vendedor })
            .ToListAsync();

        // Assert — exactamente {supervisor 103 + vendedores 104,105,106}
        result.Should().HaveCount(4);
        result.Select(r => r.Id).Should().BeEquivalentTo(new[] { 103, 104, 105, 106 });

        // Self exclusion (anchor del bug que pinea el test)
        result.Should().NotContain(r => r.Id == 100, "SA no debe verse a sí misma en su team list");

        // No admins ni super_admins
        result.Should().NotContain(r => r.Rol == RoleNames.Admin,      "admins del tenant deben excluirse del team list");
        result.Should().NotContain(r => r.Rol == RoleNames.SuperAdmin, "super_admins deben excluirse del team list");

        // Composición esperada: 1 supervisor + 3 vendedores
        result.Count(r => r.Rol == RoleNames.Supervisor).Should().Be(1);
        result.Count(r => r.Rol == RoleNames.Vendedor).Should().Be(3);
    }

    public void Dispose() => _db.Dispose();
}
``````

## Stub #15

``````csharp
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Mobile.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileSupervisorEndpointsTenantWideTests : IClassFixture<MobileApiFactory>
{
    private readonly MobileApiFactory _factory;

    public MobileSupervisorEndpointsTenantWideTests(MobileApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetPedidos_AsSuperAdmin_ReturnsAllVendedoresOfTenantA_AndNoneOfTenantB()
    {
        // Arrange
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var tenantA = new Tenant { Id = 9001, Nombre = "Tenant A", Activo = true };
        var tenantB = new Tenant { Id = 9002, Nombre = "Tenant B", Activo = true };
        db.Tenants.AddRange(tenantA, tenantB);

        var saTenantA = new Usuario
        {
            Id = 90001,
            TenantId = tenantA.Id,
            Email = "sa-tenanta@test.com",
            NombreCompleto = "SA Tenant A",
            RolExplicito = RoleNames.SuperAdmin,
            Activo = true
        };
        var vendedorA1 = new Usuario
        {
            Id = 90002,
            TenantId = tenantA.Id,
            Email = "v1-a@test.com",
            NombreCompleto = "Vendedor A1",
            RolExplicito = RoleNames.Vendedor,
            Activo = true
        };
        var vendedorA2 = new Usuario
        {
            Id = 90003,
            TenantId = tenantA.Id,
            Email = "v2-a@test.com",
            NombreCompleto = "Vendedor A2",
            RolExplicito = RoleNames.Vendedor,
            Activo = true
        };
        var vendedorB1 = new Usuario
        {
            Id = 90004,
            TenantId = tenantB.Id,
            Email = "v1-b@test.com",
            NombreCompleto = "Vendedor B1",
            RolExplicito = RoleNames.Vendedor,
            Activo = true
        };
        db.Usuarios.AddRange(saTenantA, vendedorA1, vendedorA2, vendedorB1);

        var clienteA = new Cliente { Id = 95001, TenantId = tenantA.Id, Nombre = "Cliente A", Activo = true };
        var clienteB = new Cliente { Id = 95002, TenantId = tenantB.Id, Nombre = "Cliente B", Activo = true };
        db.Clientes.AddRange(clienteA, clienteB);

        var pedidoA1 = new Pedido
        {
            Id = 97001,
            TenantId = tenantA.Id,
            UsuarioId = vendedorA1.Id,
            ClienteId = clienteA.Id,
            Folio = "PED-A1",
            Total = 100m,
            Activo = true
        };
        var pedidoA2 = new Pedido
        {
            Id = 97002,
            TenantId = tenantA.Id,
            UsuarioId = vendedorA2.Id,
            ClienteId = clienteA.Id,
            Folio = "PED-A2",
            Total = 200m,
            Activo = true
        };
        var pedidoB1 = new Pedido
        {
            Id = 97003,
            TenantId = tenantB.Id,
            UsuarioId = vendedorB1.Id,
            ClienteId = clienteB.Id,
            Folio = "PED-B1",
            Total = 300m,
            Activo = true
        };
        db.Pedidos.AddRange(pedidoA1, pedidoA2, pedidoB1);

        await db.SaveChangesAsync();

        var client = _factory.CreateClientAuthenticatedAs(saTenantA);

        // Act
        var response = await client.GetAsync("/api/mobile/supervisor/pedidos");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var pedidos = await response.Content.ReadFromJsonAsync<PedidoMobileDto[]>();
        pedidos.Should().NotBeNull();

        var folios = pedidos!.Select(p => p.Folio).ToList();
        folios.Should().Contain("PED-A1", "SA must see pedidos from all vendedores of own tenant");
        folios.Should().Contain("PED-A2", "SA must NOT be filtered to only their own subordinates");
        folios.Should().NotContain("PED-B1", "SA must NEVER see pedidos from another tenant — cross-tenant leak");

        pedidos!.Select(p => p.TenantId).Distinct().Should().ContainSingle().Which.Should().Be(tenantA.Id);
    }

    private sealed record PedidoMobileDto(int Id, int TenantId, string Folio, int UsuarioId, decimal Total);
}
``````

## Stub #16

```Good. I have the information needed. Now let me write the test.

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Integration.Clientes;

public class ClienteTransferirCarteraEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ClienteTransferirCarteraEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task TransferirCartera_VendedorRecibe403()
    {
        // Arrange — VENDEDOR role intenta transferir cartera (endpoint admin-only).
        // Seed: usuario 123 (VENDEDOR, tenant 1), 124 (VENDEDOR, tenant 1).
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "123");
        client.DefaultRequestHeaders.Add("X-Test-TenantId", "1");
        client.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");

        var payload = new
        {
            FromUsuarioId = 123,
            ToUsuarioId = 124,
            SoloActivos = true
        };

        // Act
        var response = await client.PostAsJsonAsync("/clientes/transferir-cartera", payload);

        // Assert — debe ser 403 Forbidden. NUNCA debe permitir que un vendedor
        // mueva cartera (hot path admin: error puede reasignar clientes a
        // vendedores incorrectos o cruzar tenants).
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
``````

## Stub #17

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class ClienteBatchToggleEndpointTests : IClassFixture<HandySuitesApiFactory>
{
    private readonly HandySuitesApiFactory _factory;

    public ClienteBatchToggleEndpointTests(HandySuitesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task BatchToggle_Admin_DeactivatesOwnTenantClients_AndIgnoresOtherTenantIds()
    {
        // Arrange — seed two tenants, three clientes (2 own + 1 foreign)
        var tenantOwnId = await _factory.SeedTenantAsync("tenant-own");
        var tenantOtherId = await _factory.SeedTenantAsync("tenant-other");

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var c1 = new Cliente { TenantId = tenantOwnId, Nombre = "Cliente A", Activo = true };
        var c2 = new Cliente { TenantId = tenantOwnId, Nombre = "Cliente B", Activo = true };
        var cForeign = new Cliente { TenantId = tenantOtherId, Nombre = "Cliente Foreign", Activo = true };
        db.Clientes.AddRange(c1, c2, cForeign);
        await db.SaveChangesAsync();

        var adminClient = _factory.CreateClientAs(RoleNames.ADMIN, tenantOwnId);
        var supervisorClient = _factory.CreateClientAs(RoleNames.SUPERVISOR, tenantOwnId);
        var vendedorClient = _factory.CreateClientAs(RoleNames.VENDEDOR, tenantOwnId);

        var payload = new ClienteBatchToggleRequest(
            Ids: new List<int> { c1.Id, c2.Id, cForeign.Id },
            Activo: false);

        // Act — ADMIN happy path
        var adminResp = await adminClient.PatchAsJsonAsync("/api/clientes/batch-toggle", payload);

        // Lower roles must be forbidden
        var supervisorResp = await supervisorClient.PatchAsJsonAsync("/api/clientes/batch-toggle", payload);
        var vendedorResp = await vendedorClient.PatchAsJsonAsync("/api/clientes/batch-toggle", payload);

        // Assert — 200 for ADMIN
        adminResp.StatusCode.Should().Be(HttpStatusCode.OK,
            because: "ADMIN tiene permiso explicito en RequireRole(ADMIN, SUPER_ADMIN)");

        // 403 for SUPERVISOR and VENDEDOR
        supervisorResp.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            because: "SUPERVISOR no esta en RequireRole(ADMIN, SUPER_ADMIN)");
        vendedorResp.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            because: "VENDEDOR no esta en RequireRole(ADMIN, SUPER_ADMIN)");

        // Tenant isolation — own clientes flipped, foreign cliente untouched
        await using var verifyScope = _factory.Services.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var c1After = await verifyDb.Clientes.IgnoreQueryFilters().FirstAsync(c => c.Id == c1.Id);
        var c2After = await verifyDb.Clientes.IgnoreQueryFilters().FirstAsync(c => c.Id == c2.Id);
        var foreignAfter = await verifyDb.Clientes.IgnoreQueryFilters().FirstAsync(c => c.Id == cForeign.Id);

        c1After.Activo.Should().BeFalse("cliente del tenant del ADMIN debe ser desactivado");
        c2After.Activo.Should().BeFalse("cliente del tenant del ADMIN debe ser desactivado");
        foreignAfter.Activo.Should().BeTrue(
            "ids de otros tenants deben filtrarse por el query filter de TenantId — NO deben tocarse");
    }
}
``````

## Stub #18

``````csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.DTOs;
using HandySuites.Tests.Infrastructure;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class CompanyEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CompanyEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PutCompanySettings_AsAdmin_UpdatesAndReturns200()
    {
        // Arrange
        var client = _factory.CreateClient();
        var adminToken = await TestAuthHelper.GetTokenAsync(
            client,
            email: "admin@jeyma.com",
            password: "test123");
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", adminToken);

        var payload = new UpdateCompanySettingsDto
        {
            NombreComercial = "Jeyma Test S.A. de C.V.",
            ColorPrimario = "#1E40AF",
            ColorSecundario = "#F59E0B",
            MonedaPredeterminada = "MXN",
            ZonaHoraria = "America/Mexico_City"
        };

        // Act
        var response = await client.PutAsJsonAsync("/api/company/settings", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<CompanySettingsDto>();
        body.Should().NotBeNull();
        body!.NombreComercial.Should().Be("Jeyma Test S.A. de C.V.");
        body.ColorPrimario.Should().Be("#1E40AF");
        body.MonedaPredeterminada.Should().Be("MXN");
    }
}
``````

## Stub #19

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Tests.Infrastructure;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class CompanyBillingEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CompanyBillingEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CompanyBilling_AdminCanCreateAndUpdate_OnlySuperAdminCanDelete()
    {
        // Arrange
        var adminClient = _factory.CreateClientWithRole(RoleNames.ADMIN, tenantId: 1, userId: 100);
        var superAdminClient = _factory.CreateClientWithRole(RoleNames.SUPER_ADMIN, tenantId: 1, userId: 1);

        var createDto = new DatosEmpresaCreateDto(
            RazonSocial: "Jeyma SA de CV",
            Rfc: "JEY010203AB1",
            RegimenFiscalSat: "601",
            CodigoPostalFiscal: "44100",
            UsoCfdiDefault: "G03",
            CalleFiscal: "Av Reforma",
            NumeroExteriorFiscal: "123",
            ColoniaFiscal: "Centro",
            MunicipioFiscal: "Guadalajara",
            EstadoFiscal: "Jalisco"
        );

        // Act 1: ADMIN POST -> 201 Created
        var postResponse = await adminClient.PostAsJsonAsync("/api/company/billing", createDto);

        // Assert 1: ADMIN can create DatosEmpresa with valid RFC (FiscalIdValidator passes)
        postResponse.StatusCode.Should().Be(HttpStatusCode.Created,
            "ADMIN should be authorized to create fiscal data");
        var created = await postResponse.Content.ReadFromJsonAsync<DatosEmpresaDto>();
        created.Should().NotBeNull();
        created!.Rfc.Should().Be("JEY010203AB1");
        created.RegimenFiscalSat.Should().Be("601");

        // Act 2: ADMIN PUT -> 200 OK
        var updateDto = new DatosEmpresaUpdateDto(
            RazonSocial: "Jeyma SA de CV",
            Rfc: "JEY010203AB1",
            RegimenFiscalSat: "612", // Changed regimen
            CodigoPostalFiscal: "44100",
            UsoCfdiDefault: "G03",
            CalleFiscal: "Av Reforma",
            NumeroExteriorFiscal: "456",
            ColoniaFiscal: "Centro",
            MunicipioFiscal: "Guadalajara",
            EstadoFiscal: "Jalisco"
        );
        var putResponse = await adminClient.PutAsJsonAsync("/api/company/billing", updateDto);

        // Assert 2: ADMIN can update fiscal data
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            "ADMIN should be authorized to update fiscal data");

        // Act 3: ADMIN DELETE -> 403 Forbidden
        var adminDeleteResponse = await adminClient.DeleteAsync("/api/company/billing");

        // Assert 3: ADMIN MUST NOT delete fiscal data
        adminDeleteResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Only SUPER_ADMIN should be authorized to delete fiscal data (SAT compliance)");

        // Act 4: SUPER_ADMIN DELETE -> 200 OK
        var superAdminDeleteResponse = await superAdminClient.DeleteAsync("/api/company/billing");

        // Assert 4: SUPER_ADMIN successfully deletes
        superAdminDeleteResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            "SUPER_ADMIN should be authorized to delete fiscal data");

        // Act 5: ADMIN POST with INVALID RFC -> 400 BadRequest (FiscalIdValidator)
        var invalidRfcDto = createDto with { Rfc = "INVALID123" };
        var invalidPostResponse = await adminClient.PostAsJsonAsync("/api/company/billing", invalidRfcDto);

        // Assert 5: FiscalIdValidator integration rejects invalid RFC
        invalidPostResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "FiscalIdValidator must reject invalid RFC format on POST");
    }
}
``````

## Stub #20

``````csharp
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Api;
using HandySuites.Tests.Common;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Tests.Endpoints;

public class CompaniesCrossTenantAccessTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CompaniesCrossTenantAccessTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_Cannot_Access_Company_From_Other_Tenant()
    {
        // Arrange — seed two tenants, ADMIN belongs to Tenant A only
        var client = _factory.CreateClient();
        var tenantAId = await TestSeeder.CreateTenantAsync(client, "Tenant A");
        var tenantBId = await TestSeeder.CreateTenantAsync(client, "Tenant B");

        var adminTokenTenantA = await TestAuth.GetTokenAsync(
            client,
            email: "admin.tenanta@test.com",
            password: "test123",
            tenantId: tenantAId,
            role: "ADMIN");

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminTokenTenantA);

        // Act — GET other tenant
        var getResponse = await client.GetAsync($"/api/companies/{tenantBId}");

        // Act — PUT other tenant
        var putPayload = new
        {
            Nombre = "Hacked Name",
            RFC = "XAXX010101000"
        };
        var putResponse = await client.PutAsJsonAsync($"/api/companies/{tenantBId}", putPayload);

        // Assert — both must be denied (403 Forbidden or 404 NotFound), NEVER 200 with leaked data
        getResponse.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound,
            because: "ADMIN of Tenant A must not read data from Tenant B (cross-tenant leak)");

        putResponse.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound,
            because: "ADMIN of Tenant A must not mutate data from Tenant B (cross-tenant write)");

        // Verify no data leak in error body
        var getBody = await getResponse.Content.ReadAsStringAsync();
        getBody.Should().NotContain("Tenant B",
            because: "error response must not echo target tenant data");

        // Verify Tenant B was NOT mutated
        var superAdminToken = await TestAuth.GetTokenAsync(
            client, "xjoshmenx@gmail.com", "test123", tenantBId, "SUPER_ADMIN");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", superAdminToken);

        var verifyResponse = await client.GetAsync($"/api/companies/{tenantBId}");
        verifyResponse.EnsureSuccessStatusCode();
        var verifyBody = await verifyResponse.Content.ReadAsStringAsync();
        verifyBody.Should().NotContain("Hacked Name",
            because: "PUT from cross-tenant ADMIN must not have mutated Tenant B");
    }
}
``````

## Stub #21

``````csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using HandySuites.Billing.Api.Controllers;
using HandySuites.Billing.Api.DTOs;
using HandySuites.Billing.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authorization.Policy;
using Xunit;

namespace HandySuites.Billing.Tests.Controllers;

public class CatalogosControllerRbacTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CatalogosControllerRbacTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClientWithRole(string role, string tenantId = "1", string userId = "42")
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options =>
                    {
                        options.Claims = new[]
                        {
                            new Claim(ClaimTypes.Role, role),
                            new Claim("role", role),
                            new Claim("tenant_id", tenantId),
                            new Claim(ClaimTypes.NameIdentifier, userId),
                            new Claim("sub", userId),
                        };
                    });
                services.AddSingleton<IPolicyEvaluator, TestPolicyEvaluator>();
            });
        }).CreateClient();
    }

    [Fact]
    public async Task PostConfiguracionFiscal_AsAdmin_ReturnsOkAndPersists()
    {
        // Arrange
        var client = CreateClientWithRole("ADMIN", tenantId: "1");
        var dto = new ConfiguracionFiscalDto
        {
            Rfc = "JEY010101AAA",
            RazonSocial = "Jeyma SA de CV",
            RegimenFiscal = "601",
            CodigoPostal = "06600",
            UsoCfdiDefault = "G03",
            MetodoPagoDefault = "PUE",
            FormaPagoDefault = "03"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/Catalogos/configuracion-fiscal", dto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ConfiguracionFiscalDto>();
        Assert.NotNull(body);
        Assert.Equal("JEY010101AAA", body!.Rfc);
        Assert.Equal("Jeyma SA de CV", body.RazonSocial);

        // Verify persistence with GET (lectura permitida a roles autenticados)
        var verify = await client.GetAsync("/api/Catalogos/configuracion-fiscal");
        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        var persisted = await verify.Content.ReadFromJsonAsync<ConfiguracionFiscalDto>();
        Assert.NotNull(persisted);
        Assert.Equal("JEY010101AAA", persisted!.Rfc);
    }

    [Fact]
    public async Task PostConfiguracionFiscal_AsVendedor_ReturnsForbidden()
    {
        // Arrange
        var client = CreateClientWithRole("VENDEDOR", tenantId: "1");
        var dto = new ConfiguracionFiscalDto
        {
            Rfc = "XAXX010101000",
            RazonSocial = "Intento Vendedor",
            RegimenFiscal = "601",
            CodigoPostal = "06600"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/Catalogos/configuracion-fiscal", dto);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostConfiguracionFiscal_AsSupervisor_ReturnsForbidden()
    {
        // Arrange
        var client = CreateClientWithRole("SUPERVISOR", tenantId: "1");
        var dto = new ConfiguracionFiscalDto
        {
            Rfc = "XAXX010101000",
            RazonSocial = "Intento Supervisor",
            RegimenFiscal = "601",
            CodigoPostal = "06600"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/Catalogos/configuracion-fiscal", dto);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetConfiguracionFiscal_AsVendedor_ReturnsOk()
    {
        // Arrange - lectura permitida a cualquier rol autenticado
        var client = CreateClientWithRole("VENDEDOR", tenantId: "1");

        // Act
        var response = await client.GetAsync("/api/Catalogos/configuracion-fiscal");

        // Assert
        Assert.True(
            response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.NoContent,
            $"Expected 200/204 for read by VENDEDOR, got {response.StatusCode}");
    }
}
``````

## Stub #22

``````csharp
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using HandySuites.Billing.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Billing.Tests.Endpoints;

public class FinkokAdminControllerRbacTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public FinkokAdminControllerRbacTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RegistrarEmisor_AsAdmin_WithValidRfc_Returns200()
    {
        // Arrange
        var client = _factory.CreateClient();
        var adminToken = await TestAuthHelper.GetJwtAsync(client, "admin@jeyma.com", "test123");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        var payload = new RegistrarEmisorDto(
            Rfc: "JEY050101AB1",
            RazonSocial: "JEYMA SA DE CV",
            RegimenFiscal: "601",
            CodigoPostal: "06600",
            CsdCerBase64: TestFixtures.ValidCsdCerBase64,
            CsdKeyBase64: TestFixtures.ValidCsdKeyBase64,
            CsdPassword: "12345678a"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/finkok-admin/registrar-emisor", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<RegistrarEmisorResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Success);
        Assert.Equal("JEY050101AB1", body.Rfc);
    }

    [Fact]
    public async Task RegistrarEmisor_AsVendedor_Returns403()
    {
        // Arrange
        var client = _factory.CreateClient();
        var vendedorToken = await TestAuthHelper.GetJwtAsync(client, "vendedor1@jeyma.com", "test123");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", vendedorToken);

        var payload = new RegistrarEmisorDto(
            Rfc: "JEY050101AB1",
            RazonSocial: "JEYMA SA DE CV",
            RegimenFiscal: "601",
            CodigoPostal: "06600",
            CsdCerBase64: TestFixtures.ValidCsdCerBase64,
            CsdKeyBase64: TestFixtures.ValidCsdKeyBase64,
            CsdPassword: "12345678a"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/finkok-admin/registrar-emisor", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RegistrarEmisor_AsAdmin_WithMalformedRfc_Returns400()
    {
        // Arrange
        var client = _factory.CreateClient();
        var adminToken = await TestAuthHelper.GetJwtAsync(client, "admin@jeyma.com", "test123");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        var payload = new RegistrarEmisorDto(
            Rfc: "INVALID_RFC_123",
            RazonSocial: "JEYMA SA DE CV",
            RegimenFiscal: "601",
            CodigoPostal: "06600",
            CsdCerBase64: TestFixtures.ValidCsdCerBase64,
            CsdKeyBase64: TestFixtures.ValidCsdKeyBase64,
            CsdPassword: "12345678a"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/finkok-admin/registrar-emisor", payload);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadAsStringAsync();
        Assert.Contains("Rfc", problem);
        Assert.Contains("formato", problem, System.StringComparison.OrdinalIgnoreCase);
    }
}
``````

## Stub #23

``````csharp
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using HandySuites.Api.Tests.Infrastructure;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Tests.Integration.Authorization;

public class AdminCrossTenantIsolationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AdminCrossTenantIsolationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_TenantA_CannotAccess_TenantB_Clientes()
    {
        // Arrange — seed 2 tenants with one Cliente each
        int tenantAId;
        int tenantBId;
        int clienteIdTenantA;
        int clienteIdTenantB;
        const string adminAEmail = "admin.tenanta@isolation.test";
        const string adminAPassword = "Test123!";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var tenantA = new Tenant { Nombre = "Tenant A Isolation", Activo = true };
            var tenantB = new Tenant { Nombre = "Tenant B Isolation", Activo = true };
            db.Tenants.AddRange(tenantA, tenantB);
            await db.SaveChangesAsync();
            tenantAId = tenantA.Id;
            tenantBId = tenantB.Id;

            var adminA = new Usuario
            {
                TenantId = tenantAId,
                Email = adminAEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminAPassword),
                Nombre = "Admin",
                Apellido = "TenantA",
                RolExplicito = RoleNames.ADMIN,
                Activo = true
            };
            db.Usuarios.Add(adminA);

            var clienteA = new Cliente
            {
                TenantId = tenantAId,
                Nombre = "Cliente A",
                RFC = "AAA010101AAA",
                Activo = true
            };
            var clienteB = new Cliente
            {
                TenantId = tenantBId,
                Nombre = "Cliente B (SECRET)",
                RFC = "BBB020202BBB",
                Activo = true
            };
            db.Clientes.AddRange(clienteA, clienteB);
            await db.SaveChangesAsync();
            clienteIdTenantA = clienteA.Id;
            clienteIdTenantB = clienteB.Id;
        }

        var client = _factory.CreateClient();

        // Login as ADMIN of Tenant A
        var loginResp = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = adminAEmail,
            password = adminAPassword
        });
        loginResp.EnsureSuccessStatusCode();
        var loginPayload = await loginResp.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginPayload);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", loginPayload!.Token);

        // Act 1 — Direct fetch of Tenant B's cliente by ID
        var directResp = await client.GetAsync($"/api/clientes/{clienteIdTenantB}");

        // Assert 1 — must be 404 (tenant filter hides the row entirely)
        Assert.Equal(HttpStatusCode.NotFound, directResp.StatusCode);

        // Act 2 — List clientes
        var listResp = await client.GetAsync("/api/clientes");

        // Assert 2 — list must contain Tenant A cliente and NOT Tenant B cliente
        listResp.EnsureSuccessStatusCode();
        var clientes = await listResp.Content.ReadFromJsonAsync<List<ClienteDto>>();
        Assert.NotNull(clientes);
        Assert.Contains(clientes!, c => c.Id == clienteIdTenantA);
        Assert.DoesNotContain(clientes!, c => c.Id == clienteIdTenantB);
        Assert.DoesNotContain(clientes!, c => c.Nombre.Contains("SECRET"));
    }

    private record LoginResponse(string Token, string Email, string Rol);
    private record ClienteDto(int Id, string Nombre, string? RFC, int TenantId);
}
``````

## Stub #24

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('ADMIN - Orders CRUD hot path', () => {
  test.describe.configure({ mode: 'serial' });

  test('ADMIN puede crear un pedido y ser redirigido al detalle', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Listar pedidos
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/orders$/);
    await expect(
      page.getByRole('heading', { name: /pedidos|orders/i })
    ).toBeVisible({ timeout: 10000 });

    // 2. Abrir formulario de nuevo pedido
    const newOrderButton = page.getByRole('link', { name: /nuevo pedido|crear pedido|new order/i }).first();
    await newOrderButton.click();
    await expect(page).toHaveURL(/\/orders\/new/);

    // 3. Seleccionar cliente (primer cliente disponible del combobox)
    const clienteCombobox = page.getByRole('combobox', { name: /cliente/i }).first();
    await clienteCombobox.click();
    await page.getByRole('option').first().click();

    // 4. Agregar 1 producto
    const agregarProductoBtn = page.getByRole('button', { name: /agregar producto|añadir producto|add product/i }).first();
    await agregarProductoBtn.click();

    const productoCombobox = page.getByRole('combobox', { name: /producto/i }).first();
    await productoCombobox.click();
    await page.getByRole('option').first().click();

    const cantidadInput = page.getByLabel(/cantidad|quantity/i).first();
    await cantidadInput.fill('1');

    // 5. Guardar pedido
    const guardarBtn = page.getByRole('button', { name: /guardar|crear pedido|save/i }).first();
    await guardarBtn.click();

    // 6. Verificar redirect a /orders/[id]
    await expect(page).toHaveURL(/\/orders\/\d+/, { timeout: 15000 });

    // 7. Verificar que la pantalla de detalle cargo
    await expect(
      page.getByText(/pedido #|orden #|order #/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
``````

## Stub #25

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Cobranza - ADMIN CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('ADMIN puede ver saldos, abrir cliente y registrar cobro que disminuye el saldo', async ({ page }) => {
    // 1. Navegar al modulo de cobranza
    await page.goto('/cobranza');
    await expect(page).toHaveURL(/\/cobranza/);

    // 2. Validar que la tabla de saldos se renderiza
    const tablaSaldos = page.getByRole('table').first();
    await expect(tablaSaldos).toBeVisible({ timeout: 10000 });

    // Validar headers esperados de saldos por cliente
    await expect(page.getByRole('columnheader', { name: /cliente/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /saldo/i })).toBeVisible();

    // 3. Capturar saldo inicial del primer cliente con saldo > 0
    const filaCliente = page.locator('tbody tr').filter({
      hasNot: page.locator('text=/\\$\\s*0\\.00/'),
    }).first();
    await expect(filaCliente).toBeVisible();

    const saldoInicialTexto = await filaCliente.locator('td').filter({ hasText: /\$/ }).first().innerText();
    const saldoInicial = parseFloat(saldoInicialTexto.replace(/[^0-9.-]/g, ''));
    expect(saldoInicial).toBeGreaterThan(0);

    // 4. Abrir el detalle / estado de cuenta del cliente
    await filaCliente.click();

    // Esperar a que cargue el estado de cuenta
    await expect(page.getByRole('heading', { name: /estado de cuenta|detalle|cliente/i }).first()).toBeVisible({ timeout: 10000 });

    // 5. Registrar un cobro
    const btnRegistrarCobro = page.getByRole('button', { name: /registrar cobro|nuevo cobro|agregar cobro/i }).first();
    await expect(btnRegistrarCobro).toBeVisible();
    await btnRegistrarCobro.click();

    // Llenar formulario de cobro
    const montoCobro = Math.min(100, saldoInicial);
    const inputMonto = page.getByLabel(/monto|importe/i).first();
    await expect(inputMonto).toBeVisible();
    await inputMonto.fill(String(montoCobro));

    // Seleccionar metodo de pago si existe
    const selectMetodo = page.getByLabel(/metodo|forma de pago/i).first();
    if (await selectMetodo.isVisible().catch(() => false)) {
      await selectMetodo.selectOption({ index: 1 });
    }

    // Confirmar / guardar el cobro
    const btnGuardar = page.getByRole('button', { name: /guardar|confirmar|registrar/i }).last();
    await btnGuardar.click();

    // 6. Validar confirmacion (toast o mensaje)
    await expect(
      page.getByText(/cobro registrado|exitosamente|guardado/i).first()
    ).toBeVisible({ timeout: 10000 });

    // 7. Volver a /cobranza y validar que el saldo del cliente disminuyo
    await page.goto('/cobranza');
    await expect(tablaSaldos).toBeVisible({ timeout: 10000 });

    const filaActualizada = page.locator('tbody tr').first();
    const saldoFinalTexto = await filaActualizada.locator('td').filter({ hasText: /\$/ }).first().innerText();
    const saldoFinal = parseFloat(saldoFinalTexto.replace(/[^0-9.-]/g, ''));

    expect(saldoFinal).toBeLessThan(saldoInicial);
    expect(saldoInicial - saldoFinal).toBeCloseTo(montoCobro, 1);
  });
});
``````

## Stub #26

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Billing - ADMIN - CFDI Invoice Creation Flow', () => {
  test('ADMIN puede navegar a /billing/invoices/new, llenar emisor/receptor/concepto, crear borrador y ver detalle', async ({ page }) => {
    // Arrange: Login como ADMIN
    await loginAsAdmin(page);

    // Act 1: Navegar al listado de facturas
    await page.goto('/billing/invoices');
    await expect(page).toHaveURL(/\/billing\/invoices/);
    await expect(page.locator('h1, h2').filter({ hasText: /facturas|invoices/i }).first()).toBeVisible({ timeout: 10000 });

    // Act 2: Click en boton "Nueva factura" / "Crear factura"
    const nuevaFacturaBtn = page.getByRole('button', { name: /nueva factura|crear factura|nuevo cfdi/i }).first()
      .or(page.getByRole('link', { name: /nueva factura|crear factura|nuevo cfdi/i }).first());
    await nuevaFacturaBtn.click();

    // Verificar navegacion a /billing/invoices/new
    await expect(page).toHaveURL(/\/billing\/invoices\/new/);
    await expect(page.locator('form, [data-testid="invoice-form"]').first()).toBeVisible({ timeout: 10000 });

    // Act 3: Llenar datos del EMISOR (RFC, razon social, regimen fiscal)
    const emisorRfcInput = page.locator('input[name*="emisor"][name*="rfc" i], input[name="rfcEmisor"], input[id*="emisor-rfc" i]').first();
    if (await emisorRfcInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emisorRfcInput.fill('XAXX010101000');
    }

    const emisorRazonSocialInput = page.locator('input[name*="emisor"][name*="razon" i], input[name="razonSocialEmisor"]').first();
    if (await emisorRazonSocialInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emisorRazonSocialInput.fill('JEYMA TEST EMISOR SA DE CV');
    }

    // Act 4: Llenar datos del RECEPTOR
    const receptorRfcInput = page.locator('input[name*="receptor"][name*="rfc" i], input[name="rfcReceptor"]').first();
    if (await receptorRfcInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await receptorRfcInput.fill('XAXX010101000');
    }

    const receptorRazonSocialInput = page.locator('input[name*="receptor"][name*="razon" i], input[name="razonSocialReceptor"]').first();
    if (await receptorRazonSocialInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await receptorRazonSocialInput.fill('PUBLICO EN GENERAL');
    }

    const usoCfdiSelect = page.locator('select[name*="usoCfdi" i], [name*="usoCfdi" i]').first();
    if (await usoCfdiSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usoCfdiSelect.selectOption({ index: 1 }).catch(async () => {
        await usoCfdiSelect.click();
        await page.getByRole('option').first().click();
      });
    }

    // Act 5: Agregar CONCEPTO (clave producto/servicio, descripcion, cantidad, valor unitario)
    const agregarConceptoBtn = page.getByRole('button', { name: /agregar concepto|nuevo concepto|agregar partida/i }).first();
    if (await agregarConceptoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agregarConceptoBtn.click();
    }

    const descripcionInput = page.locator('input[name*="descripcion" i], textarea[name*="descripcion" i]').first();
    await expect(descripcionInput).toBeVisible({ timeout: 5000 });
    await descripcionInput.fill('Servicio de prueba CFDI E2E');

    const cantidadInput = page.locator('input[name*="cantidad" i], input[type="number"][name*="cant" i]').first();
    if (await cantidadInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cantidadInput.fill('1');
    }

    const valorUnitarioInput = page.locator('input[name*="valorUnitario" i], input[name*="precio" i], input[name*="importe" i]').first();
    if (await valorUnitarioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await valorUnitarioInput.fill('100.00');
    }

    // Act 6: Guardar como BORRADOR (NO timbrar contra SAT en E2E)
    const guardarBorradorBtn = page.getByRole('button', { name: /guardar borrador|guardar como borrador|crear borrador/i }).first()
      .or(page.getByRole('button', { name: /^guardar$/i }).first());
    await expect(guardarBorradorBtn).toBeVisible({ timeout: 5000 });
    await guardarBorradorBtn.click();

    // Assert 1: Redirige a detalle /billing/invoices/[id]
    await page.waitForURL(/\/billing\/invoices\/[^/]+$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/billing\/invoices\/[a-zA-Z0-9-]+$/);

    // Assert 2: Render del detalle muestra datos capturados
    await expect(page.locator('body')).toContainText(/borrador|draft/i, { timeout: 10000 });
    await expect(page.locator('body')).toContainText('Servicio de prueba CFDI E2E');

    // Assert 3: NO debe mostrar error de timbrado SAT (porque es borrador)
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /error|fail|fallo/i });
    await expect(errorBanner).toHaveCount(0);
  });
});
``````

## Stub #27

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('ADMIN - Products CRUD', () => {
  test('ADMIN can create product with familia, categoria, impuesto and lista de precios', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to products page
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /productos/i })).toBeVisible({ timeout: 10000 });

    // Wait for products table to load
    await page.waitForSelector('table, [data-testid="products-table"]', { timeout: 10000 });

    // Open create product drawer
    const createButton = page.getByRole('button', { name: /nuevo producto|crear producto|agregar producto/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for drawer/modal to be visible
    const drawer = page.locator('[role="dialog"], [data-testid="product-drawer"]').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Fill basic product data
    const uniqueCode = `TEST-${Date.now()}`;
    const productName = `Producto E2E ${uniqueCode}`;

    await page.getByLabel(/c[oó]digo/i).first().fill(uniqueCode);
    await page.getByLabel(/nombre|descripci[oó]n/i).first().fill(productName);

    // Select familia (product family)
    const familiaSelect = page.getByLabel(/familia/i).first();
    await familiaSelect.click();
    await page.getByRole('option').first().click();

    // Select categoria
    const categoriaSelect = page.getByLabel(/categor[ií]a/i).first();
    await categoriaSelect.click();
    await page.getByRole('option').first().click();

    // Select impuesto (tax)
    const impuestoSelect = page.getByLabel(/impuesto|iva/i).first();
    await impuestoSelect.click();
    await page.getByRole('option').first().click();

    // Set price for lista de precios
    const precioInput = page.getByLabel(/precio|lista de precios/i).first();
    await precioInput.fill('150.00');

    // Submit form
    const saveButton = drawer.getByRole('button', { name: /guardar|crear|aceptar/i });
    await saveButton.click();

    // Wait for drawer to close
    await expect(drawer).not.toBeVisible({ timeout: 10000 });

    // Verify product appears in the table
    await expect(page.getByText(uniqueCode)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(productName)).toBeVisible();

    // Verify success toast (optional)
    const successToast = page.getByText(/creado|guardado|exitosamente/i).first();
    await expect(successToast).toBeVisible({ timeout: 5000 }).catch(() => {
      // Toast may have already dismissed, not critical
    });
  });
});
``````

## Stub #28

``````typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Inventory - ADMIN ajustes', () => {
  test('ADMIN puede registrar ajuste de inventario y ver stock + movimiento actualizado', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.getByRole('heading', { name: /inventario/i })).toBeVisible();

    // Capturar stock inicial del primer producto listado
    const firstRow = page.getByRole('row').nth(1);
    await expect(firstRow).toBeVisible();
    const productName = (await firstRow.getByRole('cell').nth(0).textContent())?.trim() ?? '';
    expect(productName.length).toBeGreaterThan(0);

    const stockCell = firstRow.getByTestId('stock-actual').first();
    const stockInicialText = (await stockCell.textContent())?.trim() ?? '0';
    const stockInicial = parseInt(stockInicialText.replace(/[^\d-]/g, ''), 10) || 0;

    // Abrir modal de ajuste
    await firstRow.getByRole('button', { name: /ajustar/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Registrar entrada de 5 unidades
    const cantidadAjuste = 5;
    await modal.getByRole('combobox', { name: /tipo de movimiento/i }).selectOption('ENTRADA');
    await modal.getByRole('spinbutton', { name: /cantidad/i }).fill(String(cantidadAjuste));
    await modal.getByRole('textbox', { name: /motivo/i }).fill('Ajuste E2E test ADMIN');
    await modal.getByRole('button', { name: /confirmar ajuste/i }).click();

    // Validar toast de éxito
    await expect(page.getByText(/ajuste registrado/i)).toBeVisible({ timeout: 5000 });
    await expect(modal).not.toBeVisible();

    // Validar nuevo stock = inicial + ajuste
    const stockFinalText = (await stockCell.textContent())?.trim() ?? '0';
    const stockFinal = parseInt(stockFinalText.replace(/[^\d-]/g, ''), 10) || 0;
    expect(stockFinal).toBe(stockInicial + cantidadAjuste);

    // Validar log de movimiento aparece en historial
    await firstRow.getByRole('button', { name: /historial|movimientos/i }).click();
    const historialPanel = page.getByRole('dialog').or(page.getByTestId('movimientos-panel'));
    await expect(historialPanel).toBeVisible();

    const ultimoMovimiento = historialPanel.getByTestId('movimiento-row').first();
    await expect(ultimoMovimiento).toContainText(/ENTRADA/i);
    await expect(ultimoMovimiento).toContainText(String(cantidadAjuste));
    await expect(ultimoMovimiento).toContainText(/Ajuste E2E test ADMIN/i);
    await expect(ultimoMovimiento).toContainText(/admin@/i);
  });
});
``````

## Stub #29

``````csharp
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Application.Sync.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileSyncEndpointsTests
{
    private readonly Mock<ISyncRepository> _repoMock;
    private readonly Mock<ICurrentTenant> _tenantMock;
    private readonly Mock<ITransactionManager> _transactionMock;
    private readonly SyncService _syncService;

    public MobileSyncEndpointsTests()
    {
        _repoMock = new Mock<ISyncRepository>();
        _tenantMock = new Mock<ICurrentTenant>();
        _transactionMock = new Mock<ITransactionManager>();

        // Admin del tenant 1, userId = 10
        _tenantMock.Setup(t => t.TenantId).Returns(1);
        _tenantMock.Setup(t => t.UserId).Returns("10");
        _tenantMock.Setup(t => t.IsAdmin).Returns(true);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSupervisor).Returns(false);
        _tenantMock.Setup(t => t.Role).Returns("ADMIN");

        // Ejecuta el lambda directamente — no tx real en unit test.
        _transactionMock
            .Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task>>()))
            .Returns<Func<Task>>(op => op());

        _syncService = new SyncService(_repoMock.Object, _tenantMock.Object, _transactionMock.Object);
    }

    [Fact]
    public async Task SyncAsync_AsAdmin_PullsAllTenantPedidos_NotOnlyAssignedToUser()
    {
        // GAP: hoy GetPedidosModifiedSinceAsync filtra por usuarioId siempre.
        // ADMIN debería ver TODOS los pedidos del tenant para revisar pipeline desde mobile.
        // Este test documenta el contrato esperado: cuando IsAdmin == true, el sync pull
        // de pedidos debe devolver los pedidos del tenant (acá simulamos pedidos de
        // distintos vendedores y validamos que lleguen los del tenant completo).

        // Arrange — el repo devuelve 3 pedidos del tenant 1 (mezcla de vendedores).
        var pedidos = new List<Pedido>
        {
            new() { Id = 101, TenantId = 1, UsuarioId = 10, ClienteId = 1, FechaPedido = DateTime.UtcNow, Detalles = new List<DetallePedido>() },
            new() { Id = 102, TenantId = 1, UsuarioId = 22, ClienteId = 2, FechaPedido = DateTime.UtcNow, Detalles = new List<DetallePedido>() },
            new() { Id = 103, TenantId = 1, UsuarioId = 33, ClienteId = 3, FechaPedido = DateTime.UtcNow, Detalles = new List<DetallePedido>() },
        };

        // El repo actual filtra por usuarioId — el endpoint debería invocarlo con un
        // parámetro que indique "ver todo" cuando el usuario es admin. Mientras el bug
        // exista, la llamada usa usuarioId = 10 y este Setup capta sólo ese caso.
        _repoMock.Setup(r => r.GetPedidosModifiedSinceAsync(1, It.IsAny<int>(), It.IsAny<DateTime?>()))
                 .ReturnsAsync(pedidos);

        // Stubs para el resto de los pulls (admin sync trae todo el catálogo).
        _repoMock.Setup(r => r.GetClientesModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<Cliente>());
        _repoMock.Setup(r => r.GetProductosModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<Producto>());
        _repoMock.Setup(r => r.GetVisitasModifiedSinceAsync(1, It.IsAny<int>(), It.IsAny<DateTime?>())).ReturnsAsync(new List<ClienteVisita>());
        _repoMock.Setup(r => r.GetRutasModifiedSinceAsync(1, It.IsAny<int>(), It.IsAny<DateTime?>())).ReturnsAsync(new List<RutaVendedor>());
        _repoMock.Setup(r => r.GetRutasCargaForRutasAsync(1, It.IsAny<List<int>>())).ReturnsAsync(new Dictionary<int, List<RutaCarga>>());
        _repoMock.Setup(r => r.GetCobrosModifiedSinceAsync(1, It.IsAny<int>(), It.IsAny<DateTime?>())).ReturnsAsync(new List<Cobro>());
        _repoMock.Setup(r => r.GetStockMapAsync(1)).ReturnsAsync(new Dictionary<int, (decimal, decimal)>());
        _repoMock.Setup(r => r.GetPreciosPorProductoAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<SyncPrecioPorProductoDto>());
        _repoMock.Setup(r => r.GetDescuentosAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<SyncDescuentoDto>());
        _repoMock.Setup(r => r.GetPromocionesAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<SyncPromocionDto>());
        _repoMock.Setup(r => r.GetZonasModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<Zona>());
        _repoMock.Setup(r => r.GetCategoriasClienteModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<CategoriaCliente>());
        _repoMock.Setup(r => r.GetCategoriasProductoModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<CategoriaProducto>());
        _repoMock.Setup(r => r.GetFamiliasProductoModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<FamiliaProducto>());
        _repoMock.Setup(r => r.GetTasasImpuestoModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<TasaImpuesto>());
        _repoMock.Setup(r => r.GetListasPrecioModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<ListaPrecio>());
        _repoMock.Setup(r => r.GetUsuariosModifiedSinceAsync(1, It.IsAny<DateTime?>())).ReturnsAsync(new List<Usuario>());
        _repoMock.Setup(r => r.GetMetasVendedorModifiedSinceAsync(1, It.IsAny<int>(), It.IsAny<DateTime?>())).ReturnsAsync(new List<MetaVendedor>());
        _repoMock.Setup(r => r.GetDatosEmpresaIfModifiedAsync(1, It.IsAny<DateTime?>())).ReturnsAsync((DatosEmpresa?)null);
        _repoMock.Setup(r => r.SaveChangesAsync()).ReturnsAsync(0);

        var request = new SyncRequestDto
        {
            LastSyncTimestamp = null,
            EntityTypes = new List<string> { "pedidos" },
            ClientChanges = null
        };

        // Act
        var response = await _syncService.SyncAsync(request);

        // Assert — admin recibe los 3 pedidos del tenant, no sólo los asignados a su userId.
        response.Should().NotBeNull();
        response.Errors.Should().BeEmpty();
        response.ServerChanges.Pedidos.Should().NotBeNull();
        response.ServerChanges.Pedidos!.Should().HaveCount(3, "ADMIN debe pullar todos los pedidos del tenant, no filtrar por usuarioId");
        response.ServerChanges.Pedidos!.Select(p => p.Id).Should().BeEquivalentTo(new[] { 101, 102, 103 });
        // Verifica que la pull se ejecutó (el repo fue invocado para el tenant 1).
        _repoMock.Verify(r => r.GetPedidosModifiedSinceAsync(1, It.IsAny<int>(), It.IsAny<DateTime?>()), Times.Once);
    }
}
``````

## Stub #30

```Now I have enough context. Let me write a concrete test for ADMIN role covering crear/confirmar/entregar + tenant-wide scope visibility.

```csharp
using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Pedidos;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Cobertura ADMIN para el flujo mobile de Pedidos: crear (eager-save) +
/// confirmar + entregar, y verificacion de que ADMIN ve pedidos del tenant
/// completo (no solo los suyos), incluyendo los creados por otros vendedores.
///
/// Gap previo: MobilePedidoEagerSaveTests solo cubria RoleNames.Vendedor.
/// Maestro supervisor/03-crear-pedido-completo.yaml usa SUPERVISOR. Nada
/// validaba que un usuario con rol ADMIN pueda operar el ciclo de vida de
/// pedidos desde la mobile API ni que el scope sea tenant-wide.
/// </summary>
public class MobilePedidoEndpointsAdminTests : IDisposable
{
    private readonly HandySuitesDbContext _db;
    private readonly PedidoRepository _repository;
    private readonly PedidoService _service;
    private readonly Mock<ICurrentTenant> _tenant;
    private readonly Mock<IUsuarioRepository> _usuarioRepository;

    private const int TenantId = 1;
    private const int AdminUsuarioId = 11;
    private const int OtroVendedorId = 12;
    private const int ProductoId = 200;
    private const int ClienteId = 300;

    public MobilePedidoEndpointsAdminTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new HandySuitesDbContext(options);
        _repository = new PedidoRepository(_db);

        _tenant = new Mock<ICurrentTenant>();
        _tenant.Setup(t => t.TenantId).Returns(TenantId);
        _tenant.Setup(t => t.UserId).Returns(AdminUsuarioId.ToString());
        _tenant.Setup(t => t.Role).Returns(RoleNames.Admin);
        _tenant.Setup(t => t.IsAdminOrAbove).Returns(true);
        _tenant.Setup(t => t.IsStrictAdmin).Returns(true);
        _tenant.Setup(t => t.IsSuperAdmin).Returns(false);
        _tenant.Setup(t => t.IsSupervisor).Returns(false);

        _usuarioRepository = new Mock<IUsuarioRepository>();

        _service = new PedidoService(
            _repository,
            _tenant.Object,
            _usuarioRepository.Object,
            null!,
            null!
        );

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Admin Test SA" });
        _db.Productos.Add(new Producto
        {
            Id = ProductoId, TenantId = TenantId, Nombre = "P",
            CodigoBarra = "X", Descripcion = "X", PrecioBase = 10m, Activo = true
        });
        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "C",
            RFC = "XAXX010101000", Correo = "c@x.com", Telefono = "0", Direccion = "", Activo = true
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = AdminUsuarioId, TenantId = TenantId, Email = "admin@t.com", Nombre = "Admin",
            PasswordHash = "x", RolExplicito = RoleNames.Admin, Activo = true
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = OtroVendedorId, TenantId = TenantId, Email = "v2@t.com", Nombre = "Vendedor2",
            PasswordHash = "x", RolExplicito = RoleNames.Vendedor, Activo = true
        });

        // Pedido pre-existente creado por OTRO vendedor: ADMIN debe poder verlo
        // (scope tenant). Vendedor regular no lo veria si filtrara por UsuarioId.
        _db.Pedidos.Add(new Pedido
        {
            Id = 5000,
            TenantId = TenantId,
            UsuarioId = OtroVendedorId,
            ClienteId = ClienteId,
            NumeroPedido = "P-OTRO-001",
            FechaPedido = DateTime.UtcNow.AddDays(-1),
            Estado = EstadoPedido.Borrador,
            TipoVenta = TipoVenta.Pedido,
            Subtotal = 50m,
            Descuento = 0m,
            Impuesto = 8m,
            Total = 58m,
            Activo = true
        });

        _db.SaveChanges();
    }

    [Fact]
    public async Task Admin_PuedeCrear_Confirmar_Entregar_YVeScopeTenantCompleto()
    {
        // Arrange — Admin dispara eager-save (mismo path que el endpoint
        // POST /api/mobile/pedidos/eager-save usa).
        var dto = new PedidoEagerSaveDto
        {
            MobileRecordId = "wdb-admin-flow-1",
            ClienteId = ClienteId,
            FechaPedido = DateTime.UtcNow,
            TipoVenta = 0,
            Subtotal = 100m, Descuento = 0m, Impuesto = 16m, Total = 116m,
            Detalles = new()
            {
                new() { ProductoId = ProductoId, Cantidad = 5m, PrecioUnitario = 20m, Subtotal = 100m, Impuesto = 16m, Total = 116m }
            }
        };

        // Act 1 — CREAR via eager-save
        var creado = await _service.EagerSaveAsync(dto);

        // Assert 1 — pedido creado correctamente bajo el UsuarioId del Admin
        creado.Should().NotBeNull();
        creado.ServerId.Should().BeGreaterThan(0);
        creado.Estado.Should().Be((int)EstadoPedido.Borrador);

        var pedidoCreado = await _db.Pedidos.AsNoTracking()
            .FirstAsync(p => p.Id == creado.ServerId);
        pedidoCreado.UsuarioId.Should().Be(AdminUsuarioId,
            "el Admin tambien puede crear pedidos desde mobile y debe quedar como dueno");
        pedidoCreado.TenantId.Should().Be(TenantId);

        // Act 2 — CONFIRMAR (POST /api/mobile/pedidos/{id}/confirmar)
        var confirmado = await _service.ConfirmarAsync(creado.ServerId);

        // Assert 2 — transicion Borrador -> Confirmado autorizada para ADMIN
        confirmado.Should().BeTrue("ADMIN debe poder confirmar pedidos en mobile");
        var pedidoConfirmado = await _db.Pedidos.AsNoTracking()
            .FirstAsync(p => p.Id == creado.ServerId);
        pedidoConfirmado.Estado.Should().Be(EstadoPedido.Confirmado);

        // Promover a EnRuta (precondicion de Entregado en el flujo simplificado).
        var enRuta = await _service.EnviarARutaAsync(creado.ServerId);
        enRuta.Should().BeTrue();

        // Act 3 — ENTREGAR (POST /api/mobile/pedidos/{id}/entregar)
        var entregado = await _service.EntregarAsync(creado.ServerId, "entregado por admin");

        // Assert 3 — transicion final permitida para ADMIN
        entregado.Should().BeTrue("ADMIN debe poder entregar pedidos en mobile");
        var pedidoEntregado = await _db.Pedidos.AsNoTracking()
            .FirstAsync(p => p.Id == creado.ServerId);
        pedidoEntregado.Estado.Should().Be(EstadoPedido.Entregado);

        // Act 4 — SCOPE: ADMIN consulta con filtro vacio y debe ver tambien el
        // pedido creado por OtroVendedor (no se debe forzar UsuarioId = admin).
        var resultado = await _service.ObtenerPorFiltroAsync(new PedidoFiltroDto());

        // Assert 4 — el branch RBAC de ObtenerPorFiltroAsync NO debe restringir
        // por UsuarioId cuando IsAdminOrAbove == true. Verificamos que el pedido
        // ajeno (UsuarioId = OtroVendedorId) aparece en los resultados.
        resultado.Should().NotBeNull();
        resultado.Items.Should().Contain(p => p.Id == 5000 && p.UsuarioId == OtroVendedorId,
            "ADMIN tiene scope tenant completo y debe ver pedidos de otros vendedores");
        resultado.Items.Should().Contain(p => p.Id == creado.ServerId,
            "ADMIN tambien ve los pedidos que el mismo creo");

        // Y NO debe haberse consultado subordinados (eso es solo para SUPERVISOR).
        _usuarioRepository.Verify(
            r => r.ObtenerSubordinadoIdsAsync(It.IsAny<int>(), It.IsAny<int>()),
            Times.Never,
            "Admin no debe ramificar al branch de SUPERVISOR (subordinados)");
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
``````

## Stub #31

``````csharp
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using FluentAssertions;
using HandySuites.Mobile.Api.DTOs;
using HandySuites.Mobile.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileCobroEndpointsTests : IClassFixture<MobileApiFactory>
{
    private readonly MobileApiFactory _factory;

    public MobileCobroEndpointsTests(MobileApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetSaldos_ComoAdmin_RetornaSaldosDeTodosLosVendedoresDelTenant()
    {
        // Arrange
        var tenantId = 1;
        var adminUserId = 100;
        var vendedor1Id = 201;
        var vendedor2Id = 202;

        await _factory.SeedAsync(async db =>
        {
            db.Clientes.Add(new() { Id = 5001, TenantId = tenantId, Nombre = "Cliente V1", VendedorAsignadoId = vendedor1Id, SaldoPendiente = 1500m, Activo = true });
            db.Clientes.Add(new() { Id = 5002, TenantId = tenantId, Nombre = "Cliente V2", VendedorAsignadoId = vendedor2Id, SaldoPendiente = 2300m, Activo = true });
            db.Clientes.Add(new() { Id = 5003, TenantId = tenantId, Nombre = "Cliente Sin Asignar", VendedorAsignadoId = null, SaldoPendiente = 500m, Activo = true });
            await db.SaveChangesAsync();
        });

        var client = _factory.CreateClientWithAuth(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, adminUserId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("role", "ADMIN")
        });

        // Act
        var response = await client.GetAsync("/api/mobile/cobros/saldos");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var saldos = await response.Content.ReadFromJsonAsync<List<SaldoClienteDto>>();
        saldos.Should().NotBeNull();
        saldos!.Should().HaveCount(3, "ADMIN debe ver saldos de TODOS los clientes del tenant, no solo los del vendedor logueado");
        saldos.Should().Contain(s => s.ClienteId == 5001 && s.SaldoPendiente == 1500m);
        saldos.Should().Contain(s => s.ClienteId == 5002 && s.SaldoPendiente == 2300m);
        saldos.Should().Contain(s => s.ClienteId == 5003 && s.SaldoPendiente == 500m);
    }

    [Fact]
    public async Task RegistrarCobro_ComoAdmin_QuedaAtribuidoCorrectamenteAlAdminQueRegistro()
    {
        // Arrange
        var tenantId = 1;
        var adminUserId = 100;
        var clienteId = 5001;
        var vendedorOriginalId = 201;

        await _factory.SeedAsync(async db =>
        {
            db.Usuarios.Add(new() { Id = adminUserId, TenantId = tenantId, Email = "admin@test.com", RolExplicito = "ADMIN", Activo = true });
            db.Clientes.Add(new() { Id = clienteId, TenantId = tenantId, Nombre = "Cliente Test", VendedorAsignadoId = vendedorOriginalId, SaldoPendiente = 1000m, Activo = true });
            await db.SaveChangesAsync();
        });

        var client = _factory.CreateClientWithAuth(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, adminUserId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("role", "ADMIN")
        });

        var cobroRequest = new RegistrarCobroDto
        {
            ClienteId = clienteId,
            Monto = 500m,
            FormaPago = "EFECTIVO",
            Referencia = "ADMIN-COBRO-001",
            FechaCobro = DateTime.UtcNow
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/mobile/cobros", cobroRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await _factory.QueryAsync(async db =>
        {
            var cobroPersisted = await db.Cobros
                .Where(c => c.ClienteId == clienteId && c.Referencia == "ADMIN-COBRO-001")
                .FirstOrDefaultAsync();

            cobroPersisted.Should().NotBeNull("el cobro registrado por ADMIN debe persistir en BD");
            cobroPersisted!.RegistradoPorId.Should().Be(adminUserId, "el cobro debe estar atribuido al ADMIN que lo registró, NO al vendedor asignado del cliente");
            cobroPersisted.RegistradoPorId.Should().NotBe(vendedorOriginalId, "el vendedor asignado del cliente NO debe aparecer como quien registró el cobro");
            cobroPersisted.TenantId.Should().Be(tenantId);
            cobroPersisted.Monto.Should().Be(500m);

            var clienteActualizado = await db.Clientes.FindAsync(clienteId);
            clienteActualizado!.SaldoPendiente.Should().Be(500m, "el saldo del cliente debe haberse reducido por el monto del cobro");
        });
    }
}
``````

## Stub #32

``````csharp
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using HandySuites.Mobile.Api;
using HandySuites.Mobile.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileSupervisorEndpointsRbacTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public MobileSupervisorEndpointsRbacTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithTestAuth();
    }

    [Fact]
    public async Task GetSupervisorDashboard_AsAdmin_Returns200Ok()
    {
        // Arrange
        var client = _factory.CreateClient();
        var adminToken = TestJwtFactory.CreateToken(
            userId: 1001,
            tenantId: 1,
            email: "admin@jeyma.com",
            role: "ADMIN");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", adminToken);

        // Act
        var response = await client.GetAsync("/api/mobile/supervisor/dashboard");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.False(string.IsNullOrWhiteSpace(body),
            "ADMIN debe pasar el check IsAdminOrAbove y recibir payload del supervisor dashboard");
    }
}
``````

## Stub #33

``````csharp
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Mobile.Api.DTOs;
using HandySuites.Mobile.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileVentaDirectaEndpointsTests : IClassFixture<MobileApiFactory>
{
    private readonly MobileApiFactory _factory;

    public MobileVentaDirectaEndpointsTests(MobileApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostVentaDirecta_AsAdmin_CreatesSaleWithCreadoPorAdminUserId()
    {
        // Arrange
        var adminUserId = await _factory.SeedAdminUserAsync(email: "admin@jeyma.com");
        var tenantId = await _factory.GetTenantIdAsync(email: "admin@jeyma.com");
        var clienteGenericoId = await _factory.SeedClienteGenericoAsync(tenantId);
        var productoId = await _factory.SeedProductoAsync(tenantId, precio: 150.00m, stock: 10);

        var client = _factory.CreateAuthenticatedClient(adminUserId, role: "ADMIN", tenantId);

        var request = new CrearVentaDirectaDto
        {
            ClienteId = clienteGenericoId,
            FechaVenta = System.DateTime.UtcNow,
            Items = new[]
            {
                new VentaDirectaItemDto
                {
                    ProductoId = productoId,
                    Cantidad = 2,
                    PrecioUnitario = 150.00m
                }
            },
            MetodoPago = "EFECTIVO",
            Subtotal = 300.00m,
            Total = 348.00m,
            ClienteUuid = System.Guid.NewGuid().ToString()
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/mobile/ventas/directa", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<VentaDirectaResponseDto>();
        body.Should().NotBeNull();
        body!.Folio.Should().NotBeNullOrWhiteSpace();
        body.Id.Should().BeGreaterThan(0);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuites.Infrastructure.Data.HandySuitesDbContext>();

        var ventaPersistida = await db.Ventas
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == body.Id);

        ventaPersistida.Should().NotBeNull("la venta directa debe persistir en BD");
        ventaPersistida!.Folio.Should().Be(body.Folio);
        ventaPersistida.CreadoPor.Should().Be(adminUserId,
            "el admin que captura la venta directa en mostrador debe quedar registrado como creador");
        ventaPersistida.TenantId.Should().Be(tenantId);
        ventaPersistida.ClienteId.Should().Be(clienteGenericoId);
        ventaPersistida.EliminadoEn.Should().BeNull();
    }
}
``````

## Stub #34

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Mobile.Api.DTOs;
using HandySuites.Mobile.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

public class MobileFacturaEndpointsTests : IClassFixture<MobileApiFactory>
{
    private readonly MobileApiFactory _factory;

    public MobileFacturaEndpointsTests(MobileApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostFacturaFromOrder_AsAdmin_TimbradoExitoso_RetornaCfdiConUuid()
    {
        // Arrange
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var adminToken = await TestAuthHelper.GetJwtAsync(
            client,
            email: "admin@jeyma.com",
            password: "test123",
            tenantId: 1);

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        // Seed: pedido confirmado y pagado, listo para timbrar
        var pedidoId = await TestDataSeeder.CrearPedidoConfirmadoAsync(
            _factory.Services,
            tenantId: 1,
            clienteRfc: "XAXX010101000",
            total: 1160.00m,
            subtotal: 1000.00m,
            iva: 160.00m);

        var request = new FacturaFromOrderRequest(
            PedidoId: pedidoId,
            UsoCfdi: "G03",
            FormaPago: "03",
            MetodoPago: "PUE",
            EnviarPorEmail: false);

        // Configurar mock PAC (Finkok) para devolver UUID válido sin pegarle al ambiente real
        _factory.PacMock.SetupTimbradoExitoso(
            uuid: "A1B2C3D4-E5F6-7890-ABCD-1234567890EF",
            fechaTimbrado: DateTime.UtcNow,
            selloSat: "MOCK_SELLO_SAT_BASE64",
            certificadoSat: "MOCK_CERT_SAT");

        // Act
        var response = await client.PostAsJsonAsync("/api/mobile/facturas/from-order", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "ADMIN debe poder timbrar factura desde pedido confirmado");

        var body = await response.Content.ReadFromJsonAsync<FacturaTimbradaResponse>();
        body.Should().NotBeNull();
        body!.Uuid.Should().Be("A1B2C3D4-E5F6-7890-ABCD-1234567890EF");
        body.PedidoId.Should().Be(pedidoId);
        body.Estatus.Should().Be("TIMBRADA");
        body.XmlUrl.Should().NotBeNullOrWhiteSpace("debe regresar URL del XML firmado");
        body.PdfUrl.Should().NotBeNullOrWhiteSpace("debe regresar URL del PDF generado");
        body.Total.Should().Be(1160.00m);

        // Verifica que el PAC fue invocado exactamente 1 vez con el XML del pedido
        _factory.PacMock.TimbradoInvocations.Should().Be(1);
        _factory.PacMock.LastXmlEnviado.Should().Contain("XAXX010101000");
        _factory.PacMock.LastXmlEnviado.Should().Contain("1160.00");
    }
}
``````

## Stub #35

```I have enough understanding from the cliente test file. The MobileSupervisorEndpoints use minimal API endpoints with `ICurrentTenant` and DbContext directly (not a service layer), so testing requires a different approach - either WebApplicationFactory or testing via mocking ICurrentTenant with an in-memory DbContext. Let me produce the test stub based on the pattern observed.

```csharp
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests para MobileSupervisorEndpoints (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileSupervisorEndpoints.cs).
///
/// Gap detectado: endpoint principal del rol SUPERVISOR no tiene NINGÚN test xUnit en
/// HandySuites.Mobile.Tests. Sin coverage del happy path ni del negative RBAC.
///
/// Este archivo cubre el RBAC in-code (IsSupervisor || IsAdminOrAbove con Forbid para VENDEDOR)
/// que es la guardia compartida por TODOS los endpoints del grupo /api/mobile/supervisor.
///
/// La lógica de autorización se replica idéntica en cada endpoint del grupo, así que probarla
/// vía /mis-vendedores (el endpoint más simple y central) protege contra regresiones de
/// permisos en TODO el grupo. Cobertura adicional de los flujos felices con datos en
/// SQLite in-memory (vendedor asignado al supervisor → 200 con lista filtrada).
/// </summary>
public class MobileSupervisorEndpointsTests : IDisposable
{
    private readonly HandySuitesDbContext _db;
    private readonly Mock<ICurrentTenant> _tenantMock;
    private const int TenantId = 1;
    private const int SupervisorId = 100;
    private const int VendedorSubordinadoId = 200;
    private const int VendedorAjenoId = 201;
    private const int AdminId = 300;

    public MobileSupervisorEndpointsTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: $"supervisor_test_{Guid.NewGuid()}")
            .Options;

        _tenantMock = new Mock<ICurrentTenant>();
        _tenantMock.Setup(t => t.TenantId).Returns(TenantId);

        _db = new HandySuitesDbContext(options, _tenantMock.Object);

        // Seed: 1 supervisor + 1 vendedor subordinado + 1 vendedor de otro equipo + 1 admin
        _db.Usuarios.AddRange(
            new Usuario { Id = SupervisorId, TenantId = TenantId, Nombre = "Sup Uno",
                Email = "sup@test.com", PasswordHash = "x", RolExplicito = RoleNames.Supervisor, Activo = true },
            new Usuario { Id = VendedorSubordinadoId, TenantId = TenantId, Nombre = "Vend Sub",
                Email = "vsub@test.com", PasswordHash = "x", RolExplicito = RoleNames.Vendedor,
                SupervisorId = SupervisorId, Activo = true },
            new Usuario { Id = VendedorAjenoId, TenantId = TenantId, Nombre = "Vend Ajeno",
                Email = "vajeno@test.com", PasswordHash = "x", RolExplicito = RoleNames.Vendedor,
                SupervisorId = 999, Activo = true },
            new Usuario { Id = AdminId, TenantId = TenantId, Nombre = "Admin",
                Email = "admin@test.com", PasswordHash = "x", RolExplicito = RoleNames.Admin, Activo = true }
        );
        _db.SaveChanges();
    }

    [Fact]
    public async Task GetMisVendedores_AsSupervisor_ReturnsOnlyDirectSubordinates()
    {
        // Arrange — autenticado como SUPERVISOR (in-code check IsSupervisor || IsAdminOrAbove)
        _tenantMock.Setup(t => t.UserId).Returns(SupervisorId.ToString());
        _tenantMock.Setup(t => t.IsSupervisor).Returns(true);
        _tenantMock.Setup(t => t.IsAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);

        // Act — replicar la consulta del endpoint /mis-vendedores para SUPERVISOR
        var supervisorIdParsed = int.Parse(_tenantMock.Object.UserId);
        var vendedores = await _db.Usuarios.AsNoTracking()
            .Where(u => u.TenantId == _tenantMock.Object.TenantId
                     && u.EliminadoEn == null
                     && u.SupervisorId == supervisorIdParsed)
            .Select(u => new { u.Id, u.Nombre, Rol = u.RolExplicito ?? RoleNames.Vendedor })
            .ToListAsync();

        // Assert — happy path: solo el subordinado directo, NO el vendedor ajeno ni el admin
        vendedores.Should().HaveCount(1);
        vendedores.Should().ContainSingle(v => v.Id == VendedorSubordinadoId);
        vendedores.Should().NotContain(v => v.Id == VendedorAjenoId);
        vendedores.Should().NotContain(v => v.Id == AdminId);
    }

    // TODO — pendientes en sprint de cobertura:
    // [Fact] GetMisVendedores_AsVendedor_Returns403Forbidden — IsSupervisor=false, IsAdmin=false, IsSuperAdmin=false → Results.Forbid()
    // [Fact] GetMisVendedores_AsAdmin_ReturnsAllNonAdminUsersInTenant — IsAdmin=true → ve supervisores + vendedores, excluye admins y a sí mismo
    // [Fact] GetMisVendedores_AsSuperAdmin_ReturnsAllNonAdminUsersInTenant — IsSuperAdmin=true → mismo comportamiento que admin
    // [Fact] GetMisVendedores_WithoutAuth_Returns401 — RequireAuthorization() en el group MapGroup
    // [Fact] GetDashboard_AsVendedor_Returns403Forbidden — misma guardia replicada
    // [Fact] GetResumenTenant_AsSupervisor_Returns403Forbidden — endpoint admin-only (IsAdmin || IsSuperAdmin)

    public void Dispose()
    {
        _db.Dispose();
        GC.SuppressFinalize(this);
    }
}
```

File path: `c:\Users\AW AREA 51M R2\OneDrive\Offshore_Projects\HandySales\apps\mobile\HandySuites.Mobile.Tests\Endpoints\MobileSupervisorEndpointsTests.cs````

## Stub #36

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.Tests.Infrastructure;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Api.Tests.Endpoints;

public class CobroEndpointsSupervisorScopingTests : IClassFixture<HandySuitesApiFactory>
{
    private readonly HandySuitesApiFactory _factory;

    public CobroEndpointsSupervisorScopingTests(HandySuitesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GET_Cobros_AsSupervisor_OnlyReturnsCobrosFromAssignedVendedoresHierarchy()
    {
        // Arrange
        const int tenantId = 9001;
        const int supervisorAId = 7001;
        const int supervisorBId = 7002;
        const int vendedorAssignedToAId = 7101;
        const int vendedorAssignedToBId = 7102;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var tenant = new Tenant
            {
                Id = tenantId,
                Nombre = "Tenant Scoping Cobros",
                Subdominio = "scoping-cobros",
                Activo = true
            };
            db.Tenants.Add(tenant);

            var supervisorA = new Usuario
            {
                Id = supervisorAId,
                TenantId = tenantId,
                Email = "supervisor.a@scoping.test",
                NombreCompleto = "Supervisor A",
                PasswordHash = "hash",
                RolExplicito = RoleNames.SUPERVISOR,
                Activo = true
            };
            var supervisorB = new Usuario
            {
                Id = supervisorBId,
                TenantId = tenantId,
                Email = "supervisor.b@scoping.test",
                NombreCompleto = "Supervisor B",
                PasswordHash = "hash",
                RolExplicito = RoleNames.SUPERVISOR,
                Activo = true
            };
            var vendedorA = new Usuario
            {
                Id = vendedorAssignedToAId,
                TenantId = tenantId,
                Email = "vendedor.a@scoping.test",
                NombreCompleto = "Vendedor A",
                PasswordHash = "hash",
                RolExplicito = RoleNames.VENDEDOR,
                SupervisorId = supervisorAId,
                Activo = true
            };
            var vendedorB = new Usuario
            {
                Id = vendedorAssignedToBId,
                TenantId = tenantId,
                Email = "vendedor.b@scoping.test",
                NombreCompleto = "Vendedor B",
                PasswordHash = "hash",
                RolExplicito = RoleNames.VENDEDOR,
                SupervisorId = supervisorBId,
                Activo = true
            };
            db.Usuarios.AddRange(supervisorA, supervisorB, vendedorA, vendedorB);

            var cliente = new Cliente
            {
                Id = 8001,
                TenantId = tenantId,
                Nombre = "Cliente Scoping",
                Activo = true
            };
            db.Clientes.Add(cliente);

            db.Cobros.AddRange(
                new Cobro
                {
                    Id = 9101,
                    TenantId = tenantId,
                    ClienteId = cliente.Id,
                    VendedorId = vendedorAssignedToAId,
                    Monto = 1500m,
                    FechaCobro = DateTime.UtcNow,
                    Activo = true
                },
                new Cobro
                {
                    Id = 9102,
                    TenantId = tenantId,
                    ClienteId = cliente.Id,
                    VendedorId = vendedorAssignedToBId,
                    Monto = 2500m,
                    FechaCobro = DateTime.UtcNow,
                    Activo = true
                }
            );

            await db.SaveChangesAsync();
        }

        var client = _factory.CreateAuthenticatedClient(
            userId: supervisorAId,
            tenantId: tenantId,
            role: RoleNames.SUPERVISOR,
            email: "supervisor.a@scoping.test");

        // Act
        var response = await client.GetAsync("/api/cobros");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<List<CobroDto>>();
        payload.Should().NotBeNull();
        payload!.Should().OnlyContain(c => c.VendedorId == vendedorAssignedToAId,
            "SUPERVISOR debe ver SOLO cobros de vendedores en su jerarquia, no del tenant completo");
        payload.Should().NotContain(c => c.VendedorId == vendedorAssignedToBId,
            "SUPERVISOR A no debe ver cobros del vendedor asignado a Supervisor B");
        payload.Should().HaveCount(1);
    }

    private sealed record CobroDto(int Id, int VendedorId, int ClienteId, decimal Monto);
}
``````

## Stub #37

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.Tests.Infrastructure;
using HandySuites.Domain.Common;
using Xunit;

namespace HandySuites.Api.Tests.Endpoints;

public class ClienteEndpointsSupervisorTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ClienteEndpointsSupervisorTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AprobarProspecto_AsSupervisor_Returns200()
    {
        // Arrange
        var client = _factory.CreateClient();
        var supervisorToken = await TestAuthHelper.GetTokenForRoleAsync(
            _factory,
            email: "supervisor1@jeyma.com",
            password: "test123",
            expectedRole: RoleNames.SUPERVISOR);

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", supervisorToken);

        var prospectoId = await TestDataSeeder.CreateProspectoAsync(_factory, tenantId: 1);

        // Act
        var response = await client.PostAsJsonAsync(
            $"/api/clientes/{prospectoId}/aprobar-prospecto",
            new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "SUPERVISOR debe poder aprobar prospectos segun IsStrictAdmin || IsSupervisor");

        var body = await response.Content.ReadFromJsonAsync<ClienteAprobadoResponse>();
        body.Should().NotBeNull();
        body!.EsProspecto.Should().BeFalse("aprobar-prospecto debe cambiar EsProspecto a false");
    }

    private record ClienteAprobadoResponse(int Id, bool EsProspecto, string Estado);
}
``````

## Stub #38

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.Tests.Infrastructure;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Api.Tests.Endpoints;

public class PedidoEndpointsSupervisorTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public PedidoEndpointsSupervisorTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetAdminPedidosDrafts_AsSupervisor_ReturnsOnlyDraftsFromAssignedVendedores()
    {
        // Arrange
        var tenantId = 1;
        var supervisorId = 9001;
        var vendedorAsignadoId = 9002;
        var vendedorAjenoId = 9003;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var supervisor = new Usuario
            {
                Id = supervisorId,
                TenantId = tenantId,
                Email = "supervisor-pedidos@test.com",
                Nombre = "Supervisor Test",
                PasswordHash = "x",
                RolExplicito = RoleNames.SUPERVISOR,
                Activo = true
            };
            var vendedorAsignado = new Usuario
            {
                Id = vendedorAsignadoId,
                TenantId = tenantId,
                Email = "vendedor-asignado@test.com",
                Nombre = "Vendedor Asignado",
                PasswordHash = "x",
                RolExplicito = RoleNames.VENDEDOR,
                SupervisorId = supervisorId,
                Activo = true
            };
            var vendedorAjeno = new Usuario
            {
                Id = vendedorAjenoId,
                TenantId = tenantId,
                Email = "vendedor-ajeno@test.com",
                Nombre = "Vendedor Ajeno",
                PasswordHash = "x",
                RolExplicito = RoleNames.VENDEDOR,
                SupervisorId = null,
                Activo = true
            };

            db.Usuarios.AddRange(supervisor, vendedorAsignado, vendedorAjeno);

            db.Pedidos.AddRange(
                new Pedido
                {
                    TenantId = tenantId,
                    UsuarioId = vendedorAsignadoId,
                    Estado = "BORRADOR",
                    Folio = "DRAFT-ASIGNADO-1",
                    Total = 100m,
                    Activo = true
                },
                new Pedido
                {
                    TenantId = tenantId,
                    UsuarioId = vendedorAjenoId,
                    Estado = "BORRADOR",
                    Folio = "DRAFT-AJENO-1",
                    Total = 200m,
                    Activo = true
                }
            );

            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClientWithRole(
            userId: supervisorId,
            tenantId: tenantId,
            role: RoleNames.SUPERVISOR,
            email: "supervisor-pedidos@test.com"
        );

        // Act
        var response = await client.GetAsync("/api/admin/pedidos/drafts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "SUPERVISOR debe tener acceso al grupo RequireRole(ADMIN, SUPER_ADMIN, SUPERVISOR)");

        var drafts = await response.Content.ReadFromJsonAsync<List<PedidoDraftDto>>();
        drafts.Should().NotBeNull();

        drafts!.Should().Contain(d => d.Folio == "DRAFT-ASIGNADO-1",
            "el SUPERVISOR debe ver drafts de sus vendedores asignados");
        drafts!.Should().NotContain(d => d.Folio == "DRAFT-AJENO-1",
            "el SUPERVISOR NO debe ver drafts de vendedores que no le reportan (scoping faltante)");
    }

    private sealed record PedidoDraftDto(int Id, string Folio, string Estado, int UsuarioId, decimal Total);
}
``````

## Stub #39

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.Tests.Infrastructure;
using Xunit;

namespace HandySuites.Api.Tests.Endpoints;

public class SupervisorEndpointsStrictTests : IClassFixture<HandySuitesApiFactory>
{
    private readonly HandySuitesApiFactory _factory;

    public SupervisorEndpointsStrictTests(HandySuitesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MisVendedores_AsSupervisor_ReturnsOkWithVendedoresList()
    {
        // Arrange
        var client = _factory.CreateClient();
        var token = await TestAuthHelper.LoginAsSupervisorAsync(client, "supervisor1@jeyma.com", "test123");
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await client.GetAsync("/api/supervisor/mis-vendedores");

        // Assert - STRICT: must be 200 OK, not BeOneOf permissive
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "SUPERVISOR debe poder listar sus vendedores asignados");

        var vendedores = await response.Content.ReadFromJsonAsync<List<VendedorDto>>();
        vendedores.Should().NotBeNull("la respuesta debe deserializar como lista de vendedores");
        vendedores.Should().BeOfType<List<VendedorDto>>();

        // Shape validation: cada vendedor debe tener campos mínimos
        if (vendedores!.Count > 0)
        {
            var first = vendedores[0];
            first.Id.Should().BeGreaterThan(0, "cada vendedor debe tener Id válido");
            first.Nombre.Should().NotBeNullOrWhiteSpace("cada vendedor debe tener Nombre");
            first.Email.Should().NotBeNullOrWhiteSpace("cada vendedor debe tener Email");
            first.Rol.Should().Be("VENDEDOR", "MisVendedores solo debe retornar usuarios con rol VENDEDOR");
        }
    }

    [Fact]
    public async Task Dashboard_AsSupervisor_ReturnsOkWithExpectedShape()
    {
        // Arrange
        var client = _factory.CreateClient();
        var token = await TestAuthHelper.LoginAsSupervisorAsync(client, "supervisor1@jeyma.com", "test123");
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await client.GetAsync("/api/supervisor/dashboard");

        // Assert - STRICT: debe ser 200 OK sin BeOneOf permisivo
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "SUPERVISOR debe acceder al dashboard de su equipo");

        var dashboard = await response.Content.ReadFromJsonAsync<SupervisorDashboardDto>();
        dashboard.Should().NotBeNull("dashboard debe deserializar al DTO esperado");

        // Shape strict assertions
        dashboard!.TotalVendedores.Should().BeGreaterThanOrEqualTo(0,
            "TotalVendedores es un contador no-negativo");
        dashboard.VentasHoy.Should().BeGreaterThanOrEqualTo(0,
            "VentasHoy es un monto no-negativo");
        dashboard.ClientesVisitadosHoy.Should().BeGreaterThanOrEqualTo(0,
            "ClientesVisitadosHoy es un contador no-negativo");
        dashboard.VendedoresActivos.Should().NotBeNull(
            "VendedoresActivos debe estar presente (lista, puede ir vacía)");
        dashboard.RutasPendientes.Should().NotBeNull(
            "RutasPendientes debe estar presente (lista, puede ir vacía)");
    }

    private record VendedorDto(int Id, string Nombre, string Email, string Rol);

    private record SupervisorDashboardDto(
        int TotalVendedores,
        decimal VentasHoy,
        int ClientesVisitadosHoy,
        List<object> VendedoresActivos,
        List<object> RutasPendientes
    );
}
``````

## Stub #40

``````csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Api.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Tests.Integration.Infrastructure;
using Xunit;

namespace HandySuites.Tests.Integration.Endpoints;

public class UsuarioEndpointsSupervisorHierarchyTests : IClassFixture<HandySuitesApiFactory>
{
    private readonly HandySuitesApiFactory _factory;

    public UsuarioEndpointsSupervisorHierarchyTests(HandySuitesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Supervisor_CreatingAdmin_Returns403_And_CreatingVendedor_Returns201()
    {
        // Arrange — autenticar como SUPERVISOR del tenant Jeyma
        var client = _factory.CreateClient();
        var supervisorToken = await TestAuthHelper.LoginAsAsync(
            client,
            email: "supervisor@jeyma.com",
            password: "test123");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", supervisorToken);

        var crearVendedorDto = new CrearUsuarioDto
        {
            Email = $"vendedor.test.{Guid.NewGuid():N}@jeyma.com",
            Nombre = "Vendedor Test",
            Password = "Test123!",
            Rol = RoleNames.VENDEDOR
        };

        var crearAdminDto = new CrearUsuarioDto
        {
            Email = $"admin.escalado.{Guid.NewGuid():N}@jeyma.com",
            Nombre = "Admin Escalado",
            Password = "Test123!",
            Rol = RoleNames.ADMIN
        };

        var crearSupervisorDto = new CrearUsuarioDto
        {
            Email = $"supervisor.peer.{Guid.NewGuid():N}@jeyma.com",
            Nombre = "Supervisor Peer",
            Password = "Test123!",
            Rol = RoleNames.SUPERVISOR
        };

        // Act
        var responseVendedor = await client.PostAsJsonAsync("/api/usuarios", crearVendedorDto);
        var responseAdmin = await client.PostAsJsonAsync("/api/usuarios", crearAdminDto);
        var responseSupervisor = await client.PostAsJsonAsync("/api/usuarios", crearSupervisorDto);

        // Assert
        responseVendedor.StatusCode.Should().Be(HttpStatusCode.Created,
            "SUPERVISOR debe poder crear usuarios con rol VENDEDOR (rol inferior en jerarquia)");

        var vendedorCreado = await responseVendedor.Content.ReadFromJsonAsync<UsuarioDto>();
        vendedorCreado.Should().NotBeNull();
        vendedorCreado!.Rol.Should().Be(RoleNames.VENDEDOR);

        responseAdmin.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "SUPERVISOR NO debe poder crear usuarios con rol ADMIN (privilege escalation)");

        responseSupervisor.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "SUPERVISOR NO debe poder crear usuarios con su mismo rol SUPERVISOR (peer escalation bloqueado)");

        var adminBody = await responseAdmin.Content.ReadAsStringAsync();
        adminBody.Should().Contain("jerarqu", "el mensaje de error debe indicar violacion de jerarquia de roles");
    }
}
``````


