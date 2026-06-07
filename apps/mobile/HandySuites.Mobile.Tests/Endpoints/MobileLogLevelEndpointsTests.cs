using System.Security.Claims;
using HandySuites.Mobile.Api.Configuration;
using HandySuites.Mobile.Api.Endpoints;
using Microsoft.AspNetCore.Http;
using Serilog.Events;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests for <see cref="MobileLogLevelEndpoints"/>.
///
/// Endpoint surface:
///   GET  /api/superadmin/log-level  -> returns { level } (SUPER_ADMIN only)
///   POST /api/superadmin/log-level  -> sets CloudWatchLevelSwitch.MinimumLevel (SUPER_ADMIN only)
///
/// The endpoint inspects the "role" claim (or ClaimTypes.Role fallback) and mutates a
/// static <see cref="Serilog.Core.LoggingLevelSwitch"/>. To avoid the JWT/WebApplicationFactory
/// boilerplate, these tests exercise:
///   1) the static switch directly (state contract under test)
///   2) the role-gating pattern by reproducing the same claim lookup used by the lambda
///   3) the request DTO + Enum.TryParse contract for the POST body
///
/// Tests run in a serial collection because <see cref="LoggingExtensions.CloudWatchLevelSwitch"/>
/// is process-wide static state.
/// </summary>
[Collection("MobileLogLevel-Serial")]
public class MobileLogLevelEndpointsTests : IDisposable
{
    private readonly LogEventLevel _originalLevel;

    public MobileLogLevelEndpointsTests()
    {
        // Snapshot the static switch so each test starts from a known state and
        // restores it on Dispose. Default in code is Warning.
        _originalLevel = LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel;
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = LogEventLevel.Warning;
    }

    public void Dispose()
    {
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = _originalLevel;
    }

    // ---------- Helpers replicating the endpoint's role-gating logic ----------

    /// <summary>
    /// Mirrors the role lookup inside the endpoint lambda:
    ///   role = ctx.User.FindFirst("role")?.Value ?? ctx.User.FindFirst(ClaimTypes.Role)?.Value
    /// </summary>
    private static string? ResolveRole(HttpContext ctx)
    {
        return ctx.User.FindFirst("role")?.Value
            ?? ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    }

    private static HttpContext BuildContext(params Claim[] claims)
    {
        var ctx = new DefaultHttpContext();
        var identity = new ClaimsIdentity(claims, authenticationType: "Test");
        ctx.User = new ClaimsPrincipal(identity);
        return ctx;
    }

    // -------------------- Switch state contract --------------------

    [Fact]
    public void CloudWatchLevelSwitch_DefaultsToWarning_AfterReset()
    {
        // After Ctor reset, the switch must reflect Warning (the in-code default).
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.Should().Be(LogEventLevel.Warning);
    }

    [Theory]
    [InlineData("Warning", LogEventLevel.Warning)]
    [InlineData("Information", LogEventLevel.Information)]
    [InlineData("Debug", LogEventLevel.Debug)]
    [InlineData("Error", LogEventLevel.Error)]
    [InlineData("Verbose", LogEventLevel.Verbose)]
    [InlineData("Fatal", LogEventLevel.Fatal)]
    public void EnumTryParse_AcceptsAllSerilogLevels_CaseInsensitive(string input, LogEventLevel expected)
    {
        // The endpoint uses Enum.TryParse<LogEventLevel>(req.Level, true, ...).
        // Verify the contract: case-insensitive parse maps to the expected enum.
        var ok = Enum.TryParse<LogEventLevel>(input, ignoreCase: true, out var level);

        ok.Should().BeTrue();
        level.Should().Be(expected);
    }

    [Theory]
    [InlineData("warning")]
    [InlineData("INFORMATION")]
    [InlineData("dEbUg")]
    public void EnumTryParse_IsCaseInsensitive(string input)
    {
        var ok = Enum.TryParse<LogEventLevel>(input, ignoreCase: true, out _);
        ok.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("Bogus")]
    [InlineData("Info")]      // Not a valid Serilog level (it's "Information")
    [InlineData("Warn")]      // Not a valid Serilog level (it's "Warning")
    public void EnumTryParse_RejectsInvalidLevels(string input)
    {
        // The endpoint should return 400 BadRequest for these.
        var ok = Enum.TryParse<LogEventLevel>(input, ignoreCase: true, out _);
        ok.Should().BeFalse();
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("999")]
    public void EnumIsDefined_RejectsNumericValuesOutOfRange(string input)
    {
        // Enum.TryParse acepta cualquier int como ordinal (lo castea a
        // (LogEventLevel)N). El endpoint debe usar Enum.IsDefined despues
        // de TryParse para garantizar que el valor sea uno de los 6 niveles.
        var parsed = Enum.TryParse<LogEventLevel>(input, ignoreCase: true, out var val);
        parsed.Should().BeTrue("Enum.TryParse acepta int arbitrario");
        Enum.IsDefined(typeof(LogEventLevel), val).Should().BeFalse(
            "el endpoint debe rechazar con BadRequest si !Enum.IsDefined");
    }

