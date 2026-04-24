using HandySuites.Shared.Billing;

namespace HandySuites.Mobile.Tests.Endpoints;

public class BillingCountrySupportTests
{
    [Fact]
    public void IsSupported_Mexico_ReturnsTrue()
    {
        BillingCountrySupport.IsSupported("MX").Should().BeTrue();
    }

    [Fact]
    public void IsSupported_IsCaseInsensitive()
    {
        BillingCountrySupport.IsSupported("mx").Should().BeTrue();
        BillingCountrySupport.IsSupported("Mx").Should().BeTrue();
    }

    [Fact]
    public void IsSupported_Colombia_ReturnsFalse()
    {
        // Futuro: cuando agreguemos DIAN, descomentar "CO" en BillingCountrySupport
        // y este test fallará a propósito indicando que hay que actualizarlo.
        BillingCountrySupport.IsSupported("CO").Should().BeFalse();
    }

    [Fact]
    public void IsSupported_Null_ReturnsFalse()
    {
        BillingCountrySupport.IsSupported(null).Should().BeFalse();
    }

    [Fact]
    public void IsSupported_Empty_ReturnsFalse()
    {
        BillingCountrySupport.IsSupported(string.Empty).Should().BeFalse();
    }

    [Fact]
    public void All_ContainsMX()
    {
        BillingCountrySupport.All.Should().Contain("MX");
    }
}
