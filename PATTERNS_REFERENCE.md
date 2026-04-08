# HandySuites Project Patterns Reference

> **Purpose**: Quick reference guide for implementing new features (CRUD operations, repository patterns, DI registration, endpoint mapping).
> **Last Updated**: 2026-03-01

## 1. REPOSITORY PATTERN (CategoriaClienteRepository example)

### File Structure
```
libs/HandySuites.Infrastructure/
└── Repositories/
    └── CategoriasClientes/
        ├── CategoriaClienteRepository.cs (Implementation)
        └── [Interface in Application layer]
```

### Repository Implementation Pattern

```csharp
using HandySuites.Application.{Entity}.DTOs;
using HandySuites.Application.{Entity}.Interfaces;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.{Entity}.Repositories;

public class {Entity}Repository : I{Entity}Repository
{
    private readonly HandySuitesDbContext _db;

    public {Entity}Repository(HandySuitesDbContext db)
    {
        _db = db;
    }

    // READ: List all by tenant
    public async Task<List<{Entity}Dto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.{Entities}
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .Select(c => new {Entity}Dto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion,
                Activo = c.Activo
            })
            .ToListAsync();
    }

    // READ: Get by ID (with tenant check)
    public async Task<{Entity}Dto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.{Entities}
            .AsNoTracking()
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .Select(c => new {Entity}Dto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                // ... other properties
            })
            .FirstOrDefaultAsync();
    }

    // CREATE
    public async Task<int> CrearAsync({Entity}CreateDto dto, int tenantId)
    {
        var entity = new {Entity}
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            CreadoEn = DateTime.UtcNow
        };

        _db.{Entities}.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    // UPDATE
    public async Task<bool> ActualizarAsync(int id, {Entity}CreateDto dto, int tenantId)
    {
        var entity = await _db.{Entities}
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        entity.Nombre = dto.Nombre;
        entity.Descripcion = dto.Descripcion;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    // DELETE (soft delete via SaveChangesAsync override)
    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.{Entities}
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        _db.{Entities}.Remove(entity);  // Converted to soft delete in SaveChangesAsync
        await _db.SaveChangesAsync();
        return true;
    }

    // TOGGLE ACTIVE (single)
    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.{Entities}
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    // BATCH TOGGLE
    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.{Entities}
            .Where(c => ids.Contains(c.Id) && c.TenantId == tenantId)
            .ToListAsync();

        foreach (var entity in entities)
        {
            entity.Activo = activo;
            entity.ActualizadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return entities.Count;
    }
}
```

### Key Patterns
- **AsNoTracking()**: Used on ALL read queries (no change tracking needed)
- **TenantId check**: Every query filters by `c.TenantId == tenantId`
- **Soft Delete**: `Remove()` is auto-converted to soft delete by `SaveChangesAsync()` override
- **DateTime.UtcNow**: Always UTC for timestamps
- **DTOs for output**: Never return entities directly, use DTOs
- **Return types**: `async Task<T>` for all methods (T = Dto, bool, int, List<T>)

---

## 2. DBCONTEXT CONFIGURATION (HandySuitesDbContext)

### DbSet Declarations
```csharp
// Main tenant-scoped entities
public DbSet<Cliente> Clientes => Set<Cliente>();
public DbSet<Producto> Productos => Set<Producto>();
public DbSet<Usuario> Usuarios => Set<Usuario>();

// Platform-level entities (no tenant filter)
public DbSet<Announcement> Announcements => Set<Announcement>();
public DbSet<ImpersonationSession> ImpersonationSessions => Set<ImpersonationSession>();
```

### SaveChangesAsync Override (CRITICAL)
```csharp
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    var currentUser = _tenantContext?.CurrentUserEmail;

    foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
    {
        if (entry.State == EntityState.Deleted)
        {
            // Convert hard delete to soft delete
            entry.State = EntityState.Modified;
            entry.Entity.EliminadoEn = DateTime.UtcNow;
            entry.Entity.EliminadoPor = currentUser;
        }
    }

    return await base.SaveChangesAsync(cancellationToken);
}
```

### Global Query Filters Pattern (Multi-Tenant + Soft Delete)

**For AuditableEntity with TenantId:**
```csharp
modelBuilder.Entity<Cliente>()
    .HasQueryFilter(e => (!ShouldApplyTenantFilter || e.TenantId == CurrentTenantId) && e.EliminadoEn == null);
```

**For non-AuditableEntity with TenantId:**
```csharp
modelBuilder.Entity<PromocionProducto>()
    .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);
```

