using FluentAssertions;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.ActivityTracking.Repositories;
using HandySuites.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Tests.Infrastructure.ActivityTracking
{
    public class ActivityTrackingRepositoryTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HandySuitesDbContext _context;
        private readonly ActivityTrackingRepository _repository;

        public ActivityTrackingRepositoryTests(CustomWebApplicationFactory factory)
        {
            var scope = factory.Services.CreateScope();
            _context = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            _repository = new ActivityTrackingRepository(_context);
        }

        [Fact]
        public async Task CreateActivityLogAsync_DeberiaGuardarActivityLog_EnBaseDeDatos()
        {
            // Arrange
            var activityLog = new ActivityLog
            {
                TenantId = 1,
                UserId = 123,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Usuario inició sesión exitosamente",
                IpAddress = "192.168.1.1",
                UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
                Browser = "Chrome",
                OperatingSystem = "Windows",
                DeviceType = "desktop",
                CreatedAt = DateTime.UtcNow
            };

            // Act
            var result = await _repository.CreateActivityLogAsync(activityLog);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);

            // Verificar que se guardó en la base de datos
            var savedActivity = await _context.ActivityLogs.FindAsync(result.Id);
            savedActivity.Should().NotBeNull();
            savedActivity.TenantId.Should().Be(activityLog.TenantId);
            savedActivity.UserId.Should().Be(activityLog.UserId);
            savedActivity.ActivityType.Should().Be(activityLog.ActivityType);
            savedActivity.Description.Should().Be(activityLog.Description);
        }

        [Fact]
        public async Task GetActivityLogsAsync_DeberiaRetornarActividades_DelTenantEspecificado()
        {
            // Arrange — use tenant 2 (user 125) vs tenant 1 (user 123) for isolation
            var tenantId = 2;
            var otherTenantId = 1;

            var activity1 = new ActivityLog
            {
                TenantId = tenantId,
                UserId = 125,  // user 125 belongs to tenant 2
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Login activity 1",
                CreatedAt = DateTime.UtcNow.AddMinutes(-10)
            };

            var activity2 = new ActivityLog
            {
                TenantId = tenantId,
                UserId = 125,
                ActivityType = "logout",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Logout activity 2",
                CreatedAt = DateTime.UtcNow.AddMinutes(-5)
            };

            // Crear actividad para otro tenant (no debería aparecer)
            var activityOtherTenant = new ActivityLog
            {
                TenantId = otherTenantId,
                UserId = 123,  // user 123 belongs to tenant 1
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Other tenant activity",
                CreatedAt = DateTime.UtcNow.AddMinutes(-1)
            };

            await _repository.CreateActivityLogAsync(activity1);
            await _repository.CreateActivityLogAsync(activity2);
            await _repository.CreateActivityLogAsync(activityOtherTenant);

            // Act
            var result = await _repository.GetActivityLogsAsync(tenantId, limit: 10);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2);
            result.All(a => a.TenantId == tenantId).Should().BeTrue();
            
            // Verificar orden descendente por fecha
            var activities = result.ToList();
            activities[0].Description.Should().Be("Logout activity 2"); // más reciente primero
            activities[1].Description.Should().Be("Login activity 1");
        }

        [Fact]
        public async Task GetActivityLogsAsync_DeberiaFiltrarPorUsuario_CuandoSeEspecifica()
        {
            // Arrange — use unique IDs to avoid data leakage from other tests
            var tenantId = 9001;
            var userId = 9001;
            var otherUserId = 9002;

            var userActivity = new ActivityLog
            {
                TenantId = tenantId,
                UserId = userId,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "User activity",
                CreatedAt = DateTime.UtcNow
            };

            var otherUserActivity = new ActivityLog
            {
                TenantId = tenantId,
                UserId = otherUserId,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Other user activity",
                CreatedAt = DateTime.UtcNow
            };

            await _repository.CreateActivityLogAsync(userActivity);
            await _repository.CreateActivityLogAsync(otherUserActivity);

            // Act
            var result = await _repository.GetActivityLogsAsync(tenantId, userId, limit: 10);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result.First().UserId.Should().Be(userId);
            result.First().Description.Should().Be("User activity");
        }

        [Fact]
        public async Task GetActivitiesCountAsync_DeberiaContarActividades_DelTenantEspecificado()
        {
            // Arrange — use unique IDs to avoid data leakage from other tests
            // tenantId=9010 has userId=9010; tenantId=9020 has userId=9020 (seeded)
            var tenantId = 9010;
            var otherTenantId = 9020;
            var today = DateTime.UtcNow.Date;

            // Actividades de hoy para tenant 1
            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 9010,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Activity 1",
                CreatedAt = today.AddHours(10)
            });

            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 9010,
                ActivityType = "logout",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Activity 2",
                CreatedAt = today.AddHours(11)
            });

            // Actividad de ayer (no debería contarse)
            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 9010,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Yesterday activity",
                CreatedAt = today.AddDays(-1)
            });

            // Actividad de otro tenant (no debería contarse)
            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = otherTenantId,
                UserId = 9020,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Other tenant activity",
                CreatedAt = today.AddHours(12)
            });

            // Act
            var count = await _repository.GetActivitiesCountAsync(tenantId, today);

            // Assert
            count.Should().Be(2);
        }

        [Fact]
        public async Task GetActivitiesCountAsync_DeberiaFiltrarPorTipo_CuandoSeEspecifica()
        {
            // Arrange — use tenant 9010 (exists in seed, isolated from other activity tests)
            var tenantId = 9010;

            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 9010,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Login activity",
                CreatedAt = DateTime.UtcNow
            });

            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 9010,
                ActivityType = "create",
                ActivityCategory = "entities",
                ActivityStatus = "success",
                Description = "Create activity",
                CreatedAt = DateTime.UtcNow
            });

            // Act
            var loginCount = await _repository.GetActivitiesCountAsync(tenantId, activityType: "login");
            var createCount = await _repository.GetActivitiesCountAsync(tenantId, activityType: "create");

            // Assert — BeGreaterThanOrEqualTo because shared DB may have data from parallel tests
            loginCount.Should().BeGreaterThanOrEqualTo(1);
            createCount.Should().BeGreaterThanOrEqualTo(1);
        }

        [Fact]
        public async Task GetUniqueUsersCountAsync_DeberiaContarUsuariosUnicos_DelTenantEspecificado()
        {
            // Arrange — use tenant 1 (users 123, 124 belong to it)
            var tenantId = 1;
            var today = DateTime.UtcNow.Date;

            // Usuario 123 con múltiples actividades
            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 123,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "User 123 login",
                CreatedAt = today.AddHours(10)
            });

            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 123,
                ActivityType = "logout",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "User 123 logout",
                CreatedAt = today.AddHours(11)
            });

            // Usuario 124 con una actividad
            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 124,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "User 124 login",
                CreatedAt = today.AddHours(12)
            });

            // Act
            var uniqueUsersCount = await _repository.GetUniqueUsersCountAsync(tenantId, today);

            // Assert
            uniqueUsersCount.Should().BeGreaterThanOrEqualTo(2); // At least users 123 and 124
        }

        [Fact]
        public async Task GetActivityChartDataAsync_DeberiaRetornarDatosParaGrafico_ConDiasCompletos()
        {
            // Arrange
            var tenantId = 1;
            var days = 7;
            var today = DateTime.UtcNow.Date;

            // Crear actividades en diferentes días
            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 123,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Login today",
                CreatedAt = today.AddHours(10)
            });

            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 123,
                ActivityType = "create",
                ActivityCategory = "entities",
                ActivityStatus = "failed",
                Description = "Failed create today",
                CreatedAt = today.AddHours(11)
            });

            await _repository.CreateActivityLogAsync(new ActivityLog
            {
                TenantId = tenantId,
                UserId = 124,
                ActivityType = "login",
                ActivityCategory = "auth",
                ActivityStatus = "success",
                Description = "Login yesterday",
                CreatedAt = today.AddDays(-1).AddHours(10)
            });

            // Act
            var result = await _repository.GetActivityChartDataAsync(tenantId, days);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(days + 1); // days + today

            var resultList = result.ToList();
            var todayData = resultList.LastOrDefault();
            
            // Verificar datos de hoy
            todayData.Should().NotBeNull();
            var todayDataDict = todayData as dynamic;
            // Note: En un entorno real, necesitarías hacer casting apropiado según el tipo devuelto
        }
    }
}