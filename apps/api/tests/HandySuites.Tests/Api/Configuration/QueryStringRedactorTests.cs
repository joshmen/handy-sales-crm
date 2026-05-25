using FluentAssertions;
using HandySuites.Api.Configuration;
using Xunit;

namespace HandySuites.Tests.Api.Configuration;

public class QueryStringRedactorTests
{
    [Theory]
    [InlineData("?token=abc123", "?token=***REDACTED***")]
    [InlineData("?code=789456", "?code=***REDACTED***")]
    [InlineData("?email=user@example.com", "?email=***REDACTED***")]
    [InlineData("?password=hunter2", "?password=***REDACTED***")]
    [InlineData("?apikey=sk_live_xyz", "?apikey=***REDACTED***")]
    [InlineData("?api_key=sk_live_xyz", "?api_key=***REDACTED***")]
    [InlineData("?secret=foo", "?secret=***REDACTED***")]
    [InlineData("?access_token=eyJ", "?access_token=***REDACTED***")]
    [InlineData("?refresh_token=rt_x", "?refresh_token=***REDACTED***")]
    [InlineData("?otp=123456", "?otp=***REDACTED***")]
    [InlineData("?TOKEN=ABC", "?TOKEN=***REDACTED***")] // case insensitive
    public void Redact_EnmascaraKeysSensitivas(string input, string expected)
    {
        QueryStringRedactor.Redact(input).Should().Be(expected);
    }

    [Theory]
    [InlineData("?tenantId=5", "?tenantId=5")]
    [InlineData("?page=1&pageSize=20", "?page=1&pageSize=20")]
    [InlineData("?clienteId=42", "?clienteId=42")]
    public void Redact_NoTocaKeysNoSensitivas(string input, string expected)
    {
        QueryStringRedactor.Redact(input).Should().Be(expected);
    }

    [Fact]
    public void Redact_EnmascaraMultiplesKeysSensitivasEnMismaUrl()
    {
        var input = "?token=abc&page=1&email=x@y.com&debug=true";
        var result = QueryStringRedactor.Redact(input);

        result.Should().Be("?token=***REDACTED***&page=1&email=***REDACTED***&debug=true");
    }

    [Fact]
    public void Redact_PreservaQueryStringVacioONulo()
    {
        QueryStringRedactor.Redact(null).Should().Be(string.Empty);
        QueryStringRedactor.Redact(string.Empty).Should().Be(string.Empty);
    }

    [Fact]
    public void Redact_NoEnmascaraKeyQueContieneSubstringSensitivo()
    {
        // "mytoken" no debe matchear "token" porque tenemos word boundary.
        var input = "?mytoken=safe&user=bob";
        var result = QueryStringRedactor.Redact(input);

        // mytoken NO debería ser enmascarado (no es una key sensitiva exacta).
        result.Should().Contain("mytoken=safe");
    }
}
