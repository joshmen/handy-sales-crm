using FluentAssertions;
using HandySuites.Application.Common;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using Xunit;

namespace HandySuites.Tests.Application.Common;

/// <summary>
/// Tests del cálculo BOGO ("compra N regala M") — el corazón de las promociones
/// tipo Regalo. Pure function, sin DB, validamos todas las reglas.
/// </summary>
public class BogoCalculatorTests
{
    private static readonly DateTime Ahora = new DateTime(2026, 4, 30, 12, 0, 0, DateTimeKind.Utc);

    private static Promocion MakePromo(
        TipoPromocion tipo = TipoPromocion.Regalo,
        decimal? cantidadCompra = 10,
        decimal? cantidadBonificada = 1,
        int? productoBonificadoId = null,
        int productoId = 1,
        bool activo = true,
        DateTime? eliminadoEn = null,
        DateTime? fechaInicio = null,
        DateTime? fechaFin = null)
    {
        return new Promocion
        {
            Id = 100,
            TenantId = 1,
            Nombre = "10+1",
            TipoPromocion = tipo,
            CantidadCompra = cantidadCompra,
            CantidadBonificada = cantidadBonificada,
            ProductoBonificadoId = productoBonificadoId,
            FechaInicio = fechaInicio ?? Ahora.AddDays(-1),
            FechaFin = fechaFin ?? Ahora.AddDays(1),
            Activo = activo,
            EliminadoEn = eliminadoEn,
            PromocionProductos = new List<PromocionProducto>
            {
                new() { PromocionId = 100, ProductoId = productoId, TenantId = 1 }
            }
        };
    }

    [Fact]
    public void NoPromocion_RetornaCero()
    {
        var r = BogoCalculator.Calculate(qty: 10m, promo: null, productoId: 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void TipoPorcentaje_RetornaCero()
    {
        var promo = MakePromo(tipo: TipoPromocion.Porcentaje);
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void Inactiva_RetornaCero()
    {
        var promo = MakePromo(activo: false);
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void EliminadaSoftDelete_RetornaCero()
    {
        var promo = MakePromo(eliminadoEn: Ahora.AddDays(-1));
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void FueraDeVigencia_RetornaCero()
    {
        var promo = MakePromo(fechaInicio: Ahora.AddDays(1), fechaFin: Ahora.AddDays(2));
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void ProductoNoIncluido_RetornaCero()
    {
        var promo = MakePromo(productoId: 999);
        var r = BogoCalculator.Calculate(10m, promo, productoId: 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void CantidadInsuficiente_RetornaCero()
    {
        var promo = MakePromo(cantidadCompra: 10, cantidadBonificada: 1);
        var r = BogoCalculator.Calculate(qty: 9m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void MismoProducto_10mas1_RetornaUnaBonificada()
    {
        var promo = MakePromo(cantidadCompra: 10, cantidadBonificada: 1, productoBonificadoId: null);
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(1m);
        r.ProductoBonificadoId.Should().BeNull();
    }

    [Fact]
    public void MismoProducto_25unidades_AcumulativaA2()
    {
        var promo = MakePromo(cantidadCompra: 10, cantidadBonificada: 1);
        var r = BogoCalculator.Calculate(qty: 25m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(2m); // floor(25/10) * 1 = 2
    }

    [Fact]
    public void MismoProducto_30unidades_AcumulativaA3()
    {
        var promo = MakePromo(cantidadCompra: 10, cantidadBonificada: 1);
        var r = BogoCalculator.Calculate(qty: 30m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(3m);
    }

    [Fact]
    public void Regla12mas2_24unidades_RetornaCuatroBonificadas()
    {
        var promo = MakePromo(cantidadCompra: 12, cantidadBonificada: 2);
        var r = BogoCalculator.Calculate(qty: 24m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(4m); // floor(24/12) * 2 = 4
    }

    [Fact]
    public void ProductoDistinto_10X_DevuelveProductoBonificadoIdY()
    {
        var promo = MakePromo(cantidadCompra: 10, cantidadBonificada: 1, productoBonificadoId: 7);
        var r = BogoCalculator.Calculate(qty: 10m, promo, productoId: 1, Ahora);
        r.CantidadBonificada.Should().Be(1m);
        r.ProductoBonificadoId.Should().Be(7);
    }

    [Fact]
    public void CantidadCompraCero_RetornaCero()
    {
        var promo = MakePromo(cantidadCompra: 0, cantidadBonificada: 1);
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }

    [Fact]
    public void CamposNull_RetornaCero()
    {
        var promo = MakePromo(cantidadCompra: null, cantidadBonificada: null);
        var r = BogoCalculator.Calculate(10m, promo, 1, Ahora);
        r.CantidadBonificada.Should().Be(0m);
    }
}
