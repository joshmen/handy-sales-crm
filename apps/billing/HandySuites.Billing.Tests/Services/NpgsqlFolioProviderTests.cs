using HandySuites.Billing.Api.Services;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Unit tests for <see cref="NpgsqlFolioProvider.ParseFolioResult"/>.
/// Cobertura de integración (GetNextFolioAsync completo): requiere Postgres real.
/// </summary>
public class NpgsqlFolioProviderTests
{
    private const string TenantId = "tenant-test";
    private const string Serie    = "A";

    [Fact]
    public void ParseFolioResult_ReturnsInt_WhenScalarIsInt()
    {
        var result = NpgsqlFolioProvider.ParseFolioResult(42, TenantId, Serie);
        result.Should().Be(42);
    }

    [Fact]
    public void ParseFolioResult_ConvertsLong_WhenScalarIsLong()
    {
        // Simulates a bigint column returning long instead of int.
        // Convert.ToInt32 handles the widening/narrowing; values within int range succeed.
        var result = NpgsqlFolioProvider.ParseFolioResult(999L, TenantId, Serie);
        result.Should().Be(999);
    }

    [Fact]
    public void ParseFolioResult_ConvertsShort_WhenScalarIsShort()
    {
        var result = NpgsqlFolioProvider.ParseFolioResult((short)7, TenantId, Serie);
        result.Should().Be(7);
    }

    [Fact]
    public void ParseFolioResult_ThrowsInvalidOperationException_WhenScalarIsNull()
    {
        var act = () => NpgsqlFolioProvider.ParseFolioResult(null, TenantId, Serie);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*FolioProvider*NULL*");
    }

    [Fact]
    public void ParseFolioResult_ThrowsInvalidOperationException_WhenScalarIsDBNull()
    {
        var act = () => NpgsqlFolioProvider.ParseFolioResult(DBNull.Value, TenantId, Serie);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*FolioProvider*NULL*");
    }

    [Fact]
    public void ParseFolioResult_NeverReturns1_WhenScalarIsLong999()
    {
        // Guard: must not silently fall back to folio 1 for a non-int scalar.
        var result = NpgsqlFolioProvider.ParseFolioResult(999L, TenantId, Serie);
        result.Should().NotBe(1);
    }

    [Fact]
    public void ParseFolioResult_ThrowsOverflowException_WhenLongExceedsIntMaxValue()
    {
        // A bigint value beyond int range should throw — prefer OverflowException to
        // returning a truncated folio (which would be a compliance bug).
        var bigValue = (long)int.MaxValue + 1;
        var act = () => NpgsqlFolioProvider.ParseFolioResult(bigValue, TenantId, Serie);
        act.Should().Throw<OverflowException>();
    }
}
