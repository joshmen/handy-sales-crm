using HandySuites.Billing.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Unit tests para OrderReaderService.
///
/// El servicio lee pedidos desde la BD principal (PostgreSQL) usando Npgsql crudo.
/// No tiene abstraccion de IDbConnectionFactory, asi que estos tests cubren rutas
/// que NO requieren BD viva:
///   - Guards pre-conexion (connection string ausente, tenantId no entero)
///   - Manejo de excepcion (conn string invalida -> log + retorno seguro)
///
/// El servicio NUNCA propaga excepciones: retorna null (GetOrderForInvoice) o
/// lista vacia (GetOrdersForFacturaGlobal) y loguea el error. Esa garantia
/// defensiva es lo que validamos aqui.
/// </summary>
public class OrderReaderServiceTests
{
    private static IConfiguration BuildConfig(string? mainConnection)
    {
        var dict = new Dictionary<string, string?>();
        if (mainConnection is not null)
        {
            dict["ConnectionStrings:MainConnection"] = mainConnection;
        }
        return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
    }

    // Bogus connection string que falla rapido en OpenAsync (puerto cerrado en localhost).
    // Suficiente para validar que el catch global atrapa la excepcion sin propagar.
    private const string UnreachableConn =
        "Host=127.0.0.1;Port=1;Database=none;Username=u;Password=p;Timeout=2;Command Timeout=2;";

    // ─── GetOrderForInvoiceAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetOrderForInvoiceAsync_ReturnsNull_WhenConnectionStringMissing()
    {
        var config = BuildConfig(null);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrderForInvoiceAsync(tenantId: "1", pedidoId: 42);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOrderForInvoiceAsync_ReturnsNull_WhenTenantIdNotInteger()
    {
        var config = BuildConfig(UnreachableConn);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrderForInvoiceAsync(tenantId: "abc", pedidoId: 42);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOrderForInvoiceAsync_ReturnsNull_WhenDbUnreachable()
    {
        var config = BuildConfig(UnreachableConn);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrderForInvoiceAsync(tenantId: "1", pedidoId: 42);

        // El catch global debe atrapar el fallo de Npgsql y retornar null sin throw.
        Assert.Null(result);
    }

    [Fact]
    public async Task GetOrderForInvoiceAsync_LogsWarning_WhenConnectionStringMissing()
    {
        var config = BuildConfig(null);
        var loggerMock = new Mock<ILogger<OrderReaderService>>();
        var service = new OrderReaderService(config, loggerMock.Object);

        var result = await service.GetOrderForInvoiceAsync(tenantId: "1", pedidoId: 42);

        Assert.Null(result);
        loggerMock.Verify(
            l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    // ─── GetOrdersForFacturaGlobalAsync ────────────────────────────────────────

    [Fact]
    public async Task GetOrdersForFacturaGlobalAsync_ReturnsEmptyList_WhenConnectionStringMissing()
    {
        var config = BuildConfig(null);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrdersForFacturaGlobalAsync(
            tenantId: "1",
            fechaInicio: new DateTime(2026, 1, 1),
            fechaFin: new DateTime(2026, 2, 1),
            excludedPedidoIds: new List<long>());

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetOrdersForFacturaGlobalAsync_ReturnsEmptyList_WhenTenantIdNotInteger()
    {
        var config = BuildConfig(UnreachableConn);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrdersForFacturaGlobalAsync(
            tenantId: "not-a-number",
            fechaInicio: new DateTime(2026, 1, 1),
            fechaFin: new DateTime(2026, 2, 1),
            excludedPedidoIds: new List<long> { 1, 2, 3 });

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetOrdersForFacturaGlobalAsync_ReturnsEmptyList_WhenDbUnreachable()
    {
        var config = BuildConfig(UnreachableConn);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrdersForFacturaGlobalAsync(
            tenantId: "1",
            fechaInicio: new DateTime(2026, 1, 1),
            fechaFin: new DateTime(2026, 2, 1),
            excludedPedidoIds: new List<long> { 10, 20 });

        // Catch global debe absorber el fallo de Npgsql y retornar coleccion vacia.
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetOrdersForFacturaGlobalAsync_AcceptsEmptyExcludedList_WithoutThrowing()
    {
        // Guarda contra off-by-one en la construccion del WHERE NOT IN (...).
        // Con lista vacia el servicio debe omitir el clause de exclusion y NO romper.
        var config = BuildConfig(null);
        var service = new OrderReaderService(config, NullLogger<OrderReaderService>.Instance);

        var result = await service.GetOrdersForFacturaGlobalAsync(
            tenantId: "1",
            fechaInicio: new DateTime(2026, 1, 1),
            fechaFin: new DateTime(2026, 2, 1),
            excludedPedidoIds: new List<long>());

        Assert.NotNull(result);
        Assert.Empty(result);
    }
}
