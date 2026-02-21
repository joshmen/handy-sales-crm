using HandySales.Api.Payments;

namespace HandySales.Api.Endpoints;

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
            var json = await new StreamReader(context.Request.Body).ReadToEndAsync();
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
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing Stripe webhook");
                return Results.StatusCode(500);
            }
        })
        .WithName("StripeWebhook")
        .WithSummary("Stripe webhook endpoint")
        .RequireCors("HandySalesPolicy");
    }
}