**For platform-level entities (no tenant filter):**
```csharp
modelBuilder.Entity<Announcement>()
    .HasQueryFilter(e => e.EliminadoEn == null);
```

### Entity Configuration Pattern (One-to-Many)
```csharp
modelBuilder.Entity<Pedido>(entity =>
{
    entity.ToTable("Pedidos");
    entity.HasKey(p => p.Id);

    // FK relationships with delete behavior
    entity.HasOne(p => p.Tenant)
          .WithMany()
          .HasForeignKey(p => p.TenantId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(p => p.Cliente)
          .WithMany()
          .HasForeignKey(p => p.ClienteId)
          .OnDelete(DeleteBehavior.Restrict);

    // Indexes for performance
    entity.HasIndex(p => new { p.TenantId, p.NumeroPedido }).IsUnique();
    entity.HasIndex(p => new { p.TenantId, p.ClienteId });
    entity.HasIndex(p => new { p.TenantId, p.Estado });
});
```

### Index Best Practices
- **Composite indexes**: `(TenantId, FieldName)` for filtering + sorting
- **Unique constraints**: For business keys like `(TenantId, Numero)`
- **Foreign keys**: Auto-indexed by EF Core
- **Status/Date fields**: Index separately if used in WHERE/ORDER BY

---

## 3. SERVICE REGISTRATION (ServiceRegistrationExtensions)

### Structure
```csharp
public static class ServiceRegistrationExtensions
{
    public static IServiceCollection AddCustomServices(
        this IServiceCollection services, IConfiguration config)
    {
        // Tenant Context (required first)
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContextService, TenantContextService>();

        // DbContext (skip in Testing environment)
        if (environment != "Testing")
        {
            services.AddDbContext<HandySuitesDbContext>(options =>
                options.UseMySql(
                    config.GetConnectionString("DefaultConnection"),
                    new MySqlServerVersion(new Version(8, 0, 0))
                ));
        }

        // Register Repository + Service + Validator for EACH entity
        services.AddScoped<I{Entity}Repository, {Entity}Repository>();
        services.AddScoped<{Entity}Service>();
        services.AddValidatorsFromAssemblyContaining<{Entity}CreateDtoValidator>();

        return services;
    }
}
```

### Pattern for Adding New Entity Services
```csharp
// 1. Repository (Data access)
services.AddScoped<I{Entity}Repository, {Entity}Repository>();

// 2. Service (Business logic)
services.AddScoped<{Entity}Service>();

// 3. Validators (Input validation)
services.AddValidatorsFromAssemblyContaining<{Entity}CreateDtoValidator>();
```

### Special Cases

**For Authentication/Encryption Services:**
```csharp
var totpEncryptionKey = config["Totp:EncryptionKey"] ?? config["Jwt:Secret"]
    ?? throw new InvalidOperationException("Key is required");
services.AddSingleton(new TotpEncryptionService(totpEncryptionKey));
```

**For HTTP Clients:**
```csharp
services.AddHttpClient<PwnedPasswordService>();
```

**For Email/External Services:**
```csharp
services.AddSingleton<IEmailService, SendGridEmailService>();
```

---

## 4. ENDPOINT MAPPING (Program.cs)

### Pattern
```csharp
// 1. Map all endpoints for entity
app.Map{Entity}Endpoints();

// 2. Order: Dependencies first, leaf entities last
app.MapAuthEndpoints();
app.MapTenantEndpoints();
app.MapClienteEndpoints();
app.MapProductoEndpoints();
app.MapPedidoEndpoints();  // Depends on Cliente, Producto

// 3. SignalR hub at end
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
```

### Endpoint File Pattern

**File**: `apps/api/src/HandySuites.Api/Endpoints/{Entity}Endpoints.cs`

