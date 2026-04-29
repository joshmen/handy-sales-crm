using FluentAssertions;
using HandySuites.Application.Common;
using Xunit;

namespace HandySuites.Tests.Application.Common;

public class LineAmountCalculatorTests
{
    // ── Caso clásico: precio sin IVA, sistema lo agrega ──

    [Fact]
    public void Calculate_PriceExcludesIva_AddsTaxOnTop()
    {
        // Producto a $100 base, qty 1, IVA 16%, sin descuento.
        // Esperado: subtotal $100, impuesto $16, total $116.
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 100m, cantidad: 1m, descuento: 0m, tasa: 0.16m, precioIncluyeIva: false);

        amounts.Subtotal.Should().Be(100m);
        amounts.Impuesto.Should().Be(16m);
        amounts.Total.Should().Be(116m);
    }

    // ── Caso del bug reportado: precio incluye IVA ──

    [Fact]
    public void Calculate_PriceIncludesIva_DesglosaTaxFromPrice()
    {
        // Producto a $116 (precio final), qty 1, IVA 16%.
        // Esperado: subtotal $100, impuesto $16, total $116 (mismos $116 que paga el cliente).
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 116m, cantidad: 1m, descuento: 0m, tasa: 0.16m, precioIncluyeIva: true);

        amounts.Subtotal.Should().Be(100m);
        amounts.Impuesto.Should().Be(16m);
        amounts.Total.Should().Be(116m);
    }

    [Fact]
    public void Calculate_UserBugCase_17PesosTimes5_PrecioIncluyeIva()
    {
        // Caso EXACTO reportado por el usuario 2026-04-28:
        // Producto a $17 (IVA incluido), qty 5 → cliente paga $85.
        // Bug original: ticket cobraba ~$98.60 sumando 16% sobre $85.
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 17m, cantidad: 5m, descuento: 0m, tasa: 0.16m, precioIncluyeIva: true);

        amounts.Total.Should().Be(85m);
        amounts.Subtotal.Should().BeApproximately(73.275862m, 0.000001m);
        amounts.Impuesto.Should().BeApproximately(11.724138m, 0.000001m);
        // Sanity: subtotal + impuesto = total (sin drift)
        (amounts.Subtotal + amounts.Impuesto).Should().Be(amounts.Total);
    }

    // ── Tasa cero (alimentos básicos, libros) ──

    [Fact]
    public void Calculate_TasaCero_IncluyeIva_NoImpuesto()
    {
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 50m, cantidad: 2m, descuento: 0m, tasa: 0m, precioIncluyeIva: true);

        amounts.Subtotal.Should().Be(100m);
        amounts.Impuesto.Should().Be(0m);
        amounts.Total.Should().Be(100m);
    }

    [Fact]
    public void Calculate_TasaCero_ExcluyeIva_NoImpuesto()
    {
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 50m, cantidad: 2m, descuento: 0m, tasa: 0m, precioIncluyeIva: false);

        amounts.Subtotal.Should().Be(100m);
        amounts.Impuesto.Should().Be(0m);
        amounts.Total.Should().Be(100m);
    }

    // ── Frontera norte 8% ──

    [Fact]
    public void Calculate_FronteraTasa8_IncluyeIva()
    {
        // Producto a $108 (precio final con 8% incluido), qty 1.
        // Esperado: subtotal $100, impuesto $8, total $108.
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 108m, cantidad: 1m, descuento: 0m, tasa: 0.08m, precioIncluyeIva: true);

        amounts.Subtotal.Should().Be(100m);
        amounts.Impuesto.Should().Be(8m);
        amounts.Total.Should().Be(108m);
    }

    // ── Descuento aplicado ──

    [Fact]
    public void Calculate_ConDescuento_IncluyeIva()
    {
        // Producto a $100 (IVA incluido), qty 2, descuento $20 → cliente paga $180.
        // Esperado: total $180, subtotal $155.17 (180/1.16), impuesto $24.83.
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario: 100m, cantidad: 2m, descuento: 20m, tasa: 0.16m, precioIncluyeIva: true);

        amounts.Total.Should().Be(180m);
        amounts.Subtotal.Should().BeApproximately(155.172414m, 0.000001m);
        amounts.Impuesto.Should().BeApproximately(24.827586m, 0.000001m);
    }
}
