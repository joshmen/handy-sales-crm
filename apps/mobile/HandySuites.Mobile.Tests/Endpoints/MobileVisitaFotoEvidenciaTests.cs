using HandySuites.Application.Visitas.DTOs;
using HandySuites.Application.Visitas.Interfaces;
using HandySuites.Application.Visitas.Services;
using HandySuites.Application.Visitas.Validators;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests para evidencia fotográfica adjuntada a una visita (rol VENDEDOR, capa backend).
///
/// El flujo de evidencia foto en visitas es:
///   1. Mobile sube cada imagen a POST /api/mobile/attachments/upload (eventType="visita") → URL Cloudinary
///   2. Mobile incluye las URLs resultantes en CheckOutDto.Fotos: List&lt;string&gt;
///   3. POST /api/mobile/visitas/{id}/check-out persiste las fotos en la visita
///
/// Esta suite cubre:
///   A. Validación de CheckOutDtoValidator — límite 10 fotos, URLs válidas, accept data: URIs.
///   B. Service-level RBAC/IDOR — un VENDEDOR sólo puede adjuntar fotos a SU visita.
///   C. Service-level cross-tenant guard — ObtenerPorIdAsync siempre con tenantId del JWT.
///   D. Payload no perdido — el List&lt;string&gt; Fotos llega intacto al repositorio.
///
/// Patrón: Mocks + FluentValidation (mismo que MobileVisitaEndpointsScopeTests).
/// NO usamos WebApplicationFactory por el bug conocido de JWT config inline.
/// </summary>
public class MobileVisitaFotoEvidenciaTests
{
    private const int TenantId = 1;
    private const int OtroTenantId = 2;
    private const int VendedorId = 42;
    private const int OtroVendedorId = 99;

    private readonly Mock<IClienteVisitaRepository> _repoMock;
    private readonly Mock<ICurrentTenant> _tenantMock;
    private readonly CheckOutDtoValidator _validator;

    public MobileVisitaFotoEvidenciaTests()
    {
        _repoMock = new Mock<IClienteVisitaRepository>();
        _tenantMock = new Mock<ICurrentTenant>();
        _tenantMock.Setup(t => t.TenantId).Returns(TenantId);
        _validator = new CheckOutDtoValidator();
    }

    private void SetupVendedor(int userId = VendedorId)
    {
        _tenantMock.Setup(t => t.UserId).Returns(userId.ToString());
        _tenantMock.Setup(t => t.Role).Returns("VENDEDOR");
        _tenantMock.Setup(t => t.IsAdminOrAbove).Returns(false);
        _tenantMock.Setup(t => t.IsStrictAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSupervisor).Returns(false);
    }

    private ClienteVisitaService BuildService() => new(_repoMock.Object, _tenantMock.Object);

    private static ClienteVisitaDto FakeVisita(int id, int usuarioId, int clienteId = 10) => new()
    {
        Id = id,
        ClienteId = clienteId,
        ClienteNombre = "Cliente Test",
        UsuarioId = usuarioId,
        UsuarioNombre = "Vendedor Test",
        FechaProgramada = DateTime.UtcNow,
        TipoVisita = TipoVisita.Rutina,
        Resultado = ResultadoVisita.Pendiente,
        CreadoEn = DateTime.UtcNow
    };

