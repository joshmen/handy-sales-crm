using Microsoft.ApplicationInsights.Extensibility;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using Serilog.Sinks.AwsCloudWatch;

namespace HandySuites.Billing.Api.Configuration;

public static class LoggingExtensions
{
    public static readonly LoggingLevelSwitch CloudWatchLevelSwitch = new(LogEventLevel.Warning);

    public static IHostBuilder AddCustomLogging(this IHostBuilder hostBuilder)
    {
        return hostBuilder.UseSerilog((context, services, configuration) =>
        {
            var appName = "HandySuites.Billing.Api";
            var env = context.HostingEnvironment.EnvironmentName;

            // Development: Debug (verbose), Staging: Information, Production: Warning
            var defaultLevel = env switch
            {
                "Development" => LogEventLevel.Debug,
                "Staging" => LogEventLevel.Information,
                _ => LogEventLevel.Warning,
            };

            CloudWatchLevelSwitch.MinimumLevel = env switch
            {
                "Development" => LogEventLevel.Error,
                "Staging" => LogEventLevel.Warning,
                _ => LogEventLevel.Warning,
            };

            configuration
                .MinimumLevel.Is(defaultLevel)
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore", env == "Production" ? LogEventLevel.Error : LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", env == "Production" ? LogEventLevel.Error : LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Query", env == "Production" ? LogEventLevel.Error : LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.AspNetCore.DataProtection", LogEventLevel.Error)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", appName)
                .Enrich.WithProperty("Environment", env)
                .WriteTo.Console(outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] [{Application}] {Message:lj} {Properties:j}{NewLine}{Exception}")
                .WriteTo.File($"logs/{appName.ToLower()}-.txt",
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}");

            var awsAccessKey = context.Configuration["AWS_ACCESS_KEY_ID"];
            var awsSecretKey = context.Configuration["AWS_SECRET_ACCESS_KEY"];
            if (!string.IsNullOrEmpty(awsAccessKey) && !string.IsNullOrEmpty(awsSecretKey))
            {
                var cloudWatchClient = new Amazon.CloudWatchLogs.AmazonCloudWatchLogsClient(
                    awsAccessKey, awsSecretKey,
                    Amazon.RegionEndpoint.USEast1);

                configuration.WriteTo.Logger(lc => lc
                    .Filter.ByIncludingOnly(e => e.Level >= CloudWatchLevelSwitch.MinimumLevel)
                    .WriteTo.AmazonCloudWatch(
                        logGroup: "/handysuites/api-billing",
                        logStreamPrefix: $"{Environment.MachineName}-",
                        batchSizeLimit: 25,
                        batchUploadPeriodInSeconds: 10,
                        cloudWatchClient: cloudWatchClient));
            }

            if (context.HostingEnvironment.IsDevelopment())
            {
                var seqServerUrl = context.Configuration["Seq:ServerUrl"];
                if (!string.IsNullOrEmpty(seqServerUrl))
                {
                    configuration.WriteTo.Seq(seqServerUrl);
                }
            }
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