```csharp
using HandySuites.Application.{Entity}.Interfaces;
using HandySuites.Application.{Entity}.DTOs;
using HandySuites.Shared.Security;
using Microsoft.AspNetCore.Http.HttpResults;

namespace HandySuites.Api.Endpoints;

public static class {Entity}Endpoints
{
    public static void Map{Entity}Endpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/{entities}")
            .RequireAuthorization()
            .WithName("{Entity}")
            .WithOpenApi();

        group.MapGet("", GetAll)
            .WithSummary("Obtener todos");

        group.MapGet("{id}", GetById)
            .WithSummary("Obtener por ID");

        group.MapPost("", Create)
            .WithSummary("Crear")
            .RequirePermission("create_{entities}");

        group.MapPut("{id}", Update)
            .WithSummary("Actualizar")
            .RequirePermission("edit_{entities}");

        group.MapDelete("{id}", Delete)
            .WithSummary("Eliminar")
            .RequirePermission("delete_{entities}");

        // Toggle & Batch patterns
        group.MapPatch("{id}/activo", ToggleActive)
            .WithSummary("Cambiar estado activo/inactivo")
            .RequirePermission("edit_{entities}");

        group.MapPatch("batch-toggle", BatchToggleActive)
            .WithSummary("Cambiar estado masivo")
            .RequirePermission("edit_{entities}");
    }

    // GET /api/{entities}
    private static async Task<Ok<List<{Entity}Dto>>> GetAll(
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var items = await repo.ObtenerPorTenantAsync(tenant.TenantId);
        return TypedResults.Ok(items);
    }

    // GET /api/{entities}/{id}
    private static async Task<Results<Ok<{Entity}Dto>, NotFound>> GetById(
        int id,
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var item = await repo.ObtenerPorIdAsync(id, tenant.TenantId);
        return item == null ? TypedResults.NotFound() : TypedResults.Ok(item);
    }

    // POST /api/{entities}
    private static async Task<Created<int>> Create(
        {Entity}CreateDto dto,
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var id = await repo.CrearAsync(dto, tenant.TenantId);
        return TypedResults.Created($"/api/{entities}/{id}", id);
    }

    // PUT /api/{entities}/{id}
    private static async Task<Results<NoContent, NotFound, BadRequest>> Update(
        int id,
        {Entity}CreateDto dto,
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var success = await repo.ActualizarAsync(id, dto, tenant.TenantId);
        return success ? TypedResults.NoContent() : TypedResults.NotFound();
    }

    // DELETE /api/{entities}/{id}
    private static async Task<Results<NoContent, NotFound>> Delete(
        int id,
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var success = await repo.EliminarAsync(id, tenant.TenantId);
        return success ? TypedResults.NoContent() : TypedResults.NotFound();
    }

    // PATCH /api/{entities}/{id}/activo
    private static async Task<Results<NoContent, NotFound>> ToggleActive(
        int id,
        {Entity}CambiarActivoDto dto,
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var success = await repo.CambiarActivoAsync(id, dto.Activo, tenant.TenantId);
        return success ? TypedResults.NoContent() : TypedResults.NotFound();
    }

    // PATCH /api/{entities}/batch-toggle
    private static async Task<Ok<int>> BatchToggleActive(
        {Entity}BatchToggleRequest request,
        I{Entity}Repository repo,
        ICurrentTenant tenant)
    {
        var count = await repo.BatchToggleActivoAsync(request.Ids, request.Activo, tenant.TenantId);
        return TypedResults.Ok(count);
    }
}
```

### Required DTOs
```csharp
// Application/{Entity}/DTOs/{Entity}Dto.cs
public record {Entity}Dto
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Descripcion { get; set; }
    public bool Activo { get; set; }
}

public record {Entity}CreateDto
{
    public string Nombre { get; set; }
    public string Descripcion { get; set; }
}

public record {Entity}CambiarActivoDto(bool Activo);

public record {Entity}BatchToggleRequest(List<int> Ids, bool Activo);
```

---

## 5. MIDDLEWARE PATTERN

### Location
```
apps/api/src/HandySuites.Api/Middleware/{Purpose}Middleware.cs
```

### Basic Pattern
```csharp
public class {Purpose}Middleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<{Purpose}Middleware> _logger;

    public {Purpose}Middleware(RequestDelegate next, ILogger<{Purpose}Middleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, /* dependencies */)
    {
        // Pre-processing
        _logger.LogInformation("Before middleware");

        try
        {
            // Call next middleware
            await _next(context);
        }
        catch (Exception ex)
        {
            // Error handling
            _logger.LogError(ex, "Error in middleware");
            throw;
        }

        // Post-processing
        _logger.LogInformation("After middleware");
    }
}
```

### Registration Order (Critical)
```csharp
// Program.cs
app.UseForwardedHeaders();      // First: resolve real IP
app.UseResponseCompression();   // Second: compression
app.UseMiddleware<GlobalExceptionMiddleware>();  // Exception handling
app.UseMiddleware<RequestLoggingMiddleware>();   // Logging
app.UseSwaggerConfiguration();  // Swagger UI
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();        // Before Authorization
app.UseAuthorization();
app.UseMiddleware<SessionValidationMiddleware>(); // After auth
app.UseMiddleware<MaintenanceMiddleware>();      // Before endpoints
```

---

## 6. HOSTED SERVICE PATTERN (Background Workers)

