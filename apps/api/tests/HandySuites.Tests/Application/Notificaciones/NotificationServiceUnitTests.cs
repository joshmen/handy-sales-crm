using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.DeviceSessions.Interfaces;
using HandySuites.Application.Notifications.DTOs;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Application.Notifications.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Notificaciones;

public class NotificationServiceUnitTests
{
    private readonly Mock<INotificationRepository> _repo = new();
    private readonly Mock<IDeviceSessionRepository> _deviceSessionRepo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<IFcmService> _fcm = new();
    private readonly Mock<IRealtimePushService> _realtimePush = new();
    private readonly NotificationService _service;

    public NotificationServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("42");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
#pragma warning disable CS0618
        _tenant.SetupGet(t => t.IsAdmin).Returns(true);
#pragma warning restore CS0618
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        _service = new NotificationService(
            _repo.Object,
            _deviceSessionRepo.Object,
            _tenant.Object,
            _fcm.Object,
            _realtimePush.Object);
    }

    // -------- Happy path --------

    [Fact]
    public async Task EnviarNotificacionAsync_ConTokensYFcmExitoso_DeberiaRetornarSuccess()
    {
        var dto = new SendNotificationDto
        {
            UsuarioId = 7,
            Titulo = "Hola",
            Mensaje = "Mundo",
            Tipo = "General",
        };

        _repo.Setup(r => r.CrearAsync(It.IsAny<NotificationHistory>()))
            .ReturnsAsync((NotificationHistory n) => { n.Id = 100; return n; });

        _repo.Setup(r => r.ObtenerPushTokensAsync(1, It.Is<List<int>>(l => l.Contains(7))))
            .ReturnsAsync(new List<(int, int, string)> { (7, 1, "tok-a") });

        _fcm.Setup(f => f.EnviarMulticastAsync(
                It.IsAny<List<string>>(), dto.Titulo, dto.Mensaje, dto.Data))
            .ReturnsAsync(new FcmSendResult { Success = true, MessageId = "msg-1" });

        var result = await _service.EnviarNotificacionAsync(dto);

        result.Success.Should().BeTrue();
        result.NotificationId.Should().Be(100);
        result.MessageId.Should().Be("msg-1");
        _repo.Verify(r => r.ActualizarEstadoAsync(100, NotificationStatus.Sent, "msg-1", null), Times.Once);
    }

    [Fact]
    public async Task ObtenerConteoNoLeidasAsync_DeberiaDelegarAlRepositorio()
    {
        _repo.Setup(r => r.ObtenerConteoNoLeidasAsync(42, 1)).ReturnsAsync(5);

        var result = await _service.ObtenerConteoNoLeidasAsync();

        result.Should().Be(5);
        _repo.Verify(r => r.ObtenerConteoNoLeidasAsync(42, 1), Times.Once);
    }

    // -------- Validation / Edge --------

    [Fact]
    public async Task EnviarNotificacionAsync_SinPushTokens_DeberiaRetornarFailureYMarcarFailed()
    {
        var dto = new SendNotificationDto
        {
            UsuarioId = 9,
            Titulo = "Sin tokens",
            Mensaje = "...",
            Tipo = "General",
        };

        _repo.Setup(r => r.CrearAsync(It.IsAny<NotificationHistory>()))
            .ReturnsAsync((NotificationHistory n) => { n.Id = 200; return n; });

        _repo.Setup(r => r.ObtenerPushTokensAsync(1, It.IsAny<List<int>>()))
            .ReturnsAsync(new List<(int, int, string)>());

        var result = await _service.EnviarNotificacionAsync(dto);

        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
        result.NotificationId.Should().Be(200);
        _repo.Verify(r => r.ActualizarEstadoAsync(
            200,
            NotificationStatus.Failed,
            null,
            It.Is<string>(s => s != null && s.Contains("push token"))), Times.Once);
        _fcm.Verify(f => f.EnviarMulticastAsync(
            It.IsAny<List<string>>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, string>?>()),
            Times.Never);
    }

    [Fact]
    public async Task EnviarNotificacionAsync_FcmFalla_DeberiaMarcarFailedConErrorDelFcm()
    {
        var dto = new SendNotificationDto
        {
            UsuarioId = 11,
            Titulo = "T",
            Mensaje = "M",
            Tipo = "General",
        };

        _repo.Setup(r => r.CrearAsync(It.IsAny<NotificationHistory>()))
            .ReturnsAsync((NotificationHistory n) => { n.Id = 300; return n; });

        _repo.Setup(r => r.ObtenerPushTokensAsync(1, It.IsAny<List<int>>()))
            .ReturnsAsync(new List<(int, int, string)> { (11, 1, "tok-x") });

        _fcm.Setup(f => f.EnviarMulticastAsync(
                It.IsAny<List<string>>(), dto.Titulo, dto.Mensaje, dto.Data))
            .ReturnsAsync(new FcmSendResult { Success = false, Error = "fcm-down" });

        var result = await _service.EnviarNotificacionAsync(dto);

        result.Success.Should().BeFalse();
        result.Error.Should().Be("fcm-down");
        _repo.Verify(r => r.ActualizarEstadoAsync(300, NotificationStatus.Failed, null, "fcm-down"), Times.Once);
    }

    // -------- Delegation / behavior verification --------

    [Fact]
    public async Task MarcarComoLeidaAsync_DeberiaUsarTenantYUsuarioActuales()
    {
        _repo.Setup(r => r.MarcarComoLeidaAsync(55, 42, 1)).ReturnsAsync(true);

        var result = await _service.MarcarComoLeidaAsync(55);

        result.Should().BeTrue();
        _repo.Verify(r => r.MarcarComoLeidaAsync(55, 42, 1), Times.Once);
    }

    [Fact]
    public async Task RegistrarPushTokenAsync_DeberiaDelegarAlDeviceSessionRepository()
    {
        var dto = new RegisterPushTokenDto
        {
            PushToken = "tok-new",
            SessionId = 999,
        };

        _deviceSessionRepo.Setup(d => d.ActualizarPushTokenAsync(999, "tok-new", 1))
            .ReturnsAsync(true);

        var result = await _service.RegistrarPushTokenAsync(dto);

        result.Should().BeTrue();
        _deviceSessionRepo.Verify(d => d.ActualizarPushTokenAsync(999, "tok-new", 1), Times.Once);
    }
}
