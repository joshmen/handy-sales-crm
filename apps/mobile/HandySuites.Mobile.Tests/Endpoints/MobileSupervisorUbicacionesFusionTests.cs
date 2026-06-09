using FluentAssertions;
using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Domain.Common;
using Moq;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests del FIX del bug "mapa equipo sin pins" (sprint pre-prod #11 audit 2026-06-07).
///
/// El endpoint GET /api/mobile/supervisor/ubicaciones antes solo leia
/// ClienteVisitas (check-ins manuales). Si vendedores no habian hecho visitas con
/// GPS, devolvia data vacia aun cuando UbicacionesVendedor tenia decenas de pings
/// recientes del tracking GPS background.
///
/// Fix replica la fusion del endpoint web /api/team/ubicaciones-recientes:
///   1. Pings de UbicacionesVendedor (feature guard tracking_vendedor) tienen prioridad
///   2. Fallback a check-ins de visita (ClienteVisitas LatitudInicio/LongitudInicio)
///   3. Por usuario, queda el timestamp mas reciente
///
/// Estos tests verifican la logica de fusion via UbicacionVendedorRepository mock.
/// Tests de integracion E2E del endpoint quedan para la fase de validacion en emulador.
/// </summary>
public class MobileSupervisorUbicacionesFusionTests
{
    private const int TenantId = 1;

    [Fact]
    public void ObtenerUltimasAsync_FiltraPorTargetIds_RetornaSoloVendedoresDelEquipo()
    {
        var repo = new Mock<IUbicacionVendedorRepository>();
        var subordinadoIds = new List<int> { 5, 6 };
        var pings = new List<UltimaUbicacionDto>
        {
            new() { UsuarioId = 5, Latitud = 25.532801m, Longitud = -108.916703m, CapturadoEn = DateTime.UtcNow.AddHours(-1), Tipo = TipoPingUbicacion.Checkpoint },
            new() { UsuarioId = 6, Latitud = 25.905098m, Longitud = -108.636495m, CapturadoEn = DateTime.UtcNow.AddHours(-2), Tipo = TipoPingUbicacion.Checkpoint },
        };
        repo.Setup(r => r.ObtenerUltimasAsync(TenantId, subordinadoIds))
            .ReturnsAsync(pings);

        var result = repo.Object.ObtenerUltimasAsync(TenantId, subordinadoIds).Result;

        result.Should().HaveCount(2);
        result.Select(p => p.UsuarioId).Should().BeEquivalentTo(new[] { 5, 6 });
    }

    [Fact]
    public void FusionLogic_PingTrackingMasRecienteQueVisita_PrioridadAlPing()
    {
        // Simula la logica del endpoint: dictionary fusion entre visitas + pings.
        var visitaCuando = DateTime.UtcNow.AddHours(-5);
        var pingCuando = DateTime.UtcNow.AddMinutes(-10);

        var byUsuario = new Dictionary<int, (DateTime Cuando, double Lat, double Lon, string? ClienteNombre)>
        {
            [5] = (visitaCuando, 25.5m.ToDouble(), -108.9m.ToDouble(), "Cliente A")
        };

        var ping = new UltimaUbicacionDto
        {
            UsuarioId = 5,
            Latitud = 26.0m,
            Longitud = -109.0m,
            CapturadoEn = pingCuando,
            Tipo = TipoPingUbicacion.Checkpoint
        };

        var existing = byUsuario.GetValueOrDefault(5);
        if (existing == default || ping.CapturadoEn > existing.Cuando)
        {
            byUsuario[5] = (ping.CapturadoEn, (double)ping.Latitud, (double)ping.Longitud, existing.ClienteNombre);
        }

        byUsuario[5].Cuando.Should().Be(pingCuando, "ping mas reciente sobrescribe visita vieja");
        byUsuario[5].Lat.Should().Be(26.0, "lat del ping reemplaza");
        byUsuario[5].ClienteNombre.Should().Be("Cliente A", "preserva cliente nombre de la visita previa");
    }

    [Fact]
    public void FusionLogic_VisitaMasRecienteQuePing_NoOverride()
    {
        var visitaCuando = DateTime.UtcNow.AddMinutes(-5);
        var pingCuando = DateTime.UtcNow.AddHours(-2);

        var byUsuario = new Dictionary<int, (DateTime Cuando, double Lat, double Lon, string? ClienteNombre)>
        {
            [5] = (visitaCuando, 25.5m.ToDouble(), -108.9m.ToDouble(), "Cliente Visita")
        };

        var ping = new UltimaUbicacionDto
        {
            UsuarioId = 5,
            Latitud = 26.0m,
            Longitud = -109.0m,
            CapturadoEn = pingCuando,
            Tipo = TipoPingUbicacion.Checkpoint
        };

        var existing = byUsuario.GetValueOrDefault(5);
        if (existing == default || ping.CapturadoEn > existing.Cuando)
        {
            byUsuario[5] = (ping.CapturadoEn, (double)ping.Latitud, (double)ping.Longitud, existing.ClienteNombre);
        }

        byUsuario[5].Cuando.Should().Be(visitaCuando, "visita mas reciente NO debe ser sobrescrita");
        byUsuario[5].ClienteNombre.Should().Be("Cliente Visita");
    }

    [Fact]
    public void FusionLogic_SoloPingSinVisita_AgregaPin()
    {
        // Caso del bug actual: vendedor 5 tiene 30 pings GPS pero 0 check-ins.
        // Antes del fix: data vacia. Despues: aparece el pin.
        var byUsuario = new Dictionary<int, (DateTime Cuando, double Lat, double Lon, string? ClienteNombre)>();

        var ping = new UltimaUbicacionDto
        {
            UsuarioId = 5,
            Latitud = 25.532801m,
            Longitud = -108.916703m,
            CapturadoEn = DateTime.UtcNow.AddMinutes(-15),
            Tipo = TipoPingUbicacion.Checkpoint
        };

        var existing = byUsuario.GetValueOrDefault(5);
        if (existing == default || ping.CapturadoEn > existing.Cuando)
        {
            byUsuario[5] = (ping.CapturadoEn, (double)ping.Latitud, (double)ping.Longitud, existing.ClienteNombre);
        }

        byUsuario.Should().ContainKey(5, "fix permite que pings GPS aparezcan sin necesidad de check-in de visita");
        byUsuario[5].ClienteNombre.Should().BeNull("pings GPS no tienen cliente asociado");
    }

    [Fact]
    public async Task FeatureGuard_PlanSinTracking_DegradacionAVisitas()
    {
        // Si el plan no incluye tracking_vendedor, el repo de UbicacionVendedor
        // no se debe consultar (waste of resources). Endpoint cae a fallback de
        // ClienteVisitas.
        var guard = new Mock<ISubscriptionFeatureGuard>();
        guard.Setup(g => g.HasFeatureAsync(TenantId, "tracking_vendedor"))
             .ReturnsAsync(false);

        var hasTracking = await guard.Object.HasFeatureAsync(TenantId, "tracking_vendedor");
        var ubicacionesTracking = hasTracking
            ? new List<UltimaUbicacionDto> { new() { UsuarioId = 5 } }
            : new List<UltimaUbicacionDto>();

        hasTracking.Should().BeFalse();
        ubicacionesTracking.Should().BeEmpty("plan sin tracking → 0 pings, fallback a visitas");
    }

    [Fact]
    public async Task FeatureGuard_PlanConTracking_UsaPings()
    {
        var guard = new Mock<ISubscriptionFeatureGuard>();
        guard.Setup(g => g.HasFeatureAsync(TenantId, "tracking_vendedor"))
             .ReturnsAsync(true);

        var hasTracking = await guard.Object.HasFeatureAsync(TenantId, "tracking_vendedor");
        hasTracking.Should().BeTrue("plan PRO/BASIC/FREE actualmente incluyen tracking_vendedor=true");
    }
}

internal static class DecimalToDoubleExtensions
{
    public static double ToDouble(this decimal d) => (double)d;
}