### Location
```
apps/api/src/HandySuites.Api/Workers/{Purpose}Processor.cs
```

### Pattern
```csharp
public class {Purpose}Processor : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<{Purpose}Processor> _logger;

    public {Purpose}Processor(IServiceProvider serviceProvider, ILogger<{Purpose}Processor> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("{Purpose}Processor starting");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

                // Do work
                await ProcessAsync(db, stoppingToken);

                // Wait for interval
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Purpose}Processor");
            }
        }

        _logger.LogInformation("{Purpose}Processor stopped");
    }

    private async Task ProcessAsync(HandySuitesDbContext db, CancellationToken ct)
    {
        // Implementation
    }
}
```

### Registration
```csharp
// Program.cs
builder.Services.AddHostedService<{Purpose}Processor>();
```

---

## 7. MULTI-TENANT ENTITY CREATION CHECKLIST

When creating a NEW domain entity, follow this MANDATORY pattern:

### 1. Domain Entity (libs/HandySuites.Domain/Entities/)
```csharp
public class {Entity} : AuditableEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;

    // Navigation
    public Tenant Tenant { get; set; }
}
```

### 2. Add DbSet (HandySuitesDbContext.cs)
```csharp
public DbSet<{Entity}> {Entities} => Set<{Entity}>();
```

### 3. Configure in OnModelCreating
```csharp
modelBuilder.Entity<{Entity}>(entity =>
{
    entity.ToTable("{TableName}");
    entity.HasKey(e => e.Id);

    // FK to Tenant
    entity.HasOne(e => e.Tenant)
          .WithMany()
          .HasForeignKey(e => e.TenantId)
          .OnDelete(DeleteBehavior.Cascade);

    // Indexes
    entity.HasIndex(e => new { e.TenantId });
});
```

### 4. Add Global Query Filter
```csharp
modelBuilder.Entity<{Entity}>()
    .HasQueryFilter(e => (!ShouldApplyTenantFilter || e.TenantId == CurrentTenantId) && e.EliminadoEn == null);
```

### 5. EF Core Migration
```bash
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
dotnet-ef migrations add Add{Entity} \
  --project libs/HandySuites.Infrastructure \
  --startup-project apps/api/src/HandySuites.Api \
  --output-dir Migrations
```

### 6. Repository Interface (Application/{Entity}/Interfaces/)
```csharp
public interface I{Entity}Repository
{
    Task<List<{Entity}Dto>> ObtenerPorTenantAsync(int tenantId);
    Task<{Entity}Dto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync({Entity}CreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, {Entity}CreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
}
```

### 7. Service Layer (Application/{Entity}/Services/)
```csharp
public class {Entity}Service
{
    private readonly I{Entity}Repository _repo;
    private readonly ICurrentTenant _tenant;

    public {Entity}Service(I{Entity}Repository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public async Task<List<{Entity}Dto>> ObtenerTodosAsync() =>
        await _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public async Task<{Entity}Dto?> ObtenerPorIdAsync(int id) =>
        await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearAsync({Entity}CreateDto dto) =>
        await _repo.CrearAsync(dto, _tenant.TenantId);
}
```

### 8. Register in DI
```csharp
// ServiceRegistrationExtensions.cs
services.AddScoped<I{Entity}Repository, {Entity}Repository>();
services.AddScoped<{Entity}Service>();
services.AddValidatorsFromAssemblyContaining<{Entity}CreateDtoValidator>();
```

### 9. Map Endpoints
```csharp
// Program.cs
app.Map{Entity}Endpoints();
```

---

## 8. FRONTEND PATTERNS (apps/web/)

### API Service Pattern
```typescript
// services/api/{entity}.ts
import { api } from "./index";

export const {entity}Service = {
    getAll: async () => {
        const { data } = await api.get(`/api/{entities}`);
        return data;
    },

    getById: async (id: number) => {
        const { data } = await api.get(`/api/{entities}/${id}`);
        return data;
    },

    create: async (dto: {Entity}CreateDto) => {
        const { data } = await api.post(`/api/{entities}`, dto);
        return data;
    },

    update: async (id: number, dto: {Entity}CreateDto) => {
        const { data } = await api.put(`/api/{entities}/${id}`, dto);
        return data;
    },

    delete: async (id: number) => {
        await api.delete(`/api/{entities}/${id}`);
    },

    toggleActive: async (id: number, activo: boolean) => {
        await api.patch(`/api/{entities}/${id}/activo`, { activo });
    },

    batchToggle: async (ids: number[], activo: boolean) => {
        const { data } = await api.patch(`/api/{entities}/batch-toggle`,
            { ids, activo });
        return data;
    }
};
```

