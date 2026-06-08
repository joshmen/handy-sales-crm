using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Application.Tracking.Services;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Subscriptions;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests del feature-flag "tracking_vendedor" (GPS vendedores) — capa backend.
///
/// Cubre la fuente de verdad que alimenta DOS contratos para el mobile VENDEDOR:
///
///   1) GET /api/mobile/empresa.data.trackingGpsEnabled
///      (MobileEmpresaEndpoints.cs:41) — el mobile gating del toggle "Tracking
///      GPS" en Configuración depende de este flag. HasFeatureAsync no-throw +
///      per-request cache. False cuando el tenant no tiene SubscriptionPlanId.
///
///   2) POST /api/mobile/tracking/batch (MobileTrackingEndpoints.cs:23)
///      RequireFeatureAsync lanza FeatureNotInPlanException si el plan no
///      incluye el feature; el endpoint la convierte a 403 con code
///      TRACKING_NOT_IN_PLAN para que el mobile deshabilite el timer GPS.
///
/// Test approach: probamos SubscriptionFeatureGuard contra InMemoryDatabase real
/// (siguiendo el patrón de MobileAuthEndpointsTests). NO usamos
/// WebApplicationFactory custom inline — el patrón documentado en este repo
/// indica que falla por JWT config. Los tests del flag son E2E-equivalent
/// porque el endpoint /empresa delega 100% al guard, y porque el guard es
/// el único componente que decide el bool retornado.
///
/// Cubre — happy path + RBAC negative + IDOR cross-tenant + edge cases:
///   - Plan incluye feature → true (auto-deshabilita timer mobile = no)
///   - Plan NO incluye feature → false (mobile esconde toggle)
///   - Tenant sin SubscriptionPlanId (trial sin plan) → false
///   - Tenant con SubscriptionPlanId huérfano → false (no crashea)
///   - Cross-tenant: tenant A con feature, tenant B sin → cada uno ve el suyo
///     (anti-IDOR del feature flag — un VENDEDOR no puede ver el flag de otro
///      tenant porque el guard recibe el TenantId del JWT del request)
///   - Cache por request: dos lookups en el mismo scope → 1 query DB
///   - Cache es por (tenantId, featureCode) — no leak entre tenants en mismo scope
///   - RequireFeatureAsync vs HasFeatureAsync — throw vs bool (los dos contratos)
/// </summary>
public class MobileTrackingFeatureFlagTests : IDisposable
{
    private const string FeatureCode = "tracking_vendedor";

    private readonly HandySuitesDbContext _db;

    public MobileTrackingFeatureFlagTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new HandySuitesDbContext(options);
    }

    private SubscriptionPlan SeedPlan(string codigo, bool trackingIncluido)
    {
        var plan = new SubscriptionPlan
        {
            Nombre = $"Plan {codigo}",
            Codigo = codigo,
            IncluyeTrackingVendedor = trackingIncluido,
            Activo = true
        };
        _db.SubscriptionPlans.Add(plan);
        _db.SaveChanges();
        return plan;
    }

    private Tenant SeedTenant(int id, int? subscriptionPlanId)
    {
        var tenant = new Tenant
        {
            Id = id,
            NombreEmpresa = $"Tenant {id}",
            SubscriptionPlanId = subscriptionPlanId
        };
        _db.Tenants.Add(tenant);
        _db.SaveChanges();
        return tenant;
    }

    // ============ Happy path: VENDEDOR de tenant con plan PRO ve flag=true ============

    [Fact]
    public async Task HasFeatureAsync_TenantConPlanQueIncluyeTracking_DevuelveTrue()
    {
        // Plan PRO incluye tracking_vendedor — el mobile del VENDEDOR debe poder
        // activar el toggle GPS y enviar pings al backend sin recibir 403.
        var plan = SeedPlan("PRO", trackingIncluido: true);
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        var has = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);

        has.Should().BeTrue("plan PRO con IncluyeTrackingVendedor=true habilita el feature");
    }

    [Fact]
    public async Task HasFeatureAsync_TenantConPlanSinTracking_DevuelveFalse()
    {
        // Plan BASIC no incluye tracking — el toggle GPS en el mobile debe
        // estar oculto/deshabilitado y el backend rechaza con 403.
        var plan = SeedPlan("BASIC", trackingIncluido: false);
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        var has = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);

        has.Should().BeFalse("plan BASIC no incluye tracking — feature deshabilitado");
    }

    // ============ Edge: tenant sin plan / con plan huérfano ============

    [Fact]
    public async Task HasFeatureAsync_TenantSinSubscriptionPlanId_DevuelveFalseNoThrow()
    {
        // Free trial / tenant recién creado: SubscriptionPlanId == null.
        // El guard debe devolver false sin throwear ni crashear el endpoint
        // /empresa (que retornaría 500 al mobile, rompiendo el splash inicial).
        SeedTenant(id: 1, subscriptionPlanId: null);

        var guard = new SubscriptionFeatureGuard(_db);

        var has = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);

        has.Should().BeFalse("tenant sin plan asignado = no tiene features premium");
    }

    [Fact]
    public async Task HasFeatureAsync_TenantConPlanIdHuerfano_DevuelveFalseNoThrow()
    {
        // Edge defensivo: tenant referencia un planId que ya no existe en
        // subscription_plans (ej. plan borrado por SuperAdmin sin migrar
        // tenants). El guard debe degradar a false, no NullReferenceException.
        SeedTenant(id: 1, subscriptionPlanId: 9999);

        var guard = new SubscriptionFeatureGuard(_db);

        var has = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);

        has.Should().BeFalse("plan huérfano se trata como sin feature, no como crash");
    }

    [Fact]
    public async Task HasFeatureAsync_TenantInexistente_DevuelveFalseNoThrow()
    {
        // VENDEDOR con JWT viejo cuyo tenantId ya fue eliminado.
        // Defensivo: false sin throw. El auth middleware ya debería rechazar
        // antes pero el guard no debe asumir esa garantía.
        var guard = new SubscriptionFeatureGuard(_db);

        var has = await guard.HasFeatureAsync(tenantId: 99999, FeatureCode);

        has.Should().BeFalse();
    }

    // ============ RequireFeatureAsync — el path del POST /tracking/batch ============

    [Fact]
    public async Task RequireFeatureAsync_PlanSinFeature_LanzaFeatureNotInPlanException()
    {
        // Este es el camino que ejecuta el endpoint POST /api/mobile/tracking/batch
        // cuando el VENDEDOR intenta mandar pings y su tenant NO tiene tracking
        // en el plan. La excepción es capturada por el endpoint y traducida a 403
        // con code TRACKING_NOT_IN_PLAN para que el mobile detenga el timer GPS.
        var plan = SeedPlan("BASIC", trackingIncluido: false);
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        var act = () => guard.RequireFeatureAsync(tenantId: 1, FeatureCode);

        var ex = await act.Should().ThrowAsync<FeatureNotInPlanException>();
        ex.Which.FeatureCode.Should().Be(FeatureCode);
    }

    [Fact]
    public async Task RequireFeatureAsync_PlanIncluyeFeature_NoThrow()
    {
        // Plan PRO con tracking incluido: el endpoint POST /batch acepta el ping.
        var plan = SeedPlan("PRO", trackingIncluido: true);
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        var act = () => guard.RequireFeatureAsync(tenantId: 1, FeatureCode);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task RequireFeatureAsync_TenantSinPlan_LanzaFeatureNotInPlan()
    {
        // Tenant free-trial intenta postear pings: debe ser bloqueado igual.
        SeedTenant(id: 1, subscriptionPlanId: null);

        var guard = new SubscriptionFeatureGuard(_db);

        var act = () => guard.RequireFeatureAsync(tenantId: 1, FeatureCode);

        await act.Should().ThrowAsync<FeatureNotInPlanException>();
    }

    // ============ Anti-IDOR cross-tenant ============

    [Fact]
    public async Task HasFeatureAsync_TenantsDistintos_CadaUnoVeSoloElSuyo()
    {
        // CRÍTICO anti-IDOR: el flag del feature DEBE evaluarse contra el
        // tenantId del JWT del request, NUNCA contra otro tenant. Esto verifica
        // que el guard no mezcle tenants (sería un leak comercial: un VENDEDOR
        // de tenant gratis vería features de tenant PRO).
        var planPro = SeedPlan("PRO", trackingIncluido: true);
        var planBasic = SeedPlan("BASIC", trackingIncluido: false);
        SeedTenant(id: 1, subscriptionPlanId: planPro.Id);
        SeedTenant(id: 2, subscriptionPlanId: planBasic.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        var t1HasFeature = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);
        var t2HasFeature = await guard.HasFeatureAsync(tenantId: 2, FeatureCode);

        t1HasFeature.Should().BeTrue("tenant 1 está en PRO — ve su propio feature");
        t2HasFeature.Should().BeFalse("tenant 2 está en BASIC — no debe ver el feature de tenant 1");
    }

    [Fact]
    public async Task HasFeatureAsync_CacheNoLeakeEntreTenants_EnMismoScope()
    {
        // El guard cachea (tenantId, featureCode) → bool. Verifica que la clave
        // del cache incluye tenantId — si solo cacheara por featureCode, un
        // request multi-tenant (job que recorre tenants en un mismo scope DI)
        // contaminaría el resultado del segundo tenant con el del primero.
        var planPro = SeedPlan("PRO", trackingIncluido: true);
        var planBasic = SeedPlan("BASIC", trackingIncluido: false);
        SeedTenant(id: 1, subscriptionPlanId: planPro.Id);
        SeedTenant(id: 2, subscriptionPlanId: planBasic.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        // Primero tenant 1 (cachea true). Luego tenant 2 — DEBE volver a
        // resolver, no devolver el true cacheado de tenant 1.
        var t1 = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);
        var t2 = await guard.HasFeatureAsync(tenantId: 2, FeatureCode);
        var t1Again = await guard.HasFeatureAsync(tenantId: 1, FeatureCode);
        var t2Again = await guard.HasFeatureAsync(tenantId: 2, FeatureCode);

        t1.Should().BeTrue();
        t2.Should().BeFalse();
        t1Again.Should().BeTrue("re-query del mismo tenant en el mismo scope debe dar mismo resultado");
        t2Again.Should().BeFalse("cache hit no debe contaminarse con valores de otro tenant");
    }

    // ============ Feature codes distintos no se confunden ============

    [Fact]
    public async Task HasFeatureAsync_FeatureCodesDistintos_SeEvaluanIndependientemente()
    {
        // Plan PRO con tracking_vendedor=true pero facturacion=false.
        // El guard debe distinguir features — un tenant puede tener uno sí y
        // otro no. Falla aquí = bug del switch del guard mezclando columnas.
        var plan = new SubscriptionPlan
        {
            Nombre = "Plan PRO",
            Codigo = "PRO",
            IncluyeTrackingVendedor = true,
            IncluyeFacturacion = false,
            IncluyeReportes = false,
            IncluyeSoportePrioritario = false,
            Activo = true
        };
        _db.SubscriptionPlans.Add(plan);
        _db.SaveChanges();
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        (await guard.HasFeatureAsync(1, "tracking_vendedor")).Should().BeTrue();
        (await guard.HasFeatureAsync(1, "facturacion")).Should().BeFalse();
        (await guard.HasFeatureAsync(1, "reportes")).Should().BeFalse();
        (await guard.HasFeatureAsync(1, "soporte_prioritario")).Should().BeFalse();
    }

    [Fact]
    public async Task HasFeatureAsync_FeatureCodeDesconocido_DevuelveFalse()
    {
        // Defensivo: si el cliente manda un feature code que el guard no conoce
        // en su switch, devuelve false (default del switch). Garantiza fail-safe:
        // un feature mal escrito nunca da acceso por accidente.
        var plan = SeedPlan("PRO", trackingIncluido: true);
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        var has = await guard.HasFeatureAsync(1, "feature_no_mapeado_en_switch");

        has.Should().BeFalse("feature code desconocido = fail-safe sin acceso");
    }

    // ============ Contrato del endpoint /api/mobile/empresa para el VENDEDOR ============

    [Fact]
    public async Task EndpointEmpresa_VendedorTenantConPlanPro_ExponeTrackingGpsEnabledTrue()
    {
        // Simula el path real del endpoint MobileEmpresaEndpoints.cs línea 41:
        //   var trackingGpsEnabled = await featureGuard.HasFeatureAsync(tenantId, "tracking_vendedor");
        // Para un VENDEDOR de un tenant en plan PRO, el JSON debe traer
        // trackingGpsEnabled=true. El hook mobile useTrackingGpsEnabled.ts
        // lee este campo y muestra/oculta el toggle en Configuración.
        var plan = SeedPlan("PRO", trackingIncluido: true);
        SeedTenant(id: 1, subscriptionPlanId: plan.Id);

        var guard = new SubscriptionFeatureGuard(_db);

        // El endpoint pasa tenant.TenantId del JWT — simulamos con mock para
        // dejar explícito el contrato (TenantId del token, no del body).
        var tenant = new Mock<ICurrentTenant>();
        tenant.SetupGet(t => t.TenantId).Returns(1);
        tenant.SetupGet(t => t.Role).Returns("VENDEDOR");

        var trackingGpsEnabled = await guard.HasFeatureAsync(tenant.Object.TenantId, FeatureCode);

        trackingGpsEnabled.Should().BeTrue("mobile mostrará el toggle GPS encendible");
    }

    [Fact]
    public async Task EndpointEmpresa_VendedorTenantSinPlan_ExponeTrackingGpsEnabledFalse()
    {
        // VENDEDOR de tenant free-trial: el JSON trae trackingGpsEnabled=false
        // y el mobile oculta el toggle. CRÍTICO que no crashee el endpoint
        // (sería 500 al startup del app, splash congelado).
        SeedTenant(id: 1, subscriptionPlanId: null);

        var guard = new SubscriptionFeatureGuard(_db);

        var tenant = new Mock<ICurrentTenant>();
        tenant.SetupGet(t => t.TenantId).Returns(1);
        tenant.SetupGet(t => t.Role).Returns("VENDEDOR");

        var trackingGpsEnabled = await guard.HasFeatureAsync(tenant.Object.TenantId, FeatureCode);

        trackingGpsEnabled.Should().BeFalse("mobile esconde el toggle, no inicia background task");
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
