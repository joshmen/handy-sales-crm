using HandySales.Billing.Api.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog.Events;

namespace HandySales.Billing.Api.Controllers;

[ApiController]
[Route("api/superadmin/log-level")]
[Authorize]
public class LogLevelController : ControllerBase
{
    [HttpGet]
    public IActionResult GetLevel()
    {
        var role = User.FindFirst("role")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role != "SUPER_ADMIN") return Forbid();

        return Ok(new { level = LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.ToString() });
    }

    [HttpPost]
    public IActionResult SetLevel([FromBody] LogLevelRequest req)
    {
        var role = User.FindFirst("role")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role != "SUPER_ADMIN") return Forbid();

        if (Enum.TryParse<LogEventLevel>(req.Level, true, out var level))
        {
            LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = level;
            return Ok(new { level = level.ToString(), message = $"Log level changed to {level}" });
        }
        return BadRequest(new { error = "Invalid level. Use: Warning, Information, or Debug" });
    }
}

public record LogLevelRequest(string Level);
