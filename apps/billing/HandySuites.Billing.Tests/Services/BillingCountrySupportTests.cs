using HandySuites.Billing.Api.Services;

namespace HandySuites.Billing.Tests.Services;

public class BillingCountrySupportTests
{
    [Theory]
    [InlineData("MX")]
    [InlineData("mx")]
    [InlineData(" MX ")]
    [InlineData("México")]
    [InlineData("Mexico")]
    [InlineData("mexico")]
    public void IsSupported_ReturnsTrue_ForMexicoVariants(string input)
    {
        Assert.True(BillingCountrySupport.IsSupported(input));
    }

    [Theory]
    [InlineData("CO")]
    [InlineData("US")]
    [InlineData("Colombia")]
    [InlineData("Argentina")]
    [InlineData("XX")]
    [InlineData("")]
    [InlineData(null)]
    public void IsSupported_ReturnsFalse_ForUnsupportedCountries(string? input)
    {
        Assert.False(BillingCountrySupport.IsSupported(input));
    }

    [Fact]
    public void NormalizeToIso_ConvertsLongName_ToIso2()
    {
        Assert.Equal("MX", BillingCountrySupport.NormalizeToIso("México"));
        Assert.Equal("MX", BillingCountrySupport.NormalizeToIso("Mexico"));
    }

    [Fact]
    public void NormalizeToIso_PassesThroughIso2_Uppercased()
    {
        Assert.Equal("MX", BillingCountrySupport.NormalizeToIso("mx"));
        Assert.Equal("MX", BillingCountrySupport.NormalizeToIso("MX"));
        Assert.Equal("CO", BillingCountrySupport.NormalizeToIso("co"));
    }

    [Fact]
    public void NormalizeToIso_ReturnsRawValue_WhenUnknown()
    {
        // Permite que IsSupported responda false sin lanzar
        Assert.Equal("Argentina", BillingCountrySupport.NormalizeToIso("Argentina"));
        Assert.Equal(string.Empty, BillingCountrySupport.NormalizeToIso(""));
    }
}
