using System.Security.Claims;
using HandySales.Api.TwoFactor;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class TwoFactorEndpoints
{
    public static void MapTwoFactorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/2fa").RequireAuthorization();

        // GET /api/2fa/status — Check 2FA status
        group.MapGet("/status", async (HttpContext context, [FromServices] TotpService totp) =>
        {
            var userId = GetUserId(context);
            if (userId == null) return Results.Unauthorized();

            var status = await totp.GetStatusAsync(userId.Value);
            return Results.Ok(status);
        });

        // POST /api/2fa/setup — Generate TOTP secret + QR code
        group.MapPost("/setup", async (HttpContext context, [FromServices] TotpService totp) =>
        {
            var userId = GetUserId(context);
            if (userId == null) return Results.Unauthorized();

            try
            {
                var result = await totp.GenerateSetupAsync(userId.Value);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/2fa/enable — Verify code and enable 2FA
        group.MapPost("/enable", async (HttpContext context, [FromBody] TwoFactorCodeDto dto, [FromServices] TotpService totp) =>
        {
            var userId = GetUserId(context);
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Code) || dto.Code.Length != 6)
                return Results.BadRequest(new { error = "El código debe ser de 6 dígitos" });

            try
            {
                var result = await totp.EnableAsync(userId.Value, dto.Code);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/2fa/disable — Disable 2FA (requires TOTP code)
        group.MapPost("/disable", async (HttpContext context, [FromBody] TwoFactorCodeDto dto, [FromServices] TotpService totp) =>
        {
            var userId = GetUserId(context);
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Code))
                return Results.BadRequest(new { error = "Se requiere el código TOTP para desactivar 2FA" });

            var success = await totp.DisableAsync(userId.Value, dto.Code);
            return success
                ? Results.Ok(new { message = "2FA desactivado exitosamente" })
                : Results.BadRequest(new { error = "Código inválido" });
        });

        // POST /api/2fa/recovery-codes/regenerate — Generate new recovery codes
        group.MapPost("/recovery-codes/regenerate", async (HttpContext context, [FromBody] TwoFactorCodeDto dto, [FromServices] TotpService totp) =>
        {
            var userId = GetUserId(context);
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Code))
                return Results.BadRequest(new { error = "Se requiere el código TOTP" });

            try
            {
                var codes = await totp.RegenerateRecoveryCodesAsync(userId.Value, dto.Code);
                return Results.Ok(new { recoveryCodes = codes });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }

    private static int? GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? context.User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return null;
        return userId;
    }
}

public record TwoFactorCodeDto(string Code);
