using HandySales.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Persistence;

public class HandySalesDbContext : DbContext
{
    private readonly ITenantContextService? _tenantContext;

    public HandySalesDbContext(DbContextOptions<HandySalesDbContext> options) : base(options) { }

    public HandySalesDbContext(DbContextOptions<HandySalesDbContext> options, ITenantContextService tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    // Propiedad para usar en Global Query Filters
    private int? CurrentTenantId => _tenantContext?.TenantId;
    private bool ShouldApplyTenantFilter => _tenantContext?.ShouldApplyFilter ?? false;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<HandySales.Domain.Entities.Inventario> Inventarios => Set<HandySales.Domain.Entities.Inventario>();
    public DbSet<MovimientoInventario> MovimientosInventario => Set<MovimientoInventario>();
    public DbSet<ListaPrecio> ListasPrecios => Set<ListaPrecio>();
    public DbSet<PrecioPorProducto> PreciosPorProducto => Set<PrecioPorProducto>();
    public DbSet<DescuentoPorCantidad> DescuentosPorCantidad => Set<DescuentoPorCantidad>();
    public DbSet<Promocion> Promociones => Set<Promocion>();
    public DbSet<PromocionProducto> PromocionProductos => Set<PromocionProducto>();
    public DbSet<Zona> Zonas => Set<Zona>();
    public DbSet<FamiliaProducto> FamiliasProductos => Set<FamiliaProducto>();
    public DbSet<CategoriaCliente> CategoriasClientes => Set<CategoriaCliente>();
    public DbSet<CategoriaProducto> CategoriasProductos => Set<CategoriaProducto>();
    public DbSet<UnidadMedida> UnidadesMedida => Set<UnidadMedida>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<CompanySetting> CompanySettings => Set<CompanySetting>();
    public DbSet<Domain.Entities.DatosEmpresa> DatosEmpresa => Set<Domain.Entities.DatosEmpresa>();
    public DbSet<Domain.Entities.DatosFacturacion> DatosFacturacion => Set<Domain.Entities.DatosFacturacion>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<Domain.Entities.GlobalSettings> GlobalSettings => Set<Domain.Entities.GlobalSettings>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<DetallePedido> DetallePedidos => Set<DetallePedido>();
    public DbSet<ClienteVisita> ClienteVisitas => Set<ClienteVisita>();
    public DbSet<DeviceSession> DeviceSessions => Set<DeviceSession>();
    public DbSet<RutaVendedor> RutasVendedor => Set<RutaVendedor>();
    public DbSet<RutaDetalle> RutasDetalle => Set<RutaDetalle>();
    public DbSet<RutaCarga> RutasCarga => Set<RutaCarga>();
    public DbSet<RutaPedido> RutasPedidos => Set<RutaPedido>();
    public DbSet<RutaRetornoInventario> RutasRetornoInventario => Set<RutaRetornoInventario>();
    public DbSet<NotificationHistory> NotificationHistory => Set<NotificationHistory>();
    public DbSet<Cobro> Cobros => Set<Cobro>();
    public DbSet<TwoFactorRecoveryCode> TwoFactorRecoveryCodes => Set<TwoFactorRecoveryCode>();

    public DbSet<ScheduledAction> ScheduledActions => Set<ScheduledAction>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();

    // Platform-level (sin filtro de tenant)
    public DbSet<ImpersonationSession> ImpersonationSessions => Set<ImpersonationSession>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<AnnouncementDismissal> AnnouncementDismissals => Set<AnnouncementDismissal>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        //modelBuilder.Entity<Tenant>().ToTable("Tenants");
        //modelBuilder.Entity<Cliente>().ToTable("Clientes");
        //modelBuilder.Entity<Producto>().ToTable("Productos");
        //modelBuilder.Entity<Usuario>().ToTable("Usuarios");
        //modelBuilder.Entity<HandySales.Domain.Entities.Inventario>().ToTable("Inventario");
        //modelBuilder.Entity<ListaPrecio>().ToTable("ListasPrecios");
        //modelBuilder.Entity<PrecioPorProducto>().ToTable("PreciosPorProducto");
        //modelBuilder.Entity<DescuentoPorCantidad>().ToTable("DescuentosPorCantidad");
        //modelBuilder.Entity<Promocion>().ToTable("Promociones");

        // Configure RefreshToken explicitly
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasOne(rt => rt.Usuario)
                  .WithMany()
                  .HasForeignKey(rt => rt.UserId)
                  .HasPrincipalKey(u => u.Id);
        });

        // Configure Producto relationships explicitly
        modelBuilder.Entity<Producto>(entity =>
        {
            // Familia relationship
            entity.HasOne(p => p.Familia)
                  .WithMany()
                  .HasForeignKey(p => p.FamiliaId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Categoria relationship (note: property name is CategoraId - typo in DB)
            entity.HasOne(p => p.Categoria)
                  .WithMany(cp => cp.Productos)
                  .HasForeignKey(p => p.CategoraId)
                  .OnDelete(DeleteBehavior.Restrict);

            // UnidadMedida relationship
            entity.HasOne(p => p.UnidadMedida)
                  .WithMany(um => um.Productos)
                  .HasForeignKey(p => p.UnidadMedidaId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Inventario relationship (one-to-one)
            entity.HasOne(p => p.Inventario)
                  .WithOne(i => i.Producto)
                  .HasForeignKey<HandySales.Domain.Entities.Inventario>(i => i.ProductoId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Role entity
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Nombre).HasMaxLength(50).IsRequired();
            entity.Property(r => r.Descripcion).HasColumnType("TEXT");
            entity.Property(r => r.Activo).HasDefaultValue(true);
            entity.HasIndex(r => r.Nombre).IsUnique();
        });
        
        // Configure Usuario-Role relationship
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasOne(u => u.Role)
                  .WithMany(r => r.Usuarios)
                  .HasForeignKey(u => u.RoleId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
        
        // Configure DatosFacturacion entity
        modelBuilder.Entity<Domain.Entities.DatosFacturacion>(entity =>
        {
            entity.ToTable("datos_facturacion");
            entity.HasKey(df => df.Id);
            
            // Relación con Tenant
            entity.HasOne(df => df.Tenant)
                  .WithMany()
                  .HasForeignKey(df => df.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            // Índices únicos
            entity.HasIndex(df => new { df.TenantId, df.RFC }).IsUnique();
        });
        
        // Configure NotificationPreference entity
        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.ToTable("notification_preferences");
            entity.HasKey(np => np.Id);
            
            // Relación con Usuario
            entity.HasOne(np => np.User)
                  .WithMany()
                  .HasForeignKey(np => np.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            // Relación con Tenant
            entity.HasOne(np => np.Tenant)
                  .WithMany()
                  .HasForeignKey(np => np.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            // Índice único por usuario y tenant
            entity.HasIndex(np => new { np.TenantId, np.UserId }).IsUnique();
        });

        // Configure Pedido entity
        modelBuilder.Entity<Pedido>(entity =>
        {
            entity.ToTable("Pedidos");
            entity.HasKey(p => p.Id);

            // Relación con Tenant
            entity.HasOne(p => p.Tenant)
                  .WithMany()
                  .HasForeignKey(p => p.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Cliente
            entity.HasOne(p => p.Cliente)
                  .WithMany()
                  .HasForeignKey(p => p.ClienteId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con Usuario
            entity.HasOne(p => p.Usuario)
                  .WithMany()
                  .HasForeignKey(p => p.UsuarioId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con ListaPrecio
            entity.HasOne(p => p.ListaPrecio)
                  .WithMany()
                  .HasForeignKey(p => p.ListaPrecioId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Índices
            entity.HasIndex(p => new { p.TenantId, p.NumeroPedido }).IsUnique();
            entity.HasIndex(p => new { p.TenantId, p.ClienteId });
            entity.HasIndex(p => new { p.TenantId, p.UsuarioId });
            entity.HasIndex(p => new { p.TenantId, p.Estado });
            entity.HasIndex(p => new { p.TenantId, p.FechaPedido });
        });

        // Configure DetallePedido entity
        modelBuilder.Entity<DetallePedido>(entity =>
        {
            entity.ToTable("DetallePedidos");
            entity.HasKey(dp => dp.Id);

            // Relación con Pedido
            entity.HasOne(dp => dp.Pedido)
                  .WithMany(p => p.Detalles)
                  .HasForeignKey(dp => dp.PedidoId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Producto
            entity.HasOne(dp => dp.Producto)
                  .WithMany()
                  .HasForeignKey(dp => dp.ProductoId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Índices
            entity.HasIndex(dp => new { dp.PedidoId, dp.ProductoId });
        });

        // Configure ClienteVisita entity
        modelBuilder.Entity<ClienteVisita>(entity =>
        {
            entity.ToTable("ClienteVisitas");
            entity.HasKey(cv => cv.Id);

            // Relación con Tenant
            entity.HasOne(cv => cv.Tenant)
                  .WithMany()
                  .HasForeignKey(cv => cv.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Cliente
            entity.HasOne(cv => cv.Cliente)
                  .WithMany()
                  .HasForeignKey(cv => cv.ClienteId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con Usuario
            entity.HasOne(cv => cv.Usuario)
                  .WithMany()
                  .HasForeignKey(cv => cv.UsuarioId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con Pedido (opcional)
            entity.HasOne(cv => cv.Pedido)
                  .WithMany()
                  .HasForeignKey(cv => cv.PedidoId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Índices
            entity.HasIndex(cv => new { cv.TenantId, cv.ClienteId });
            entity.HasIndex(cv => new { cv.TenantId, cv.UsuarioId });
            entity.HasIndex(cv => new { cv.TenantId, cv.FechaProgramada });
            entity.HasIndex(cv => new { cv.TenantId, cv.FechaHoraInicio });
        });

        // Configure DeviceSession entity
        modelBuilder.Entity<DeviceSession>(entity =>
        {
            entity.ToTable("DeviceSessions");
            entity.HasKey(ds => ds.Id);

            // Relación con Tenant
            entity.HasOne(ds => ds.Tenant)
                  .WithMany()
                  .HasForeignKey(ds => ds.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Usuario
            entity.HasOne(ds => ds.Usuario)
                  .WithMany()
                  .HasForeignKey(ds => ds.UsuarioId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con RefreshToken (opcional)
            entity.HasOne(ds => ds.RefreshToken)
                  .WithMany()
                  .HasForeignKey(ds => ds.RefreshTokenId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Índices
            entity.HasIndex(ds => new { ds.TenantId, ds.UsuarioId });
            entity.HasIndex(ds => new { ds.TenantId, ds.DeviceId });
            entity.HasIndex(ds => new { ds.TenantId, ds.Status });
            entity.HasIndex(ds => ds.LastActivity);
        });

        // Configure RutaVendedor entity
        modelBuilder.Entity<RutaVendedor>(entity =>
        {
            entity.ToTable("RutasVendedor");
            entity.HasKey(rv => rv.Id);

            // Relación con Tenant
            entity.HasOne(rv => rv.Tenant)
                  .WithMany()
                  .HasForeignKey(rv => rv.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Usuario
            entity.HasOne(rv => rv.Usuario)
                  .WithMany()
                  .HasForeignKey(rv => rv.UsuarioId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con Zona (opcional)
            entity.HasOne(rv => rv.Zona)
                  .WithMany()
                  .HasForeignKey(rv => rv.ZonaId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Índices
            entity.HasIndex(rv => new { rv.TenantId, rv.UsuarioId });
            entity.HasIndex(rv => new { rv.TenantId, rv.Fecha });
            entity.HasIndex(rv => new { rv.TenantId, rv.Estado });
            entity.HasIndex(rv => new { rv.TenantId, rv.ZonaId });
        });

        // Configure RutaDetalle entity
        modelBuilder.Entity<RutaDetalle>(entity =>
        {
            entity.ToTable("RutasDetalle");
            entity.HasKey(rd => rd.Id);

            // Relación con RutaVendedor
            entity.HasOne(rd => rd.Ruta)
                  .WithMany(rv => rv.Detalles)
                  .HasForeignKey(rd => rd.RutaId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Cliente
            entity.HasOne(rd => rd.Cliente)
                  .WithMany()
                  .HasForeignKey(rd => rd.ClienteId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con ClienteVisita (opcional)
            entity.HasOne(rd => rd.Visita)
                  .WithMany()
                  .HasForeignKey(rd => rd.VisitaId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Relación con Pedido (opcional)
            entity.HasOne(rd => rd.Pedido)
                  .WithMany()
                  .HasForeignKey(rd => rd.PedidoId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Índices
            entity.HasIndex(rd => new { rd.RutaId, rd.OrdenVisita });
            entity.HasIndex(rd => new { rd.RutaId, rd.ClienteId });
            entity.HasIndex(rd => rd.Estado);
        });

        // Configure RutaCarga entity
        modelBuilder.Entity<RutaCarga>(entity =>
        {
            entity.ToTable("RutasCarga");
            entity.HasKey(rc => rc.Id);

            entity.HasOne(rc => rc.Ruta)
                  .WithMany(rv => rv.Cargas)
                  .HasForeignKey(rc => rc.RutaId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rc => rc.Producto)
                  .WithMany()
                  .HasForeignKey(rc => rc.ProductoId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(rc => rc.Tenant)
                  .WithMany()
                  .HasForeignKey(rc => rc.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(rc => rc.RutaId);
            entity.HasIndex(rc => new { rc.TenantId, rc.RutaId });
            entity.HasIndex(rc => new { rc.RutaId, rc.ProductoId }).IsUnique();
        });

        // Configure RutaPedido entity
        modelBuilder.Entity<RutaPedido>(entity =>
        {
            entity.ToTable("RutasPedidos");
            entity.HasKey(rp => rp.Id);

            entity.HasOne(rp => rp.Ruta)
                  .WithMany(rv => rv.PedidosAsignados)
                  .HasForeignKey(rp => rp.RutaId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rp => rp.Pedido)
                  .WithMany()
                  .HasForeignKey(rp => rp.PedidoId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(rp => rp.Tenant)
                  .WithMany()
                  .HasForeignKey(rp => rp.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(rp => rp.RutaId);
            entity.HasIndex(rp => new { rp.TenantId, rp.RutaId });
            entity.HasIndex(rp => new { rp.RutaId, rp.PedidoId }).IsUnique();
        });

        // Configure RutaRetornoInventario entity
        modelBuilder.Entity<RutaRetornoInventario>(entity =>
        {
            entity.ToTable("RutasRetornoInventario");
            entity.HasKey(ri => ri.Id);

            entity.HasOne(ri => ri.Ruta)
                  .WithMany(rv => rv.RetornoInventario)
                  .HasForeignKey(ri => ri.RutaId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ri => ri.Producto)
                  .WithMany()
                  .HasForeignKey(ri => ri.ProductoId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ri => ri.Tenant)
                  .WithMany()
                  .HasForeignKey(ri => ri.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(ri => ri.RutaId);
            entity.HasIndex(ri => new { ri.TenantId, ri.RutaId });
            entity.HasIndex(ri => new { ri.RutaId, ri.ProductoId }).IsUnique();
        });

        // Configure NotificationHistory entity
        modelBuilder.Entity<NotificationHistory>(entity =>
        {
            entity.ToTable("NotificationHistory");
            entity.HasKey(nh => nh.Id);

            // Relación con Tenant
            entity.HasOne(nh => nh.Tenant)
                  .WithMany()
                  .HasForeignKey(nh => nh.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Usuario (opcional)
            entity.HasOne(nh => nh.Usuario)
                  .WithMany()
                  .HasForeignKey(nh => nh.UsuarioId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Relación con DeviceSession (opcional)
            entity.HasOne(nh => nh.DeviceSession)
                  .WithMany()
                  .HasForeignKey(nh => nh.DeviceSessionId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Índices
            entity.HasIndex(nh => new { nh.TenantId, nh.UsuarioId });
            entity.HasIndex(nh => new { nh.TenantId, nh.Status });
            entity.HasIndex(nh => new { nh.TenantId, nh.Tipo });
            entity.HasIndex(nh => nh.CreadoEn);
        });

        // Configure ImpersonationSession entity (Platform-level - NO tenant filter)
        modelBuilder.Entity<ImpersonationSession>(entity =>
        {
            entity.ToTable("ImpersonationSessions");
            entity.HasKey(ims => ims.Id);

            // Propiedades
            entity.Property(ims => ims.SuperAdminEmail).HasMaxLength(255).IsRequired();
            entity.Property(ims => ims.SuperAdminName).HasMaxLength(255).IsRequired();
            entity.Property(ims => ims.TargetTenantName).HasMaxLength(255).IsRequired();
            entity.Property(ims => ims.Reason).HasMaxLength(1000).IsRequired();
            entity.Property(ims => ims.TicketNumber).HasMaxLength(100);
            entity.Property(ims => ims.AccessLevel).HasMaxLength(20).IsRequired();
            entity.Property(ims => ims.IpAddress).HasMaxLength(45).IsRequired();
            entity.Property(ims => ims.UserAgent).HasMaxLength(500);
            entity.Property(ims => ims.Status).HasMaxLength(20).IsRequired();
            entity.Property(ims => ims.ActionsPerformed).HasColumnType("json");
            entity.Property(ims => ims.PagesVisited).HasColumnType("json");

            // Relación con Usuario (SuperAdmin)
            entity.HasOne(ims => ims.SuperAdmin)
                  .WithMany()
                  .HasForeignKey(ims => ims.SuperAdminId)
                  .OnDelete(DeleteBehavior.Restrict); // No eliminar usuario si tiene sesiones

            // Relación con Tenant
            entity.HasOne(ims => ims.TargetTenant)
                  .WithMany()
                  .HasForeignKey(ims => ims.TargetTenantId)
                  .OnDelete(DeleteBehavior.Restrict); // Conservar historial incluso si tenant se elimina

            // Índices para búsqueda rápida
            entity.HasIndex(ims => ims.SuperAdminId);
            entity.HasIndex(ims => ims.TargetTenantId);
            entity.HasIndex(ims => ims.Status);
            entity.HasIndex(ims => ims.StartedAt);
            entity.HasIndex(ims => new { ims.SuperAdminId, ims.Status });
            entity.HasIndex(ims => new { ims.TargetTenantId, ims.Status });
        });
        // Configure Cobro entity
        modelBuilder.Entity<Cobro>(entity =>
        {
            entity.ToTable("Cobros");
            entity.HasKey(c => c.Id);

            // Relación con Tenant
            entity.HasOne(c => c.Tenant)
                  .WithMany()
                  .HasForeignKey(c => c.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relación con Pedido
            entity.HasOne(c => c.Pedido)
                  .WithMany()
                  .HasForeignKey(c => c.PedidoId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con Cliente
            entity.HasOne(c => c.Cliente)
                  .WithMany()
                  .HasForeignKey(c => c.ClienteId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Relación con Usuario
            entity.HasOne(c => c.Usuario)
                  .WithMany()
                  .HasForeignKey(c => c.UsuarioId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Índices
            entity.HasIndex(c => new { c.TenantId, c.ClienteId });
            entity.HasIndex(c => new { c.TenantId, c.PedidoId });
            entity.HasIndex(c => new { c.TenantId, c.UsuarioId });
            entity.HasIndex(c => new { c.TenantId, c.FechaCobro });
        });

        // Configure TwoFactorRecoveryCode entity
        modelBuilder.Entity<TwoFactorRecoveryCode>(entity =>
        {
            entity.ToTable("TwoFactorRecoveryCodes");
            entity.HasKey(rc => rc.Id);

            entity.HasOne(rc => rc.Usuario)
                  .WithMany()
                  .HasForeignKey(rc => rc.UsuarioId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(rc => rc.UsuarioId);
        });

        // Configure Announcement entity (platform-level, no tenant filter)
        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.ToTable("Announcements");
            entity.HasKey(a => a.Id);

            entity.HasOne(a => a.SuperAdmin)
                  .WithMany()
                  .HasForeignKey(a => a.SuperAdminId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => a.Tipo);
            entity.HasIndex(a => a.ExpiresAt);
            entity.HasIndex(a => a.Activo);
        });

        // Configure AnnouncementDismissal entity
        modelBuilder.Entity<AnnouncementDismissal>(entity =>
        {
            entity.ToTable("AnnouncementDismissals");
            entity.HasKey(d => d.Id);

            entity.HasOne(d => d.Announcement)
                  .WithMany(a => a.Dismissals)
                  .HasForeignKey(d => d.AnnouncementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Usuario)
                  .WithMany()
                  .HasForeignKey(d => d.UsuarioId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(d => new { d.AnnouncementId, d.UsuarioId }).IsUnique();
        });

        // NOTA: ImpersonationSessions NO tiene Global Query Filter porque es platform-level
        // NOTA: Announcements NO tiene Global Query Filter porque es platform-level

        // =====================================================
        // GLOBAL QUERY FILTERS - Multi-Tenant Security
        // Filtran automáticamente por tenant_id en todas las queries.
        // Para deshabilitar: usar .IgnoreQueryFilters() en la query.
        // =====================================================

        // Entidades principales con TenantId
        modelBuilder.Entity<Cliente>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<Producto>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<Usuario>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<HandySales.Domain.Entities.Inventario>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<ListaPrecio>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<PrecioPorProducto>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<DescuentoPorCantidad>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<Promocion>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<PromocionProducto>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<Zona>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<FamiliaProducto>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<CategoriaCliente>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<CategoriaProducto>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<UnidadMedida>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        // Entidades de auditoría y configuración
        modelBuilder.Entity<ActivityLog>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<CompanySetting>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<Domain.Entities.DatosEmpresa>(entity =>
        {
            entity.HasIndex(d => d.TenantId).IsUnique();
            entity.HasOne(d => d.Tenant)
                  .WithOne(t => t.DatosEmpresa)
                  .HasForeignKey<Domain.Entities.DatosEmpresa>(d => d.TenantId);
            entity.HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Domain.Entities.DatosFacturacion>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<NotificationPreference>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        // Entidades de móvil (Fase 1-3)
        modelBuilder.Entity<Pedido>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<ClienteVisita>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<DeviceSession>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<RutaVendedor>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<RutaCarga>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<RutaPedido>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<RutaRetornoInventario>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<NotificationHistory>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        modelBuilder.Entity<Cobro>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);

        // Company tiene TenantId (es el mismo que su Id en algunos casos)
        modelBuilder.Entity<Company>()
            .HasQueryFilter(e => !ShouldApplyTenantFilter || e.TenantId == CurrentTenantId);
    }
}
