using Microsoft.EntityFrameworkCore;
using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Data;

public class BillingDbContext : DbContext
{
    public BillingDbContext(DbContextOptions<BillingDbContext> options) : base(options) { }

    public DbSet<ConfiguracionFiscal> ConfiguracionesFiscales { get; set; }
    public DbSet<TipoComprobante> TiposComprobante { get; set; }
    public DbSet<MetodoPago> MetodosPago { get; set; }
    public DbSet<FormaPago> FormasPago { get; set; }
    public DbSet<UsoCfdi> UsosCfdi { get; set; }
    public DbSet<Factura> Facturas { get; set; }
    public DbSet<DetalleFactura> DetallesFactura { get; set; }
    public DbSet<ImpuestoFactura> ImpuestosFactura { get; set; }
    public DbSet<ComplementoPago> ComplementosPago { get; set; }
    public DbSet<DocumentoRelacionado> DocumentosRelacionados { get; set; }
    public DbSet<NumeracionDocumento> NumeracionDocumentos { get; set; }
    public DbSet<AuditoriaFacturacion> AuditoriaFacturacion { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuración de tablas
        modelBuilder.Entity<ConfiguracionFiscal>().ToTable("configuracion_fiscal");
        modelBuilder.Entity<TipoComprobante>().ToTable("tipos_comprobante");
        modelBuilder.Entity<MetodoPago>().ToTable("metodos_pago");
        modelBuilder.Entity<FormaPago>().ToTable("formas_pago");
        modelBuilder.Entity<UsoCfdi>().ToTable("usos_cfdi");
        modelBuilder.Entity<Factura>().ToTable("facturas");
        modelBuilder.Entity<DetalleFactura>().ToTable("detalle_facturas");
        modelBuilder.Entity<ImpuestoFactura>().ToTable("impuestos_factura");
        modelBuilder.Entity<ComplementoPago>().ToTable("complementos_pago");
        modelBuilder.Entity<DocumentoRelacionado>().ToTable("documentos_relacionados");
        modelBuilder.Entity<NumeracionDocumento>().ToTable("numeracion_documentos");
        modelBuilder.Entity<AuditoriaFacturacion>().ToTable("auditoria_facturacion");

        // Configuración de índices únicos
        modelBuilder.Entity<Factura>()
            .HasIndex(f => f.Uuid)
            .IsUnique();

        modelBuilder.Entity<Factura>()
            .HasIndex(f => new { f.Serie, f.Folio });

        modelBuilder.Entity<NumeracionDocumento>()
            .HasIndex(n => new { n.TenantId, n.TipoDocumento, n.Serie })
            .IsUnique();

        // Configuración de relaciones
        modelBuilder.Entity<DetalleFactura>()
            .HasOne(d => d.Factura)
            .WithMany(f => f.Detalles)
            .HasForeignKey(d => d.FacturaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ImpuestoFactura>()
            .HasOne(i => i.Factura)
            .WithMany(f => f.Impuestos)
            .HasForeignKey(i => i.FacturaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ImpuestoFactura>()
            .HasOne(i => i.DetalleFactura)
            .WithMany(d => d.Impuestos)
            .HasForeignKey(i => i.DetalleFacturaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ComplementoPago>()
            .HasOne(c => c.Factura)
            .WithMany(f => f.ComplementosPago)
            .HasForeignKey(c => c.FacturaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DocumentoRelacionado>()
            .HasOne(d => d.Factura)
            .WithMany(f => f.DocumentosRelacionados)
            .HasForeignKey(d => d.FacturaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configuración de precisión decimal
        modelBuilder.Entity<Factura>(entity =>
        {
            entity.Property(f => f.Subtotal).HasPrecision(18, 2);
            entity.Property(f => f.Descuento).HasPrecision(18, 2);
            entity.Property(f => f.TotalImpuestosTrasladados).HasPrecision(18, 2);
            entity.Property(f => f.TotalImpuestosRetenidos).HasPrecision(18, 2);
            entity.Property(f => f.Total).HasPrecision(18, 2);
            entity.Property(f => f.TipoCambio).HasPrecision(10, 4);
        });

        modelBuilder.Entity<DetalleFactura>(entity =>
        {
            entity.Property(d => d.Cantidad).HasPrecision(18, 6);
            entity.Property(d => d.ValorUnitario).HasPrecision(18, 6);
            entity.Property(d => d.Importe).HasPrecision(18, 2);
            entity.Property(d => d.Descuento).HasPrecision(18, 2);
        });

        modelBuilder.Entity<ImpuestoFactura>(entity =>
        {
            entity.Property(i => i.TasaOCuota).HasPrecision(10, 6);
            entity.Property(i => i.Base).HasPrecision(18, 2);
            entity.Property(i => i.Importe).HasPrecision(18, 2);
        });

        modelBuilder.Entity<ComplementoPago>(entity =>
        {
            entity.Property(c => c.Monto).HasPrecision(18, 2);
            entity.Property(c => c.TipoCambio).HasPrecision(10, 4);
        });
    }
}