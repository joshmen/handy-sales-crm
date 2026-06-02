using HandySuites.Application.Common.Time;
using Xunit;

namespace HandySuites.Tests.Application.Common;

/// <summary>
/// Bug prod 2026-06-02: fecha_gasto de mobile aparecia 7h adelantada en BD.
/// Causa: mobile envia .toISOString() UTC pero ASP.NET deserializa con
/// Kind=Unspecified (la 'Z' se pierde). EF Core + Npgsql legacy lo guarda
/// literal en columna timestamp without time zone.
///
/// Fix: DateTimeNormalization.EnsureUtc fuerza Kind=Utc antes de persistir.
/// </summary>
public class DateTimeNormalizationTests
{
    [Fact]
    public void EnsureUtc_ReturnsUtcUnchanged_WhenAlreadyUtc()
    {
        var utc = new DateTime(2026, 6, 2, 17, 3, 30, DateTimeKind.Utc);

        var result = DateTimeNormalization.EnsureUtc(utc);

        Assert.Equal(DateTimeKind.Utc, result.Kind);
        Assert.Equal(utc, result);
    }

    [Fact]
    public void EnsureUtc_AssumesUtc_WhenKindIsUnspecified()
    {
        // Caso real del bug: mobile envia "2026-06-02T17:03:30Z" y ASP.NET
        // deserializa como Unspecified (la 'Z' se pierde).
        var unspecified = new DateTime(2026, 6, 2, 17, 3, 30, DateTimeKind.Unspecified);

        var result = DateTimeNormalization.EnsureUtc(unspecified);

        Assert.Equal(DateTimeKind.Utc, result.Kind);
        // El valor NO debe cambiar — solo el Kind. Asumimos que era UTC originalmente.
        Assert.Equal(2026, result.Year);
        Assert.Equal(6, result.Month);
        Assert.Equal(2, result.Day);
        Assert.Equal(17, result.Hour);
        Assert.Equal(3, result.Minute);
        Assert.Equal(30, result.Second);
    }

    [Fact]
    public void EnsureUtc_ConvertsLocalToUtc_WhenKindIsLocal()
    {
        // Local sera convertido a UTC restando el offset del runner.
        // Test solo verifica que Kind cambia y se aplica ToUniversalTime.
        var local = new DateTime(2026, 6, 2, 10, 3, 30, DateTimeKind.Local);

        var result = DateTimeNormalization.EnsureUtc(local);

        Assert.Equal(DateTimeKind.Utc, result.Kind);
        // El valor convertido depende del TZ del runner; verificar via comparacion.
        var expected = local.ToUniversalTime();
        Assert.Equal(expected, result);
    }

    [Fact]
    public void EnsureUtc_Nullable_ReturnsNull_WhenInputIsNull()
    {
        DateTime? input = null;

        var result = DateTimeNormalization.EnsureUtc(input);

        Assert.Null(result);
    }

    [Fact]
    public void EnsureUtc_Nullable_NormalizesValue_WhenInputHasValue()
    {
        DateTime? input = new DateTime(2026, 6, 2, 17, 3, 30, DateTimeKind.Unspecified);

        var result = DateTimeNormalization.EnsureUtc(input);

        Assert.NotNull(result);
        Assert.Equal(DateTimeKind.Utc, result.Value.Kind);
        Assert.Equal(17, result.Value.Hour);
    }
}