    // ─────────────────────────────────────────────────────────────
    // A. CheckOutDtoValidator — reglas de evidencia foto
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void Validator_AceptaCheckOut_SinFotos()
    {
        // Foto es opcional — un check-out sin fotos debe validar OK (caso "sin venta").
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.SinVenta,
            Latitud = 19.4,
            Longitud = -99.1
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validator_AceptaCheckOut_ConHastaDiezFotosValidas()
    {
        var fotos = Enumerable.Range(1, 10)
            .Select(i => $"https://res.cloudinary.com/handysuites/evidence/visita/foto-{i}.jpg")
            .ToList();
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Latitud = 19.4,
            Longitud = -99.1,
            Fotos = fotos
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue("10 fotos válidas es el límite superior aceptado");
    }

    [Fact]
    public void Validator_Rechaza_CuandoExcedeDiezFotos()
    {
        // 11 fotos — debe rechazarse para prevenir abuso de storage.
        var fotos = Enumerable.Range(1, 11)
            .Select(i => $"https://res.cloudinary.com/handysuites/evidence/visita/foto-{i}.jpg")
            .ToList();
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Fotos = fotos
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CheckOutDto.Fotos)
            && e.ErrorMessage.Contains("más de 10 fotos"));
    }

    [Fact]
    public void Validator_Rechaza_UrlMalformada()
    {
        // Una URL relativa o basura debe ser rechazada.
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.SinVenta,
            Fotos = new List<string> { "no-es-una-url-valida" }
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CheckOutDto.Fotos)
            && e.ErrorMessage.Contains("URLs"));
    }

    [Fact]
    public void Validator_Acepta_DataUriComoFoto()
    {
        // El validador acepta `data:` URIs (base64 inline) además de URLs absolutas
        // para soportar el caso offline donde mobile aún no ha subido a Cloudinary.
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Fotos = new List<string>
            {
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/"
            }
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue("`data:` URIs son aceptadas para soporte offline");
    }

    [Fact]
    public void Validator_Acepta_MixUrlAbsolutaYDataUri()
    {
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Fotos = new List<string>
            {
                "https://res.cloudinary.com/handysuites/foto-1.jpg",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            }
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validator_Rechaza_UnaUrlValidaYUnaInvalida()
    {
        // Mixed input — debe fallar porque una de las URLs no es válida.
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.SinVenta,
            Fotos = new List<string>
            {
                "https://res.cloudinary.com/handysuites/foto-1.jpg",
                "ftp:invalid uri"
            }
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validator_Acepta_ListaVaciaDeFotos()
    {
        // Lista vacía no debe disparar la regla When(Fotos != null && Fotos.Any()).
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.SinVenta,
            Fotos = new List<string>()
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validator_RechazaResultadoFueraDeEnum()
    {
        // Sanity check — si el resultado no es válido, el validador falla aún con fotos correctas.
        var dto = new CheckOutDto
        {
            Resultado = (ResultadoVisita)99,
            Fotos = new List<string> { "https://res.cloudinary.com/handysuites/foto.jpg" }
        };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CheckOutDto.Resultado));
    }

    // ─────────────────────────────────────────────────────────────
    // B. Service RBAC/IDOR — VENDEDOR solo adjunta fotos a SU visita
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CheckOut_ConFotos_VendedorPuedeAdjuntarASuVisita()
    {
        // Happy path: vendedor 42 hace check-out con 3 fotos en SU visita.
        SetupVendedor(VendedorId);
        var visitaPropia = FakeVisita(id: 100, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(100, TenantId)).ReturnsAsync(visitaPropia);

        CheckOutDto? captured = null;
        _repoMock.Setup(r => r.CheckOutAsync(100, It.IsAny<CheckOutDto>(), TenantId))
            .Callback<int, CheckOutDto, int>((_, d, _) => captured = d)
            .ReturnsAsync(true);

        var service = BuildService();
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Latitud = 19.4326,
            Longitud = -99.1332,
            Fotos = new List<string>
            {
                "https://res.cloudinary.com/handysuites/evidence/visita/foto-1.jpg",
                "https://res.cloudinary.com/handysuites/evidence/visita/foto-2.jpg",
                "https://res.cloudinary.com/handysuites/evidence/visita/foto-3.jpg"
            }
        };

        // Act
        var ok = await service.CheckOutAsync(100, dto);

        // Assert
        ok.Should().BeTrue();
        captured.Should().NotBeNull();
        captured!.Fotos.Should().NotBeNull();
        captured.Fotos!.Should().HaveCount(3, "las 3 URLs de fotos llegan intactas al repositorio");
        captured.Fotos.Should().AllSatisfy(url => url.Should().StartWith("https://res.cloudinary.com/"));
    }

    [Fact]
    public async Task CheckOut_ConFotos_VendedorNoPuedeAdjuntarAVisitaDeOtroVendedor_IDORGuard()
    {
        // IDOR: vendedor 42 intenta hacer check-out (con evidencia foto) de la visita 200
        // que pertenece al vendedor 99. Debe lanzar UnauthorizedAccessException ANTES de
        // tocar el repositorio — la evidencia NUNCA se persiste cruzada.
        SetupVendedor(VendedorId);
        var visitaAjena = FakeVisita(id: 200, usuarioId: OtroVendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(200, TenantId)).ReturnsAsync(visitaAjena);

        var service = BuildService();
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Fotos = new List<string>
            {
                "https://res.cloudinary.com/handysuites/evidence/visita/intruso.jpg"
            }
        };

        // Act
        var act = async () => await service.CheckOutAsync(200, dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Solo el vendedor asignado*");
        _repoMock.Verify(r => r.CheckOutAsync(It.IsAny<int>(), It.IsAny<CheckOutDto>(), It.IsAny<int>()), Times.Never,
            "ni siquiera debemos llamar al repo con fotos cuando el caller no es dueño");
    }

    [Fact]
    public async Task CheckOut_ConFotos_UsaTenantIdDelJwt_NoCrossTenant()
    {
        // Cross-tenant: vendedor en tenant 1 NO debe poder estampar fotos en una visita
        // de tenant 2. El service siempre llama al repo con _tenant.TenantId del JWT.
        SetupVendedor(VendedorId);

        // El repo devuelve null cuando se busca con tenantId=1 una visita de tenant 2.
        _repoMock.Setup(r => r.ObtenerPorIdAsync(300, TenantId)).ReturnsAsync((ClienteVisitaDto?)null);

        var service = BuildService();
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Fotos = new List<string> { "https://res.cloudinary.com/handysuites/evidence/visita/x.jpg" }
        };

        // Act — el service no debe explotar; pasa al repo con tenantId correcto.
        var ok = await service.CheckOutAsync(300, dto);

        // Assert — tenantId del JWT se pasó al ObtenerPorIdAsync; nunca el OtroTenantId.
        _repoMock.Verify(r => r.ObtenerPorIdAsync(300, TenantId), Times.Once);
        _repoMock.Verify(r => r.ObtenerPorIdAsync(It.IsAny<int>(), OtroTenantId), Times.Never);
        _repoMock.Verify(r => r.CheckOutAsync(300, It.IsAny<CheckOutDto>(), TenantId), Times.Once,
            "service llama al repo con tenantId del JWT, el repo se encarga del scope");
    }

    [Fact]
    public async Task CheckOut_ConFotos_PreservaUrlsExactamenteIgualesAlInput()
    {
        // Regression: el service NO debe modificar/normalizar las URLs antes de pasarlas
        // al repo. Si lo hace, la evidencia almacenada no coincidiría con lo subido.
        SetupVendedor(VendedorId);
        var visitaPropia = FakeVisita(id: 400, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(400, TenantId)).ReturnsAsync(visitaPropia);

        CheckOutDto? captured = null;
        _repoMock.Setup(r => r.CheckOutAsync(400, It.IsAny<CheckOutDto>(), TenantId))
            .Callback<int, CheckOutDto, int>((_, d, _) => captured = d)
            .ReturnsAsync(true);

        var fotosOriginales = new List<string>
        {
            "https://res.cloudinary.com/handysuites/v1234/evidence/visita/abc.jpg?x=1",
            "https://res.cloudinary.com/handysuites/v5678/evidence/visita/def.png",
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ"
        };

        var service = BuildService();
        await service.CheckOutAsync(400, new CheckOutDto
        {
            Resultado = ResultadoVisita.Venta,
            Fotos = fotosOriginales
        });

        captured!.Fotos.Should().BeEquivalentTo(fotosOriginales,
            "las URLs deben preservarse byte-a-byte para que el frontend pueda recuperar la evidencia");
    }

    [Fact]
    public async Task CheckOut_SinFotos_VendedorPuedeCerrarSinVenta()
    {
        // Verifica el caso "SinVenta sin evidencia" — fotos = null no debe romper el flujo.
        SetupVendedor(VendedorId);
        var visitaPropia = FakeVisita(id: 500, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(500, TenantId)).ReturnsAsync(visitaPropia);
        _repoMock.Setup(r => r.CheckOutAsync(500, It.IsAny<CheckOutDto>(), TenantId)).ReturnsAsync(true);

        var service = BuildService();
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.SinVenta,
            Notas = "Cliente cerrado",
            Fotos = null
        };

        var ok = await service.CheckOutAsync(500, dto);

        ok.Should().BeTrue();
        _repoMock.Verify(r => r.CheckOutAsync(500, It.Is<CheckOutDto>(d => d.Fotos == null), TenantId), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────
    // C. Documentación del endpoint de upload de attachment (PENDING fixture)
    //    El upload físico vive en MobileAttachmentEndpoints (POST /api/mobile/attachments/upload)
    //    y requiere multipart/form-data + Cloudinary configurado. Para testearlo correctamente
    //    se necesita IClassFixture<CustomWebApplicationFactory> con DI override de
    //    ICloudinaryService (apps/api). El skip de abajo documenta el gap.
    // ─────────────────────────────────────────────────────────────

    [Fact(Skip = "PENDING: integration test requires CustomWebApplicationFactory + Cloudinary mock. Cubierto en E2E mobile (Maestro).")]
    public void UploadAttachment_Visita_DevuelveUrlCloudinary_E2EOnly()
    {
        // Cobertura prevista:
        //   POST /api/mobile/attachments/upload con multipart/form-data:
        //     file=<jpg/png/webp <= 10MB>
        //     eventType=visita
        //     eventLocalId=<guid mobile local>
        //     tipo=evidencia
        //   → 200 { success: true, data: { url: "https://res.cloudinary.com/..." } }
        //
        // Casos negativos esperados:
        //   - Sin file → 400
        //   - eventType desconocido → 400 (allowlist)
        //   - Extensión no permitida (.gif, .pdf) → 400
        //   - File > 10MB → 400
        //   - Sin Cloudinary registrado en prod → 501
    }
}
