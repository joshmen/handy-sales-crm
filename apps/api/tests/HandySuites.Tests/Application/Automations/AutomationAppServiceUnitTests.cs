using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Automations.DTOs;
using HandySuites.Application.Automations.Interfaces;
using HandySuites.Application.Automations.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Automations;

public class AutomationAppServiceUnitTests
{
    private readonly Mock<IAutomationRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly AutomationAppService _service;

    public AutomationAppServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);

        _service = new AutomationAppService(_repo.Object);
    }

    [Fact]
    public async Task ActivarAsync_DeberiaLanzarException_CuandoTemplateNoExiste()
    {
        // Arrange
        _repo.Setup(r => r.GetTemplateBySlugAsync("inexistente"))
            .ReturnsAsync((AutomationTemplate?)null);

        // Act
        Func<Task> act = async () => await _service.ActivarAsync(1, 1, "inexistente", null);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Template*not found*");
    }

    [Fact]
    public async Task ActivarAsync_DeberiaLanzarException_CuandoAutomationYaActiva()
    {
        // Arrange
        var template = new AutomationTemplate { Id = 10, Slug = "ya-activa", DefaultParamsJson = "{}" };
        _repo.Setup(r => r.GetTemplateBySlugAsync("ya-activa")).ReturnsAsync(template);
        _repo.Setup(r => r.GetTenantAutomationAsync(1, 10))
            .ReturnsAsync(new TenantAutomation { Id = 99, TenantId = 1, TemplateId = 10, Activo = true });

        // Act
        Func<Task> act = async () => await _service.ActivarAsync(1, 1, "ya-activa", null);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already active*");
    }

    [Fact]
    public async Task ActivarAsync_DeberiaActivarConDefaultParams_CuandoParamsJsonEsNull()
    {
        // Arrange
        var template = new AutomationTemplate
        {
            Id = 20,
            Slug = "happy-path",
            DefaultParamsJson = "{\"limit\":5}"
        };
        _repo.Setup(r => r.GetTemplateBySlugAsync("happy-path")).ReturnsAsync(template);
        _repo.Setup(r => r.GetTenantAutomationAsync(1, 20))
            .ReturnsAsync((TenantAutomation?)null);
        _repo.Setup(r => r.ActivarAsync(1, 20, 7, "{\"limit\":5}")).ReturnsAsync(123);

        // Act
        var result = await _service.ActivarAsync(1, 7, "happy-path", null);

        // Assert
        result.Should().Be(123);
        _repo.Verify(r => r.ActivarAsync(1, 20, 7, "{\"limit\":5}"), Times.Once);
    }

    [Fact]
    public async Task ActivarAsync_DeberiaLanzarException_CuandoParamsJsonExcedeTamanoMaximo()
    {
        // Arrange
        var template = new AutomationTemplate { Id = 30, Slug = "big-params", DefaultParamsJson = "{}" };
        _repo.Setup(r => r.GetTemplateBySlugAsync("big-params")).ReturnsAsync(template);

        var oversizedJson = "{\"x\":\"" + new string('A', 4096) + "\"}"; // > 4096 chars

        // Act
        Func<Task> act = async () => await _service.ActivarAsync(1, 1, "big-params", oversizedJson);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*exceden el tama*");
    }

    [Fact]
    public async Task ConfigurarAsync_DeberiaLanzarException_CuandoParamsJsonNoEsObjetoValido()
    {
        // Arrange — array en lugar de objeto JSON
        // (no se requiere setup del repo: ValidateParamsJson lanza antes)

        // Act
        Func<Task> act = async () => await _service.ConfigurarAsync(1, "any-slug", "[1,2,3]");

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*objeto JSON v*lido*");
    }

    [Fact]
    public async Task DesactivarAsync_DeberiaRetornarFalse_CuandoTemplateNoExiste()
    {
        // Arrange
        _repo.Setup(r => r.GetTemplateBySlugAsync("ghost"))
            .ReturnsAsync((AutomationTemplate?)null);

        // Act
        var result = await _service.DesactivarAsync(1, "ghost");

        // Assert
        result.Should().BeFalse();
        _repo.Verify(r => r.DesactivarAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }
}
