using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class FakeJwtAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public new const string Scheme = "TestScheme";

    [Obsolete]
    public FakeJwtAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock)
        : base(options, logger, encoder, clock) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Allow tests to explicitly test unauthenticated behavior
        // by adding header: X-Test-Unauthenticated: true
        if (Request.Headers.ContainsKey("X-Test-Unauthenticated"))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        // Allow overriding user identity via headers
        var userId = Request.Headers.ContainsKey("X-Test-UserId")
            ? Request.Headers["X-Test-UserId"].ToString() : "1";
        var tenantId = Request.Headers.ContainsKey("X-Test-TenantId")
            ? Request.Headers["X-Test-TenantId"].ToString() : "1";
        var isSuperAdmin = Request.Headers.ContainsKey("X-Test-SuperAdmin");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("tenant_id", tenantId),
            new("sub", userId),
        };

        if (isSuperAdmin)
        {
            claims.Add(new Claim("es_super_admin", "True"));
            claims.Add(new Claim(ClaimTypes.Role, "SuperAdmin"));
        }
        else
        {
            claims.Add(new Claim("es_admin", "True"));
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
        }

        var identity = new ClaimsIdentity(claims, Scheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

}
