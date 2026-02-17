using Microsoft.ApplicationInsights.Extensibility;
using Serilog;
using Serilog.Events;

namespace HandySales.Api.Configuration;

public static class LoggingExtensions
{
    public static IHostBuilder AddCustomLogging(this IHostBuilder hostBuilder)
    {
        return hostBuilder.UseSerilog((context, services, configuration) =>
        {
            var appName = "HandySales.Api";

            configuration
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", appName)
                .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
                .WriteTo.Console(outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] [{Application}] {Message:lj} {Properties:j}{NewLine}{Exception}")
                .WriteTo.File($"logs/{appName.ToLower()}-.txt",
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}");

            // Development: Use Seq
            if (context.HostingEnvironment.IsDevelopment())
            {
                configuration.MinimumLevel.Debug();

                var seqServerUrl = context.Configuration["Seq:ServerUrl"];
                if (!string.IsNullOrEmpty(seqServerUrl))
                {
                    configuration.WriteTo.Seq(seqServerUrl);
                }
            }
            // Production: Use Application Insights
            else
            {
                var telemetryConfig = services.GetService<TelemetryConfiguration>();
                if (telemetryConfig != null)
                {
                    configuration.WriteTo.ApplicationInsights(telemetryConfig, TelemetryConverter.Traces);
                }
            }
        });
    }
}
