using HandySales.Application.Tenants.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;

namespace HandySales.Infrastructure.Tenants.Services;

public class TenantSeedService : ITenantSeedService
{
    private readonly HandySalesDbContext _db;

    public TenantSeedService(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task SeedDemoDataAsync(int tenantId)
    {
        // Zonas
        var zonas = new[]
        {
            new Zona { TenantId = tenantId, Nombre = "Zona Centro", Descripcion = "Área central de la ciudad" },
            new Zona { TenantId = tenantId, Nombre = "Zona Norte", Descripcion = "Área norte de la ciudad" },
            new Zona { TenantId = tenantId, Nombre = "Zona Sur", Descripcion = "Área sur de la ciudad" },
            new Zona { TenantId = tenantId, Nombre = "Zona Oriente", Descripcion = "Área oriente de la ciudad" },
        };
        _db.Zonas.AddRange(zonas);
        await _db.SaveChangesAsync();

        // Categorías de clientes
        var categoriasCliente = new[]
        {
            new CategoriaCliente { TenantId = tenantId, Nombre = "Mayorista", Descripcion = "Clientes de compra al mayoreo" },
            new CategoriaCliente { TenantId = tenantId, Nombre = "Minorista", Descripcion = "Clientes de compra al menudeo" },
            new CategoriaCliente { TenantId = tenantId, Nombre = "Premium", Descripcion = "Clientes de alto valor" },
            new CategoriaCliente { TenantId = tenantId, Nombre = "Nuevo", Descripcion = "Clientes recién registrados" },
        };
        _db.CategoriasClientes.AddRange(categoriasCliente);
        await _db.SaveChangesAsync();

        // Familias de productos
        var familias = new[]
        {
            new FamiliaProducto { TenantId = tenantId, Nombre = "Abarrotes", Descripcion = "Productos de abarrotes y granos" },
            new FamiliaProducto { TenantId = tenantId, Nombre = "Bebidas", Descripcion = "Refrescos, aguas y jugos" },
            new FamiliaProducto { TenantId = tenantId, Nombre = "Lácteos", Descripcion = "Leche, quesos y derivados" },
            new FamiliaProducto { TenantId = tenantId, Nombre = "Limpieza", Descripcion = "Productos de limpieza del hogar" },
            new FamiliaProducto { TenantId = tenantId, Nombre = "Botanas", Descripcion = "Frituras, galletas y snacks" },
        };
        _db.FamiliasProductos.AddRange(familias);
        await _db.SaveChangesAsync();

        // Categorías de productos
        var categoriasProducto = new[]
        {
            new CategoriaProducto { TenantId = tenantId, Nombre = "Secos", Descripcion = "Productos secos y no perecederos" },
            new CategoriaProducto { TenantId = tenantId, Nombre = "Líquidos", Descripcion = "Bebidas y líquidos" },
            new CategoriaProducto { TenantId = tenantId, Nombre = "Refrigerados", Descripcion = "Requieren refrigeración" },
            new CategoriaProducto { TenantId = tenantId, Nombre = "No perecederos", Descripcion = "Larga vida de anaquel" },
        };
        _db.CategoriasProductos.AddRange(categoriasProducto);
        await _db.SaveChangesAsync();

        // Unidades de medida
        var unidades = new[]
        {
            new UnidadMedida { TenantId = tenantId, Nombre = "Pieza", Abreviatura = "pza" },
            new UnidadMedida { TenantId = tenantId, Nombre = "Kilogramo", Abreviatura = "kg" },
            new UnidadMedida { TenantId = tenantId, Nombre = "Gramo", Abreviatura = "g" },
            new UnidadMedida { TenantId = tenantId, Nombre = "Litro", Abreviatura = "L" },
            new UnidadMedida { TenantId = tenantId, Nombre = "Caja", Abreviatura = "cja" },
            new UnidadMedida { TenantId = tenantId, Nombre = "Paquete", Abreviatura = "paq" },
            new UnidadMedida { TenantId = tenantId, Nombre = "Botella", Abreviatura = "bot" },
        };
        _db.UnidadesMedida.AddRange(unidades);
        await _db.SaveChangesAsync();

        // Lista de precios default
        var listaPrecio = new ListaPrecio
        {
            TenantId = tenantId,
            Nombre = "Precio General",
            Descripcion = "Lista de precios predeterminada"
        };
        _db.ListasPrecios.Add(listaPrecio);
        await _db.SaveChangesAsync();

        // Clientes demo
        var clientes = new[]
        {
            new Cliente
            {
                TenantId = tenantId, Nombre = "Abarrotes Don José", RFC = "ADJ010101AAA",
                Correo = "contacto@abarrotes-donjose.com", Telefono = "555-100-2000",
                Direccion = "Av. Independencia 123, Col. Centro", IdZona = zonas[0].Id,
                CategoriaClienteId = categoriasCliente[1].Id // Minorista
            },
            new Cliente
            {
                TenantId = tenantId, Nombre = "Mini Super La Esquina", RFC = "MSE020202BBB",
                Correo = "ventas@minisuper-esquina.com", Telefono = "555-200-3000",
                Direccion = "Calle Reforma 456, Col. Norte", IdZona = zonas[1].Id,
                CategoriaClienteId = categoriasCliente[1].Id // Minorista
            },
            new Cliente
            {
                TenantId = tenantId, Nombre = "Supermercado Express", RFC = "SEX030303CCC",
                Correo = "compras@super-express.com", Telefono = "555-300-4000",
                Direccion = "Blvd. Las Torres 789, Col. Sur", IdZona = zonas[2].Id,
                CategoriaClienteId = categoriasCliente[0].Id // Mayorista
            },
            new Cliente
            {
                TenantId = tenantId, Nombre = "Tienda El Sol", RFC = "TES040404DDD",
                Correo = "tienda@elsol.com", Telefono = "555-400-5000",
                Direccion = "Av. Oriente 321, Col. Oriente", IdZona = zonas[3].Id,
                CategoriaClienteId = categoriasCliente[3].Id // Nuevo
            },
        };
        _db.Clientes.AddRange(clientes);
        await _db.SaveChangesAsync();

        // Productos demo (12 productos across families)
        var productos = new[]
        {
            // Abarrotes (familia[0], categoría Secos[0])
            new Producto { TenantId = tenantId, Nombre = "Arroz Grano Largo 1kg", CodigoBarra = "DEMO-ARR-001", Descripcion = "Arroz grano largo premium", FamiliaId = familias[0].Id, CategoraId = categoriasProducto[0].Id, UnidadMedidaId = unidades[0].Id, PrecioBase = 28.50m },
            new Producto { TenantId = tenantId, Nombre = "Frijol Negro 1kg", CodigoBarra = "DEMO-FRI-002", Descripcion = "Frijol negro de primera", FamiliaId = familias[0].Id, CategoraId = categoriasProducto[0].Id, UnidadMedidaId = unidades[0].Id, PrecioBase = 35.00m },
            new Producto { TenantId = tenantId, Nombre = "Aceite Vegetal 1L", CodigoBarra = "DEMO-ACE-003", Descripcion = "Aceite vegetal comestible", FamiliaId = familias[0].Id, CategoraId = categoriasProducto[1].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 42.00m },
            // Bebidas (familia[1], categoría Líquidos[1])
            new Producto { TenantId = tenantId, Nombre = "Refresco Cola 600ml", CodigoBarra = "DEMO-REF-004", Descripcion = "Refresco de cola 600ml", FamiliaId = familias[1].Id, CategoraId = categoriasProducto[1].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 18.00m },
            new Producto { TenantId = tenantId, Nombre = "Agua Natural 1L", CodigoBarra = "DEMO-AGU-005", Descripcion = "Agua purificada natural", FamiliaId = familias[1].Id, CategoraId = categoriasProducto[1].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 12.00m },
            new Producto { TenantId = tenantId, Nombre = "Jugo de Naranja 1L", CodigoBarra = "DEMO-JUG-006", Descripcion = "Jugo de naranja natural", FamiliaId = familias[1].Id, CategoraId = categoriasProducto[2].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 32.00m },
            // Lácteos (familia[2], categoría Refrigerados[2])
            new Producto { TenantId = tenantId, Nombre = "Leche Entera 1L", CodigoBarra = "DEMO-LEC-007", Descripcion = "Leche entera pasteurizada", FamiliaId = familias[2].Id, CategoraId = categoriasProducto[2].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 26.00m },
            new Producto { TenantId = tenantId, Nombre = "Queso Panela 400g", CodigoBarra = "DEMO-QUE-008", Descripcion = "Queso panela fresco", FamiliaId = familias[2].Id, CategoraId = categoriasProducto[2].Id, UnidadMedidaId = unidades[0].Id, PrecioBase = 55.00m },
            // Limpieza (familia[3], categoría No perecederos[3])
            new Producto { TenantId = tenantId, Nombre = "Detergente Líquido 1L", CodigoBarra = "DEMO-DET-009", Descripcion = "Detergente líquido multiusos", FamiliaId = familias[3].Id, CategoraId = categoriasProducto[3].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 38.00m },
            new Producto { TenantId = tenantId, Nombre = "Jabón para Trastes 750ml", CodigoBarra = "DEMO-JAB-010", Descripcion = "Jabón líquido para trastes", FamiliaId = familias[3].Id, CategoraId = categoriasProducto[3].Id, UnidadMedidaId = unidades[6].Id, PrecioBase = 29.00m },
            // Botanas (familia[4], categoría Secos[0])
            new Producto { TenantId = tenantId, Nombre = "Papas Fritas 150g", CodigoBarra = "DEMO-PAP-011", Descripcion = "Papas fritas onduladas", FamiliaId = familias[4].Id, CategoraId = categoriasProducto[0].Id, UnidadMedidaId = unidades[0].Id, PrecioBase = 22.00m },
            new Producto { TenantId = tenantId, Nombre = "Galletas Marías 500g", CodigoBarra = "DEMO-GAL-012", Descripcion = "Galletas marías clásicas", FamiliaId = familias[4].Id, CategoraId = categoriasProducto[0].Id, UnidadMedidaId = unidades[5].Id, PrecioBase = 19.50m },
        };
        _db.Productos.AddRange(productos);
        await _db.SaveChangesAsync();

        // Precios por producto en la lista default
        var precios = new List<PrecioPorProducto>();
        foreach (var producto in productos)
        {
            precios.Add(new PrecioPorProducto
            {
                TenantId = tenantId,
                ProductoId = producto.Id,
                ListaPrecioId = listaPrecio.Id,
                Precio = producto.PrecioBase
            });
        }
        _db.PreciosPorProducto.AddRange(precios);
        await _db.SaveChangesAsync();

        // Inventario inicial
        var random = new Random(42); // seed fijo para consistencia
        var inventarios = new List<Domain.Entities.Inventario>();
        foreach (var producto in productos)
        {
            inventarios.Add(new Domain.Entities.Inventario
            {
                TenantId = tenantId,
                ProductoId = producto.Id,
                CantidadActual = random.Next(50, 201),
                StockMinimo = 20,
                StockMaximo = 500
            });
        }
        _db.Inventarios.AddRange(inventarios);
        await _db.SaveChangesAsync();
    }
}