### Zustand Hook Pattern (with pagination)
```typescript
// hooks/use{Entity}.ts
import { create } from "zustand";
import { {entity}Service } from "@/services/api/{entity}";

interface {Entity}Store {
    items: {Entity}Dto[];
    loading: boolean;
    error: string | null;

    fetch: () => Promise<void>;
    create: (dto: {Entity}CreateDto) => Promise<void>;
    toggleActive: (id: number, activo: boolean) => Promise<void>;
}

export const use{Entity}Store = create<{Entity}Store>((set) => ({
    items: [],
    loading: false,
    error: null,

    fetch: async () => {
        try {
            set({ loading: true, error: null });
            const items = await {entity}Service.getAll();
            set({ items, loading: false });
        } catch (error) {
            set({ error: "Failed to fetch", loading: false });
        }
    },

    create: async (dto) => {
        try {
            await {entity}Service.create(dto);
            await set.fetch();
        } catch (error) {
            set({ error: "Failed to create" });
        }
    },

    toggleActive: async (id, activo) => {
        try {
            await {entity}Service.toggleActive(id, activo);
            await set.fetch();
        } catch (error) {
            set({ error: "Failed to toggle" });
        }
    }
}));
```

---

## 9. COMMON MISTAKES TO AVOID

| Mistake | Fix |
|---------|-----|
| Returning entity directly from repo | Use DTOs: `Select(e => new {Entity}Dto { ... })` |
| Forgetting `AsNoTracking()` on reads | Add `.AsNoTracking()` to all GET queries |
| Forgetting tenant check in queries | Add `.Where(e => e.TenantId == tenantId)` |
| Using default active-only filter in list repo | Remove else clause: just query the filter condition |
| Hard deleting entities | Use `.Remove()` — SaveChangesAsync converts to soft delete |
| Forgetting UpdatedAt timestamp | Always set `entity.ActualizadoEn = DateTime.UtcNow` on updates |
| Not registering in DI | Add to ServiceRegistrationExtensions: repo, service, validators |
| API patch using POST | Use `api.patch()` in frontend, `MapPatch` in backend |
| Forgetting permission checks | Add `.RequirePermission("action_resource")` to endpoints |
| Global query filter on platform-level entity | Skip filter for Announcement, ImpersonationSession, CrashReport |

---

## 10. TESTING PATTERNS

### Test Setup (CustomWebApplicationFactory)
```csharp
public class CustomWebApplicationFactory<TProgram>
    : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove real DbContext
            var descriptor = services.FirstOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<HandySuitesDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Add test DbContext (SQLite)
            services.AddDbContext<HandySuitesDbContext>(options =>
                options.UseSqlite("DataSource=:memory:"));

            // Create schema
            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            db.Database.EnsureCreated();
        });
    }
}
```

### Integration Test Pattern
```csharp
[TestClass]
public class {Entity}EndpointTests
{
    private CustomWebApplicationFactory<Program> _factory;
    private HttpClient _client;

    [TestInitialize]
    public void Setup()
    {
        _factory = new CustomWebApplicationFactory<Program>();
        _client = _factory.CreateClient();
    }

    [TestMethod]
    public async Task Get_Returns_Ok()
    {
        // Act
        var response = await _client.GetAsync("/api/{entities}");

        // Assert
        Assert.AreEqual(200, (int)response.StatusCode);
    }
}
```

---

## 11. QUICK CHECKLIST FOR NEW FEATURES

- [ ] Create Domain entity inheriting `AuditableEntity`
- [ ] Add `DbSet<T>` to HandySuitesDbContext
- [ ] Configure in `OnModelCreating` with FK and indexes
- [ ] Add global query filter with tenant check + soft delete
- [ ] Generate EF Core migration and verify
- [ ] Create Repository interface with all CRUD methods
- [ ] Implement Repository with proper async/await
- [ ] Create Service layer wrapping Repository
- [ ] Create DTOs (Dto, CreateDto, Toggles, Batch)
- [ ] Register in ServiceRegistrationExtensions
- [ ] Create Endpoints file with MapGroup pattern
- [ ] Add endpoint mapping to Program.cs
- [ ] Create Frontend service with axios calls
- [ ] Create Zustand hook for state management
- [ ] Build React page using Shadcn table/form components
- [ ] Test with E2E via Playwright
- [ ] Run all tests before commit
- [ ] Create migration and verify locally
- [ ] Commit with clear message
- [ ] Push when ready

