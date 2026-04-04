using Amazon.CloudWatchLogs;
using Amazon.CloudWatchLogs.Model;

namespace HandySales.Api.Endpoints;

public static class MonitoringEndpoints
{
    private static readonly string[] LogGroups =
    [
        "/handysuites/api-main",
        "/handysuites/api-billing",
        "/handysuites/api-mobile"
    ];

    public static void MapMonitoringEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/monitoring")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .WithTags("Monitoring");

        group.MapGet("/stats", async (IConfiguration configuration) =>
        {
            var client = CreateClient(configuration);
            if (client == null)
                return Results.Ok(new { message = "AWS CloudWatch not configured", data = Array.Empty<object>() });

            var endTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startTime = DateTimeOffset.UtcNow.AddHours(-24).ToUnixTimeSeconds();

            var results = new List<object>();

            foreach (var logGroup in LogGroups)
            {
                try
                {
                    var queryResponse = await client.StartQueryAsync(new StartQueryRequest
                    {
                        LogGroupName = logGroup,
                        StartTime = startTime,
                        EndTime = endTime,
                        QueryString = "stats count(*) by bin(1h) as hour | filter @message like /ERROR|WARN|Exception/",
                        Limit = 100
                    });

                    var queryId = queryResponse.QueryId;
                    GetQueryResultsResponse queryResults;

                    do
                    {
                        await Task.Delay(500);
                        queryResults = await client.GetQueryResultsAsync(new GetQueryResultsRequest
                        {
                            QueryId = queryId
                        });
                    } while (queryResults.Status == QueryStatus.Running || queryResults.Status == QueryStatus.Scheduled);

                    var hourlyData = queryResults.Results.Select(row =>
                    {
                        var fields = row.ToDictionary(f => f.Field, f => f.Value);
                        return new
                        {
                            hour = fields.GetValueOrDefault("hour", ""),
                            count = fields.GetValueOrDefault("count(*)", "0")
                        };
                    }).ToList();

                    results.Add(new
                    {
                        logGroup,
                        status = queryResults.Status.Value,
                        hourlyData
                    });
                }
                catch (ResourceNotFoundException)
                {
                    results.Add(new
                    {
                        logGroup,
                        status = "NOT_FOUND",
                        hourlyData = Array.Empty<object>()
                    });
                }
            }

            return Results.Ok(new { data = results });
        });

        group.MapGet("/errors/recent", async (IConfiguration configuration) =>
        {
            var client = CreateClient(configuration);
            if (client == null)
                return Results.Ok(new { message = "AWS CloudWatch not configured", data = Array.Empty<object>() });

            var endTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startTime = DateTimeOffset.UtcNow.AddHours(-24).ToUnixTimeSeconds();

            var allErrors = new List<object>();

            foreach (var logGroup in LogGroups)
            {
                try
                {
                    var queryResponse = await client.StartQueryAsync(new StartQueryRequest
                    {
                        LogGroupName = logGroup,
                        StartTime = startTime,
                        EndTime = endTime,
                        QueryString = "fields @timestamp, @message, @logStream | filter @message like /ERROR|Exception/ | sort @timestamp desc | limit 50",
                        Limit = 50
                    });

                    var queryId = queryResponse.QueryId;
                    GetQueryResultsResponse queryResults;

                    do
                    {
                        await Task.Delay(500);
                        queryResults = await client.GetQueryResultsAsync(new GetQueryResultsRequest
                        {
                            QueryId = queryId
                        });
                    } while (queryResults.Status == QueryStatus.Running || queryResults.Status == QueryStatus.Scheduled);

                    foreach (var row in queryResults.Results)
                    {
                        var fields = row.ToDictionary(f => f.Field, f => f.Value);
                        allErrors.Add(new
                        {
                            logGroup,
                            timestamp = fields.GetValueOrDefault("@timestamp", ""),
                            message = fields.GetValueOrDefault("@message", ""),
                            logStream = fields.GetValueOrDefault("@logStream", "")
                        });
                    }
                }
                catch (ResourceNotFoundException)
                {
                    // Log group doesn't exist yet — skip
                }
            }

            var sorted = allErrors
                .OrderByDescending(e => ((dynamic)e).timestamp)
                .Take(50)
                .ToList();

            return Results.Ok(new { data = sorted });
        });
    }

    private static AmazonCloudWatchLogsClient? CreateClient(IConfiguration configuration)
    {
        var awsAccessKey = configuration["AWS_ACCESS_KEY_ID"];
        var awsSecretKey = configuration["AWS_SECRET_ACCESS_KEY"];

        if (string.IsNullOrEmpty(awsAccessKey) || string.IsNullOrEmpty(awsSecretKey))
            return null;

        return new AmazonCloudWatchLogsClient(
            awsAccessKey, awsSecretKey,
            Amazon.RegionEndpoint.USEast1);
    }
}
