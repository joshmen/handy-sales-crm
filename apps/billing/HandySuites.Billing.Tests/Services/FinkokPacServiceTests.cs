using System.Net;
using System.Text;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Unit tests para FinkokPacService.
/// Mock HttpClient via HttpMessageHandler para evitar llamadas reales a Finkok SOAP.
/// Cubre TimbrarAsync, CancelarAsync, ConsultarEstatusAsync, GetSatStatusAsync y SanitizeErrorMessage.
/// </summary>
public class FinkokPacServiceTests
{
    private static (FinkokPacService service, Mock<HttpMessageHandler> handler, List<HttpRequestMessage> capturedRequests)
        CreateService(string mockResponse, HttpStatusCode status = HttpStatusCode.OK)
    {
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        var captured = new List<HttpRequestMessage>();

        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => captured.Add(req))
            .ReturnsAsync(new HttpResponseMessage(status)
            {
                Content = new StringContent(mockResponse, Encoding.UTF8, "text/xml"),
            });

        var httpClient = new HttpClient(handler.Object);
        var service = new FinkokPacService(httpClient, NullLogger<FinkokPacService>.Instance);
        return (service, handler, captured);
    }

    private static FinkokPacService CreateServiceThatThrows(Exception ex)
    {
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(ex);

        var httpClient = new HttpClient(handler.Object);
        return new FinkokPacService(httpClient, NullLogger<FinkokPacService>.Instance);
    }

    private static ConfiguracionFiscal SandboxConfig() => new()
    {
        Id = 1,
        TenantId = "tenant-test",
        EmpresaId = 1,
        Rfc = "EKU9003173C9",
        PacUsuario = "test-user",
        PacPassword = "test-pass",
        PacAmbiente = "sandbox",
    };

    private static ConfiguracionFiscal ProductionConfig() => new()
    {
        Id = 1,
        TenantId = "tenant-test",
        EmpresaId = 1,
        Rfc = "EKU9003173C9",
        PacUsuario = "prod-user",
        PacPassword = "prod-pass",
        PacAmbiente = "production",
    };

    // ========== TimbrarAsync ==========

    [Fact]
    public async Task TimbrarAsync_DeberiaRetornarSuccess_CuandoFinkokRespondeUuidValido()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <stampResponse>
      <stampResult>
        <UUID>11111111-2222-3333-4444-555555555555</UUID>
        <Fecha>2026-06-07T12:00:00</Fecha>
        <SatSeal>SELLO_SAT_FAKE</SatSeal>
        <NoCertificadoSAT>00001000000500003456</NoCertificadoSAT>
        <xml>&lt;cfdi:Comprobante/&gt;</xml>
      </stampResult>
    </stampResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.TimbrarAsync("<cfdi:Comprobante/>", SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("11111111-2222-3333-4444-555555555555", result.Uuid);
        Assert.Equal("SELLO_SAT_FAKE", result.SelloSat);
        Assert.Equal("00001000000500003456", result.NoCertificadoSat);
        Assert.NotNull(result.CadenaOriginalSat);
    }

    [Fact]
    public async Task TimbrarAsync_DeberiaRetornarError_CuandoFinkokRespondeCodigoError()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <stampResponse>
      <stampResult>
        <CodigoError>301</CodigoError>
        <MensajeIncidencia>XML inválido</MensajeIncidencia>
      </stampResult>
    </stampResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.TimbrarAsync("<cfdi/>", SandboxConfig());

        Assert.False(result.Success);
        Assert.Equal("301", result.ErrorCode);
        Assert.Contains("inválido", result.ErrorMessage ?? "");
    }

    [Fact]
    public async Task TimbrarAsync_DeberiaRetornarErrorNoUuid_CuandoRespuestaNoTieneUuid()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <stampResponse>
      <stampResult>
        <xml></xml>
      </stampResult>
    </stampResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.TimbrarAsync("<cfdi/>", SandboxConfig());

        Assert.False(result.Success);
        Assert.Equal("NO_UUID", result.ErrorCode);
    }

    // ========== StampedAsync / QuickStampAsync (Fase B: resiliencia) ==========

    [Fact]
    public async Task StampedAsync_DeberiaRecuperarUuid_CuandoFinkokYaTimbro()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <stampedResponse>
      <stampedResult>
        <UUID>99999999-8888-7777-6666-555555555555</UUID>
        <Fecha>2026-06-09T10:00:00</Fecha>
        <SatSeal>SELLO_RECUPERADO</SatSeal>
        <NoCertificadoSAT>00001000000500003456</NoCertificadoSAT>
        <xml>&lt;cfdi:Comprobante/&gt;</xml>
      </stampedResult>
    </stampedResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        var result = await service.StampedAsync("<cfdi:Comprobante/>", SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("99999999-8888-7777-6666-555555555555", result.Uuid);
        var body = await captured[0].Content!.ReadAsStringAsync();
        Assert.Contains("<stamp:stamped>", body);
        Assert.Equal("stamped", captured[0].Headers.GetValues("SOAPAction").First());
    }

    [Fact]
    public async Task StampedAsync_DeberiaRetornarNoUuid_CuandoNoExisteTimbrado()
    {
        // Finkok responde sin UUID cuando el documento NO fue timbrado previamente.
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <stampedResponse>
      <stampedResult>
        <xml></xml>
      </stampedResult>
    </stampedResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.StampedAsync("<cfdi/>", SandboxConfig());

        Assert.False(result.Success);
        Assert.Equal("NO_UUID", result.ErrorCode);
    }

    [Fact]
    public async Task QuickStampAsync_DeberiaTimbrar_CuandoRespuestaValida()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <quick_stampResponse>
      <quick_stampResult>
        <UUID>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</UUID>
        <Fecha>2026-06-09T11:00:00</Fecha>
        <SatSeal>SELLO_QUICK</SatSeal>
        <NoCertificadoSAT>00001000000500003456</NoCertificadoSAT>
        <xml>&lt;cfdi:Comprobante/&gt;</xml>
      </quick_stampResult>
    </quick_stampResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        var result = await service.QuickStampAsync("<cfdi:Comprobante/>", SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", result.Uuid);
        var body = await captured[0].Content!.ReadAsStringAsync();
        Assert.Contains("<stamp:quick_stamp>", body);
    }

    // ========== GetXmlFromFinkokAsync (Fase C: utilerías) ==========

    [Fact]
    public async Task GetXmlFromFinkok_DeberiaDevolverXml_CuandoFinkokLoTiene()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <get_xmlResponse>
      <get_xmlResult>
        <xml>&lt;cfdi:Comprobante Version=""4.0""/&gt;</xml>
        <error></error>
      </get_xmlResult>
    </get_xmlResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        var result = await service.GetXmlFromFinkokAsync("11111111-2222-3333-4444-555555555555", "EKU9003173C9", SandboxConfig());

        Assert.True(result.Success);
        Assert.Contains("cfdi:Comprobante", result.Xml);
        var body = await captured[0].Content!.ReadAsStringAsync();
        Assert.Contains("utilities", captured[0].RequestUri!.ToString());
        Assert.Contains("<uti:get_xml>", body);
    }

    [Fact]
    public async Task GetXmlFromFinkok_DeberiaFallar_CuandoNoHayXml()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <get_xmlResponse>
      <get_xmlResult>
        <xml></xml>
        <error>UUID not found</error>
      </get_xmlResult>
    </get_xmlResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.GetXmlFromFinkokAsync("00000000-0000-0000-0000-000000000000", "EKU9003173C9", SandboxConfig());

        Assert.False(result.Success);
        Assert.Contains("not found", result.ErrorMessage ?? "");
    }

    [Fact]
    public async Task TimbrarAsync_DeberiaUsarUrlSandbox_CuandoAmbienteEsSandbox()
    {
        var soap = @"<?xml version=""1.0""?><S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/""><S:Body><stampResponse><stampResult><UUID>abc</UUID></stampResult></stampResponse></S:Body></S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        await service.TimbrarAsync("<cfdi/>", SandboxConfig());

        Assert.NotEmpty(captured);
        Assert.Contains("demo-facturacion.finkok.com", captured[0].RequestUri!.ToString());
    }

    [Fact]
    public async Task TimbrarAsync_DeberiaUsarUrlProduction_CuandoAmbienteEsProduction()
    {
        var soap = @"<?xml version=""1.0""?><S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/""><S:Body><stampResponse><stampResult><UUID>abc</UUID></stampResult></stampResponse></S:Body></S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        await service.TimbrarAsync("<cfdi/>", ProductionConfig());

        Assert.NotEmpty(captured);
        var url = captured[0].RequestUri!.ToString();
        Assert.Contains("facturacion.finkok.com", url);
        Assert.DoesNotContain("demo-facturacion.finkok.com", url);
    }

    [Fact]
    public async Task TimbrarAsync_DeberiaSanitizarCredenciales_CuandoHttpFalla()
    {
        // Excepción contiene el password en el mensaje (simula leak de credentials).
        var service = CreateServiceThatThrows(new HttpRequestException("Connection failed for user test-user with password test-pass"));

        var result = await service.TimbrarAsync("<cfdi/>", SandboxConfig());

        Assert.False(result.Success);
        Assert.Equal("PAC_ERROR", result.ErrorCode);
        Assert.DoesNotContain("test-pass", result.ErrorMessage ?? "");
        Assert.DoesNotContain("test-user", result.ErrorMessage ?? "");
    }

    // ========== CancelarAsync ==========

    [Fact]
    public async Task CancelarAsync_DeberiaRetornarCancelada_CuandoEstatusUUID201()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <sign_cancelResponse>
      <sign_cancelResult>
        <Folios>
          <Folio>
            <UUID>aaa-bbb</UUID>
            <EstatusUUID>201</EstatusUUID>
          </Folio>
        </Folios>
        <Acuse>&lt;acuse/&gt;</Acuse>
      </sign_cancelResult>
    </sign_cancelResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.CancelarAsync("aaa-bbb", "EKU9003173C9", "02", null, SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("CANCELADA", result.EstadoCancelacion);
    }

    [Fact]
    public async Task CancelarAsync_DeberiaDetectarHtml_CuandoSandboxRetornaHtml()
    {
        var html = "<!DOCTYPE html><html><body>Service unavailable</body></html>";

        var (service, _, _) = CreateService(html);
        var result = await service.CancelarAsync("uuid", "EKU9003173C9", "02", null, SandboxConfig());

        Assert.False(result.Success);
        Assert.Equal("PAC_HTML", result.ErrorCode);
        Assert.Contains("no está disponible", result.ErrorMessage ?? "");
    }

    [Fact]
    public async Task CancelarAsync_DeberiaRetornarEnProceso_CuandoEstatusContieneProceso()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <sign_cancelResponse>
      <sign_cancelResult>
        <EstatusCancelacion>En Proceso</EstatusCancelacion>
      </sign_cancelResult>
    </sign_cancelResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.CancelarAsync("uuid", "EKU9003173C9", "02", null, SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("EN_PROCESO", result.EstadoCancelacion);
    }

    // ========== ConsultarEstatusAsync ==========

    [Fact]
    public async Task ConsultarEstatusAsync_DeberiaParsearEstado_CuandoSoapValido()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <query_pendingResponse>
      <query_pendingResult>
        <Estado>Vigente</Estado>
        <EsCancelable>Cancelable sin aceptación</EsCancelable>
        <EstatusCancelacion></EstatusCancelacion>
      </query_pendingResult>
    </query_pendingResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.ConsultarEstatusAsync("uuid", "EKU9003173C9", SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("Vigente", result.Estado);
        Assert.Equal("Cancelable sin aceptación", result.EsCancelable);
    }

    // ========== GetSatStatusAsync ==========

    [Fact]
    public async Task GetSatStatusAsync_DeberiaParsearEstado_CuandoRespuestaValida()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <get_sat_statusResponse>
      <get_sat_statusResult>
        <CodigoEstatus>S - Comprobante obtenido satisfactoriamente</CodigoEstatus>
        <Estado>Vigente</Estado>
        <EsCancelable>Cancelable sin aceptación</EsCancelable>
        <EstatusCancelacion></EstatusCancelacion>
      </get_sat_statusResult>
    </get_sat_statusResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.GetSatStatusAsync("uuid", "EKU9003173C9", "XAXX010101000", 100.00m, SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("Vigente", result.Estado);
        Assert.Contains("satisfactoriamente", result.CodigoEstatus ?? "");
    }

    [Fact]
    public async Task GetSatStatusAsync_DeberiaSanitizarCredenciales_CuandoHttpFalla()
    {
        // El mensaje de la excepción contiene credenciales que deben removerse del result.
        var service = CreateServiceThatThrows(new HttpRequestException("Auth failed for test-user with secret test-pass"));

        var result = await service.GetSatStatusAsync("uuid-x", "EKU9003173C9", "XAXX010101000", 100m, SandboxConfig());

        Assert.False(result.Success);
        Assert.DoesNotContain("test-pass", result.ErrorMessage ?? "");
        Assert.DoesNotContain("test-user", result.ErrorMessage ?? "");
        Assert.Contains("[REDACTED]", result.ErrorMessage ?? "");
    }

    // ========== Sanitización indirecta vía CancelarAsync ==========

    [Fact]
    public async Task CancelarAsync_DeberiaSanitizarCredenciales_CuandoHttpFalla()
    {
        // El mensaje de la excepción contiene credenciales que deben removerse del result.
        var service = CreateServiceThatThrows(new HttpRequestException("Auth failed for test-user with secret test-pass"));

        var result = await service.CancelarAsync("uuid-x", "EKU9003173C9", "02", null, SandboxConfig());

        Assert.False(result.Success);
        Assert.Equal("PAC_ERROR", result.ErrorCode);
        Assert.DoesNotContain("test-pass", result.ErrorMessage ?? "");
        Assert.DoesNotContain("test-user", result.ErrorMessage ?? "");
        Assert.Contains("[REDACTED]", result.ErrorMessage ?? "");
    }

    // ========== Cancelación bilateral (Fase A) ==========

    [Fact]
    public async Task GetPendingCancellations_DeberiaExtraerUuids_YUsarUrlCancel()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <get_pendingResponse>
      <get_pendingResult>
        <uuids>
          <string>11111111-2222-3333-4444-555555555555</string>
          <string>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</string>
        </uuids>
      </get_pendingResult>
    </get_pendingResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        var result = await service.GetPendingCancellationsAsync("XAXX010101000", SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal(2, result.Uuids.Count);
        Assert.Contains("11111111-2222-3333-4444-555555555555", result.Uuids);
        Assert.Contains("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", result.Uuids);
        Assert.Contains("/servicios/soap/cancel", captured[0].RequestUri!.ToString());
        Assert.Contains("get_pending", captured[0].Headers.GetValues("SOAPAction").First());
    }

    [Fact]
    public async Task GetPendingCancellations_DeberiaDetectarHtml()
    {
        var (service, _, _) = CreateService("<!DOCTYPE html><html></html>");
        var result = await service.GetPendingCancellationsAsync("XAXX010101000", SandboxConfig());
        Assert.False(result.Success);
    }

    [Fact]
    public async Task AcceptReject_DeberiaEnviarRespuestaAceptacion_YRetornarSuccess()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <accept_rejectResponse>
      <accept_rejectResult>
        <Folios><Folio><EstatusUUID>201</EstatusUUID></Folio></Folios>
        <Acuse>&lt;acuse/&gt;</Acuse>
      </accept_rejectResult>
    </accept_rejectResponse>
  </S:Body>