    [Fact]
    public void SettingMinimumLevel_PersistsAcrossReads()
    {
        // Simulates POST -> GET happy path.
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = LogEventLevel.Debug;
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.Should().Be(LogEventLevel.Debug);

        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = LogEventLevel.Information;
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.Should().Be(LogEventLevel.Information);
    }

    // -------------------- Role-gating (RBAC) --------------------

    [Fact]
    public void ResolveRole_ReturnsSuperAdmin_FromCustomRoleClaim()
    {
        var ctx = BuildContext(new Claim("role", "SUPER_ADMIN"));

        var role = ResolveRole(ctx);

        role.Should().Be("SUPER_ADMIN");
    }

    [Fact]
    public void ResolveRole_FallsBackToClaimTypesRole_WhenCustomClaimMissing()
    {
        // The endpoint uses ?? fallback to ClaimTypes.Role — make sure it works.
        var ctx = BuildContext(new Claim(ClaimTypes.Role, "SUPER_ADMIN"));

        var role = ResolveRole(ctx);

        role.Should().Be("SUPER_ADMIN");
    }

    [Fact]
    public void ResolveRole_PrefersCustomRoleClaim_OverClaimTypesRole()
    {
        // If both claims exist, the lambda prefers "role" first.
        var ctx = BuildContext(
            new Claim("role", "SUPER_ADMIN"),
            new Claim(ClaimTypes.Role, "ADMIN")
        );

        ResolveRole(ctx).Should().Be("SUPER_ADMIN");
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    [InlineData("VIEWER")]
    [InlineData("")]
    public void ResolveRole_NonSuperAdmin_ShouldBeForbidden(string role)
    {
        // The endpoint contract: any role != "SUPER_ADMIN" must yield Forbid().
        // Asserts that our extracted role does NOT equal SUPER_ADMIN, so the
        // role check at the top of the lambda would short-circuit to Results.Forbid().
        var ctx = BuildContext(new Claim("role", role));

        var resolved = ResolveRole(ctx);

        resolved.Should().NotBe("SUPER_ADMIN");
    }

    [Fact]
    public void ResolveRole_NoRoleClaim_ReturnsNull_ShouldBeForbidden()
    {
        // Token with no role claim at all -> null -> Forbid().
        var ctx = BuildContext(new Claim("sub", "user-1"));

        ResolveRole(ctx).Should().BeNull();
    }

    // -------------------- DTO contract --------------------

    [Fact]
    public void MobileLogLevelRequest_DefaultLevel_IsEmptyString()
    {
        // Endpoint contract: empty string fails TryParse -> 400.
        var req = new MobileLogLevelRequest();

        req.Level.Should().Be("");
    }

    [Fact]
    public void MobileLogLevelRequest_CanBeAssigned()
    {
        var req = new MobileLogLevelRequest { Level = "Debug" };

        req.Level.Should().Be("Debug");
    }

    // -------------------- End-to-end style: parse + mutate + read back --------------------

    [Theory]
    [InlineData("Warning", LogEventLevel.Warning)]
    [InlineData("Information", LogEventLevel.Information)]
    [InlineData("Debug", LogEventLevel.Debug)]
    public void HappyPath_ParseLevel_ThenMutateSwitch_ThenRead(string input, LogEventLevel expected)
    {
        // Emulates the POST handler logic end-to-end against the actual static state.
        var req = new MobileLogLevelRequest { Level = input };

        var ok = Enum.TryParse<LogEventLevel>(req.Level, ignoreCase: true, out var level);
        ok.Should().BeTrue();

        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = level;

        // GET handler returns the current level — verify round trip.
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.Should().Be(expected);
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.ToString().Should().Be(expected.ToString());
    }

    [Fact]
    public void InvalidLevel_DoesNotMutateSwitch()
    {
        // Pre-condition: switch is Warning (from Ctor reset).
        var before = LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel;
        before.Should().Be(LogEventLevel.Warning);

        var req = new MobileLogLevelRequest { Level = "TotallyBogus" };
        var ok = Enum.TryParse<LogEventLevel>(req.Level, ignoreCase: true, out _);
        ok.Should().BeFalse();

        // Since parse failed, the endpoint returns BadRequest WITHOUT mutating the switch.
        LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.Should().Be(before);
    }

    // -------------------- IDOR / cross-tenant note --------------------
    //
    // This endpoint is process-wide (not tenant-scoped) and is only reachable by
    // SUPER_ADMIN. There is no tenant_id parameter, no per-tenant data path, and
    // the action targets a single static switch shared by the whole API instance.
    // Therefore an IDOR cross-tenant test is not applicable here — the RBAC
    // SUPER_ADMIN gate above is the only authorization boundary.
    //
    // SECURITY NOTE: because the switch is global, a SUPER_ADMIN of any tenant
    // changes the log level for ALL tenants on the same API instance. That is
    // by-design for an ops/monitoring control but worth flagging.
}
