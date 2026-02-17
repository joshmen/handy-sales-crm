using FluentAssertions;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySales.Tests.Api.Endpoints
{
    public class DashboardEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly HandySalesDbContext _context;

        public DashboardEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
            var scope = factory.Services.CreateScope();
            _context = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
        }

        [Fact]
        public async Task GetDashboardMetrics_DeberiaRequerir_Autenticacion()
        {
            // Arrange - Skip authentication for this test
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            // Act
            var response = await _client.GetAsync("/api/dashboard/metrics");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetDashboardMetrics_DeberiaRetornarMetricas_CuandoUsuarioEstaAutenticado()
        {
            // Arrange
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Crear datos de prueba
            await CreateTestActivityData();

            // Act
            var response = await _client.GetAsync("/api/dashboard/metrics");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var metrics = JsonSerializer.Deserialize<JsonElement>(content);

            metrics.TryGetProperty("todayActivities", out var todayActivities).Should().BeTrue();
            metrics.TryGetProperty("weekActivities", out var weekActivities).Should().BeTrue();
            metrics.TryGetProperty("monthlyLogins", out var monthlyLogins).Should().BeTrue();
            metrics.TryGetProperty("activeUsersToday", out var activeUsersToday).Should().BeTrue();
            metrics.TryGetProperty("totalUsers", out var totalUsers).Should().BeTrue();
            metrics.TryGetProperty("recentErrors", out var recentErrors).Should().BeTrue();
            metrics.TryGetProperty("systemHealth", out var systemHealth).Should().BeTrue();
            metrics.TryGetProperty("lastSync", out var lastSync).Should().BeTrue();
            metrics.TryGetProperty("lastUpdate", out var lastUpdate).Should().BeTrue();

            // Verificar que los valores son números o strings apropiados
            todayActivities.ValueKind.Should().Be(JsonValueKind.Number);
            systemHealth.GetString().Should().BeOneOf("healthy", "warning");
        }

        [Fact]
        public async Task GetRecentActivity_DeberiaRequerir_Autenticacion()
        {
            // Arrange - Skip authentication for this test
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            // Act
            var response = await _client.GetAsync("/api/dashboard/activity");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetRecentActivity_DeberiaRetornarActividades_CuandoUsuarioEstaAutenticado()
        {
            // Arrange
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Crear datos de prueba
            await CreateTestActivityData();

            // Act
            var response = await _client.GetAsync("/api/dashboard/activity?limit=5");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);

            result.TryGetProperty("activities", out var activitiesElement).Should().BeTrue();
            activitiesElement.ValueKind.Should().Be(JsonValueKind.Array);

            var activities = activitiesElement.EnumerateArray().ToList();
            activities.Should().HaveCountLessThanOrEqualTo(5);

            if (activities.Any())
            {
                var firstActivity = activities.First();
                firstActivity.TryGetProperty("id", out _).Should().BeTrue();
                firstActivity.TryGetProperty("type", out _).Should().BeTrue();
                firstActivity.TryGetProperty("category", out _).Should().BeTrue();
                firstActivity.TryGetProperty("status", out _).Should().BeTrue();
                firstActivity.TryGetProperty("description", out _).Should().BeTrue();
                firstActivity.TryGetProperty("createdAt", out _).Should().BeTrue();
                firstActivity.TryGetProperty("timeAgo", out _).Should().BeTrue();
            }
        }

        [Fact]
        public async Task GetRecentActivity_DeberiaLimitarResultados_SegunParametroLimit()
        {
            // Arrange
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Crear múltiples actividades de prueba
            await CreateMultipleTestActivities(10);

            // Act
            var response = await _client.GetAsync("/api/dashboard/activity?limit=3");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);

            result.TryGetProperty("activities", out var activitiesElement).Should().BeTrue();
            var activities = activitiesElement.EnumerateArray().ToList();
            activities.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetActivityChart_DeberiaRequerir_Autenticacion()
        {
            // Arrange - Skip authentication for this test
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            // Act
            var response = await _client.GetAsync("/api/dashboard/activity/chart");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetActivityChart_DeberiaRetornarDatosDelGrafico_CuandoUsuarioEstaAutenticado()
        {
            // Arrange
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Crear datos de prueba
            await CreateTestActivityData();

            // Act
            var response = await _client.GetAsync("/api/dashboard/activity/chart?days=7");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);

            result.TryGetProperty("chartData", out var chartDataElement).Should().BeTrue();
            chartDataElement.ValueKind.Should().Be(JsonValueKind.Array);

            var chartData = chartDataElement.EnumerateArray().ToList();
            chartData.Should().HaveCount(8); // 7 days + today

            if (chartData.Any())
            {
                var firstDataPoint = chartData.First();
                firstDataPoint.TryGetProperty("date", out _).Should().BeTrue();
                firstDataPoint.TryGetProperty("fullDate", out _).Should().BeTrue();
                firstDataPoint.TryGetProperty("totalActivities", out _).Should().BeTrue();
                firstDataPoint.TryGetProperty("logins", out _).Should().BeTrue();
                firstDataPoint.TryGetProperty("errors", out _).Should().BeTrue();
                firstDataPoint.TryGetProperty("uniqueUsers", out _).Should().BeTrue();
            }
        }

        [Fact]
        public async Task GetActivityChart_DeberiaPermitirConfigurarDias_ConParametroDays()
        {
            // Arrange
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Act
            var response = await _client.GetAsync("/api/dashboard/activity/chart?days=3");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);

            result.TryGetProperty("chartData", out var chartDataElement).Should().BeTrue();
            var chartData = chartDataElement.EnumerateArray().ToList();
            chartData.Should().HaveCount(4); // 3 days + today
        }

        private async Task CreateTestActivityData()
        {
            var today = DateTime.UtcNow.Date;
            var activities = new[]
            {
                new ActivityLog
                {
                    TenantId = 1,
                    UserId = 1,
                    ActivityType = "login",
                    ActivityCategory = "auth",
                    ActivityStatus = "success",
                    Description = "Usuario inició sesión",
                    IpAddress = "192.168.1.1",
                    UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0",
                    Browser = "Chrome",
                    OperatingSystem = "Windows",
                    DeviceType = "desktop",
                    CreatedAt = today.AddHours(10)
                },
                new ActivityLog
                {
                    TenantId = 1,
                    UserId = 1,
                    ActivityType = "create",
                    ActivityCategory = "entities",
                    ActivityStatus = "success",
                    Description = "Cliente creado",
                    IpAddress = "192.168.1.2",
                    CreatedAt = today.AddHours(11)
                },
                new ActivityLog
                {
                    TenantId = 1,
                    UserId = 1,
                    ActivityType = "login",
                    ActivityCategory = "auth",
                    ActivityStatus = "failed",
                    Description = "Intento de login fallido",
                    IpAddress = "192.168.1.3",
                    CreatedAt = today.AddDays(-1)
                }
            };

            _context.ActivityLogs.AddRange(activities);
            await _context.SaveChangesAsync();
        }

        private async Task CreateMultipleTestActivities(int count)
        {
            var activities = new List<ActivityLog>();
            for (int i = 0; i < count; i++)
            {
                activities.Add(new ActivityLog
                {
                    TenantId = 1,
                    UserId = 1,
                    ActivityType = "test",
                    ActivityCategory = "test",
                    ActivityStatus = "success",
                    Description = $"Test activity {i}",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-i)
                });
            }

            _context.ActivityLogs.AddRange(activities);
            await _context.SaveChangesAsync();
        }
    }
}