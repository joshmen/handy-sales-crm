using HandySuites.Api.Payments;

namespace HandySuites.Api.Endpoints;

public static class StripeWebhookEndpoints
{
    public static void MapStripeWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        // No auth — Stripe authenticates via signature
        app.MapPost("/api/stripe/webhook", async (
            HttpContext context,
            IStripeService stripeService,
            ILogger<Program> logger) =>
        {
            context.Request.EnableBuffering();
            var json = await new StreamReader(context.Request.Body).ReadToEndAsync();
            context.Request.Body.Position = 0;
            var signature = context.Request.Headers["Stripe-Signature"].ToString();

            if (string.IsNullOrEmpty(signature))
                return Results.BadRequest(new { message = "Missing Stripe-Signature header" });

            try
            {
                await stripeService.HandleWebhookAsync(json, signature);
                return Results.Ok();
            }
            catch (Stripe.StripeException ex)
            {
                logger.LogError(ex, "Stripe webhook signature validation failed");
                return Results.BadRequest(new { message = "Invalid signature" });
            }
            catch (InvalidOperationException ex)
            {
                // Business-logic errors (tenant not found, plan misconfigured, etc.) are
                // non-recoverable — retrying will produce the same result. Return 200 so
                // Stripe does not retry for 72 h. The error is already logged at the
                // handler level; add context here for the endpoint trace.
                logger.LogError(ex, "Stripe webhook: non-recoverable business error — returning 200 to suppress retries");
                return Results.Ok();
            }
            catch (Exception ex)
            {
                // Only truly transient failures (DB down, network error) should return 5xx
                // so Stripe can retry later.
                logger.LogError(ex, "Stripe webhook: transient error — returning 500 so Stripe retries");
                return Results.StatusCode(500);
            }
        })
        .WithName("StripeWebhook")
        .WithSummary("Stripe webhook endpoint")
        .RequireCors("HandySuitesPolicy");
    }
}