</S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        var result = await service.AcceptRejectCancellationAsync(
            "11111111-2222-3333-4444-555555555555", aceptar: true, "XAXX010101000",
            new byte[] { 1, 2, 3 }, new byte[] { 4, 5, 6 }, SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("201", result.Estatus);
        var body = await captured[0].Content!.ReadAsStringAsync();
        Assert.Contains("accept_reject", body);
        Assert.Contains("Aceptacion", body);
    }

    [Fact]
    public async Task AcceptReject_DeberiaEnviarRespuestaRechazo_CuandoNoAcepta()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body><accept_rejectResponse><accept_rejectResult><Folios><Folio><EstatusUUID>201</EstatusUUID></Folio></Folios></accept_rejectResult></accept_rejectResponse></S:Body>
</S:Envelope>";

        var (service, _, captured) = CreateService(soap);
        await service.AcceptRejectCancellationAsync("uuid", aceptar: false, "XAXX010101000",
            new byte[] { 1 }, new byte[] { 2 }, SandboxConfig());

        var body = await captured[0].Content!.ReadAsStringAsync();
        Assert.Contains("Rechazo", body);
    }

    [Fact]
    public async Task GetReceipt_DeberiaParsearAcuse()
    {
        var soap = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body><get_receiptResponse><get_receiptResult><receipt>ACUSE_BASE64</receipt></get_receiptResult></get_receiptResponse></S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.GetReceiptAsync("uuid", "EKU9003173C9", "C", SandboxConfig());

        Assert.True(result.Success);
        Assert.Equal("ACUSE_BASE64", result.Receipt);
    }

    [Fact]
    public async Task GetRelated_DeberiaExtraerRelacionados_ExcluyendoElPropio()
    {
        var self = "11111111-2222-3333-4444-555555555555";
        var related = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
        var soap = $@"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body><get_relatedResponse><get_relatedResult>
    <Padres><string>{related}</string></Padres>
    <uuid>{self}</uuid>
  </get_relatedResult></get_relatedResponse></S:Body>
</S:Envelope>";

        var (service, _, _) = CreateService(soap);
        var result = await service.GetRelatedAsync(self, "EKU9003173C9", "XAXX010101000",
            new byte[] { 1 }, new byte[] { 2 }, SandboxConfig());

        Assert.True(result.Success);
        Assert.Contains(related, result.Relacionados);
        Assert.DoesNotContain(self, result.Relacionados);
    }
}
