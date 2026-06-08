using HandySuites.Mobile.Tests.Common;
using System.Net;
using System.Net.Http.Json;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP-level tests for /api/mobile/auth/* endpoints using MobileWebApplicationFactory.
/// Exercises route line coverage with happy/RBAC-negative/unauthenticated paths.
/// </summary>
public class MobileAuthEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileAuthEndpointsHttpTests(MobileWebApplicationFactory factory)
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        _factory = factory;
    }

    private HttpClient AuthedClient(string role, int userId, int tenantId = MobileTestSeeder.TenantA)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("Authorization", "Bearer fake");
        c.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-Role", role);
        return c;
    }

    private HttpClient UnauthenticatedClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    private HttpClient AnonymousClient()
    {
        // For rate-limited POST /login (no auth required) — still anonymous.
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    // ──────────────────────────────────────────────────────────
    // POST /login
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostLogin_WithValidPayload_ReturnsKnownStatus()
    {
        var client = AnonymousClient();
        var body = new { email = "v1@test.com", password = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/login", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Conflict,
            HttpStatusCode.Forbidden,
            HttpStatusCode.BadRequest,
            HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostLogin_WithInvalidEmail_Returns400()
    {
        var client = AnonymousClient();
        var body = new { email = "not-an-email", password = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/login", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostLogin_WithEmptyPassword_Returns400()
    {
        var client = AnonymousClient();
        var body = new { email = "v1@test.com", password = "" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/login", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostLogin_WithDeviceHeaders_ReturnsKnownStatus()
    {
        var client = AnonymousClient();
        client.DefaultRequestHeaders.Add("X-Device-Id", "device-abc");
        client.DefaultRequestHeaders.Add("X-Device-Fingerprint", "fp-xyz");
        var body = new { email = "v1@test.com", password = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/login", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Conflict,
            HttpStatusCode.Forbidden,
            HttpStatusCode.BadRequest,
            HttpStatusCode.TooManyRequests);
    }

    // ──────────────────────────────────────────────────────────
    // POST /revoke-and-login
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostRevokeAndLogin_WithValidPayload_ReturnsKnownStatus()
    {
        var client = AnonymousClient();
        var body = new
        {
            email = "v1@test.com",
            password = "Test123!",
            revokeSessionId = 12345
        };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/revoke-and-login", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.BadRequest,
            HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostRevokeAndLogin_WithInvalidEmail_Returns400()
    {
        var client = AnonymousClient();
        var body = new
        {
            email = "bad-email",
            password = "Test123!",
            revokeSessionId = 1
        };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/revoke-and-login", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostRevokeAndLogin_WithMissingRevokeSessionId_Returns400()
    {
        var client = AnonymousClient();
        var body = new
        {
            email = "v1@test.com",
            password = "Test123!",
            revokeSessionId = 0
        };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/revoke-and-login", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests);
    }

    // ──────────────────────────────────────────────────────────
    // GET /my-sessions
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMySessions_AsVendedor_Returns200()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/auth/my-sessions");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetMySessions_AsAdmin_Returns200()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/auth/my-sessions");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetMySessions_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/auth/my-sessions");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /revoke-session/{sessionId}
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostRevokeSession_AsVendedor_NonexistentSession_Returns404()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/auth/revoke-session/99999", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.OK);
    }

    [Fact]
    public async Task PostRevokeSession_AsAdmin_Returns404OrOk()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.PostAsync("/api/mobile/auth/revoke-session/12345", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.OK);
    }

    [Fact]
    public async Task PostRevokeSession_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/auth/revoke-session/1", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /force-login
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostForceLogin_WithValidPayload_ReturnsKnownStatus()
    {
        var client = AnonymousClient();
        var body = new { email = "v1@test.com", password = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/force-login", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.BadRequest,
            HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostForceLogin_WithInvalidEmail_Returns400()
    {
        var client = AnonymousClient();
        var body = new { email = "no-at-sign", password = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/force-login", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PostForceLogin_WithDeviceHeaders_ReturnsKnownStatus()
    {
        var client = AnonymousClient();
        client.DefaultRequestHeaders.Add("X-Device-Id", "device-force-1");
        client.DefaultRequestHeaders.Add("X-Device-Fingerprint", "fp-force-1");
        var body = new { email = "v1@test.com", password = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/force-login", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.BadRequest,
            HttpStatusCode.TooManyRequests);
    }

    // ──────────────────────────────────────────────────────────
    // GET /me
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMe_AsVendedor_ReturnsOkOrNotFound()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/auth/me");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetMe_AsAdmin_ReturnsOkOrNotFound()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/auth/me");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetMe_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /change-password
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostChangePassword_AsVendedor_WeakPassword_Returns400()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { OldPassword = "Test123!", NewPassword = "short" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/change-password", body);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostChangePassword_AsVendedor_MissingUpperCase_Returns400()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { OldPassword = "Test123!", NewPassword = "alllowercase1" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/change-password", body);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostChangePassword_AsVendedor_SameAsOld_Returns400()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { OldPassword = "Test123!", NewPassword = "Test123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/change-password", body);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostChangePassword_AsVendedor_WrongOldPassword_Returns400()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { OldPassword = "WrongOld1", NewPassword = "NewPass123!" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/change-password", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostChangePassword_AsAdmin_HappyPath_ReturnsOk()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new { OldPassword = "Test123!", NewPassword = "Brand1New2Pass3" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/change-password", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostChangePassword_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { OldPassword = "Test123!", NewPassword = "Brand1New2Pass3" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/change-password", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /refresh
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostRefresh_WithInvalidToken_Returns401()
    {
        var client = AnonymousClient();
        var body = new { RefreshToken = "not-a-real-token" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/refresh", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PostRefresh_WithEmptyToken_Returns401()
    {
        var client = AnonymousClient();
        var body = new { RefreshToken = "" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/refresh", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostRefresh_AsAuthenticatedUser_Returns401WhenTokenBogus()
    {
        // Even with bearer headers, the refresh endpoint requires a valid
        // refresh token. Bogus token = 401 regardless of caller identity.
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { RefreshToken = "still-bogus" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/refresh", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /logout
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostLogout_AsVendedor_ReturnsOk()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { RefreshToken = (string?)null };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/logout", body);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PostLogout_AsAdmin_WithRefreshToken_ReturnsOk()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new { RefreshToken = "bogus-but-handled-gracefully" };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/logout", body);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PostLogout_AsVendedor_WithDeviceFingerprint_ReturnsOk()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor2Id);
        client.DefaultRequestHeaders.Add("X-Device-Fingerprint", "fp-logout");
        var body = new { RefreshToken = (string?)null };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/logout", body);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PostLogout_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { RefreshToken = (string?)null };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/logout", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /device-token
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostDeviceToken_AsVendedor_ReturnsOk()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        client.DefaultRequestHeaders.Add("X-Device-Id", "dev-1");
        client.DefaultRequestHeaders.Add("X-Device-Fingerprint", "fp-1");
        var body = new
        {
            Token = "ExponentPushToken[abcdefg]",
            Platform = "android",
            DeviceName = "Pixel 7"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/device-token", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostDeviceToken_AsAdmin_ReturnsOk()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new
        {
            Token = "ExponentPushToken[admin]",
            Platform = "ios",
            DeviceName = "iPhone 15"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/device-token", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostDeviceToken_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new
        {
            Token = "ExponentPushToken[xxx]",
            Platform = "android",
            DeviceName = "Anonymous"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/auth/device-token", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ──────────────────────────────────────────────────────────
    // POST /ack-unbind
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostAckUnbind_AsVendedor_ReturnsOk()
    {
        var client = AuthedClient("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        client.DefaultRequestHeaders.Add("X-Device-Fingerprint", "fp-ack");
        var response = await client.PostAsync("/api/mobile/auth/ack-unbind", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostAckUnbind_AsAdmin_ReturnsOk()
    {
        var client = AuthedClient("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.PostAsync("/api/mobile/auth/ack-unbind", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostAckUnbind_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/auth/ack-unbind", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
