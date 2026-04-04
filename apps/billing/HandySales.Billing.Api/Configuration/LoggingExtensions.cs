using Microsoft.ApplicationInsights.Extensibility;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.AwsCloudWatch;

namespace HandySales.Billing.Api.Configuration;

public static class LoggingExtensions
{
    public static IHostBuilder AddCustomLogging(this IHostBuilder hostBuilder)
    {
        return hostBuilder.UseSerilog((context, services, configuration) =>
        {
            var appName = "HandySales.Billing.Api";

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

            // AWS CloudWatch — errors and warnings only (when AWS credentials are configured)
            var awsAccessKey = context.Configuration["AWS_ACCESS_KEY_ID"];
            var awsSecretKey = context.Configuration["AWS_SECRET_ACCESS_KEY"];
            if (!string.IsNullOrEmpty(awsAccessKey) && !string.IsNullOrEmpty(awsSecretKey))
            {
                var cloudWatchClient = new Amazon.CloudWatchLogs.AmazonCloudWatchLogsClient(
                    awsAccessKey, awsSecretKey,
                    Amazon.RegionEndpoint.USEast1);

                configuration.WriteTo.AmazonCloudWatch(
                    logGroup: "/handysuites/api-billing",
                    logStreamPrefix: $"{Environment.MachineName}-",
                    restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Warning,
                    batchSizeLimit: 25,
                    batchUploadPeriodInSeconds: 10,
                    cloudWatchClient: cloudWatchClient);
            }

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
