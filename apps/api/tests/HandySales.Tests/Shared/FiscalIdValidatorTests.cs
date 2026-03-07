using FluentAssertions;
using HandySales.Shared.Validation;

namespace HandySales.Tests.Shared;

public class FiscalIdValidatorTests
{
    [Theory]
    [InlineData("XAXX010101000", "RFC", true)]   // Persona moral válido
    [InlineData("GACL920101AB3", "RFC", true)]   // Persona física válido
    [InlineData("ABC123", "RFC", false)]          // Formato inválido
    [InlineData("", "RFC", true)]                 // Vacío = OK (no requerido)
    [InlineData(null, "RFC", true)]               // Null = OK
    public void RFC_Validation(string? id, string tipo, bool shouldBeValid)
    {
        var error = FiscalIdValidator.Validate(id, tipo);
        if (shouldBeValid)
            error.Should().BeNull();
        else
            error.Should().NotBeNull().And.Contain("RFC");
    }

    [Theory]
    [InlineData("9001234567", "NIT", true)]       // NIT Colombia con dígito verificación
    [InlineData("900123456-7", "NIT", true)]      // Con guión
    [InlineData("12345", "NIT", false)]            // Muy corto
    public void NIT_Validation(string? id, string tipo, bool shouldBeValid)
    {
        var error = FiscalIdValidator.Validate(id, tipo);
        if (shouldBeValid)
            error.Should().BeNull();
        else
            error.Should().NotBeNull().And.Contain("NIT");
    }

    [Theory]
    [InlineData("20-12345678-9", "CUIT", true)]   // Argentina con guiones
    [InlineData("20123456789", "CUIT", true)]      // Sin guiones
    [InlineData("12345", "CUIT", false)]
    public void CUIT_Validation(string? id, string tipo, bool shouldBeValid)
    {
        var error = FiscalIdValidator.Validate(id, tipo);
        if (shouldBeValid)
            error.Should().BeNull();
        else
            error.Should().NotBeNull().And.Contain("CUIT");
    }

    [Theory]
    [InlineData("12345678000190", "CNPJ", true)]  // Brasil 14 dígitos
    [InlineData("1234567800019", "CNPJ", false)]   // 13 dígitos — inválido
    public void CNPJ_Validation(string? id, string tipo, bool shouldBeValid)
    {
        var error = FiscalIdValidator.Validate(id, tipo);
        if (shouldBeValid)
            error.Should().BeNull();
        else
            error.Should().NotBeNull().And.Contain("CNPJ");
    }

    [Theory]
    [InlineData("12345678-9", "RUT", true)]        // Chile
    [InlineData("1234567-K", "RUT", true)]          // Con K
    [InlineData("123", "RUT", false)]
    public void RUT_Validation(string? id, string tipo, bool shouldBeValid)
    {
        var error = FiscalIdValidator.Validate(id, tipo);
        if (shouldBeValid)
            error.Should().BeNull();
        else
            error.Should().NotBeNull().And.Contain("RUT");
    }

    [Theory]
    [InlineData("20123456789", "RUC", true)]       // Perú 11 dígitos
    [InlineData("12345", "RUC", false)]
    public void RUC_Validation(string? id, string tipo, bool shouldBeValid)
    {
        var error = FiscalIdValidator.Validate(id, tipo);
        if (shouldBeValid)
            error.Should().BeNull();
        else
            error.Should().NotBeNull().And.Contain("RUC");
    }

    [Fact]
    public void UnknownType_ReturnsError()
    {
        var error = FiscalIdValidator.Validate("12345", "UNKNOWN");
        error.Should().NotBeNull().And.Contain("desconocido");
    }

    [Fact]
    public void NullType_DefaultsToRFC()
    {
        // Valid RFC with null tipo should default to RFC
        var error = FiscalIdValidator.Validate("XAXX010101000", null);
        error.Should().BeNull();
    }

    [Fact]
    public void SupportedTypes_ContainsAllLatam()
    {
        FiscalIdValidator.SupportedTypes.Should().BeEquivalentTo(
            new[] { "RFC", "NIT", "CUIT", "CNPJ", "RUT", "RUC" });
    }
}
