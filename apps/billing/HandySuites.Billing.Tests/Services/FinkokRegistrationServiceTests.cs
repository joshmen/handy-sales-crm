using System.Net;
using System.Text;
using HandySuites.Billing.Api.DTOs;
using HandySuites.Billing.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Unit tests para FinkokRegistrationService.
/// Mock HttpClient via HttpMessageHandler para no llamar Finkok real.
/// BILL-1 (2026-05-26).
/// </summary>
public class FinkokRegistrationServiceTests
{
    private static FinkokRegistrationService CreateService(string mockResponse, HttpStatusCode status = HttpStatusCode.OK)
    {
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(status)
            {
                Content = new StringContent(mockResponse, Encoding.UTF8, "text/xml"),
            });

        var httpClient = new HttpClient(handler.Object);

        var configDict = new Dictionary<string, string?>
        {
            ["Finkok:ResellerUsername"] = "test-reseller",
            ["Finkok:ResellerPassword"] = "test-password",
            ["Finkok:Ambiente"] = "sandbox",
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(configDict).Build();

        return new FinkokRegistrationService(httpClient, config, NullLogger<FinkokRegistrationService>.Instance);
    }

    [Fact]
    public async Task RegisterEmitterAsync_DeberiaRetornarSuccess_CuandoFinkokRespondeOk()
    {
        // Arrange: respuesta SOAP típica con success=true
        var soapResponse = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <ns2:addResponse xmlns:ns2=""http://facturacion.finkok.com/registration"">
      <ns2:return>
        <success>true</success>
        <message>RFC registrado correctamente</message>
      </ns2:return>
    </ns2:addResponse>
  </S:Body>
</S:Envelope>";
        var service = CreateService(soapResponse);

        // Act
        var result = await service.RegisterEmitterAsync(new RegisterEmitterRequest(
            "EKU9003173C9", new byte[] { 1, 2, 3 }, new byte[] { 4, 5, 6 }, "test", 'P'));

        // Assert
        Assert.True(result.Success);
        Assert.False(result.AlreadyExists);
        Assert.Contains("registrado", result.Message ?? "");
    }

    [Fact]
    public async Task RegisterEmitterAsync_DeberiaDetectarAlreadyExists_CuandoFinkokDiceDuplicate()
    {
        var soapResponse = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <addResponse>
      <return>
        <success>false</success>
        <message>The taxpayer_id is already registered</message>
      </return>
    </addResponse>
  </S:Body>
</S:Envelope>";
        var service = CreateService(soapResponse);

        var result = await service.RegisterEmitterAsync(new RegisterEmitterRequest(
            "EKU9003173C9", new byte[] { 1 }, new byte[] { 2 }, "p", 'O'));

        Assert.False(result.Success);
        Assert.True(result.AlreadyExists);
        Assert.Equal("ALREADY_EXISTS", result.ErrorCode);
    }

    [Fact]
    public async Task RegisterEmitterAsync_DeberiaManejarHtmlResponse_CuandoServicioCaido()
    {
        // Sandbox a veces devuelve HTML cuando está caído
        var htmlResponse = "<html><body>Service unavailable</body></html>";
        var service = CreateService(htmlResponse);

        var result = await service.RegisterEmitterAsync(new RegisterEmitterRequest(
            "EKU9003173C9", new byte[] { 1 }, new byte[] { 2 }, "p", 'P'));

        Assert.False(result.Success);
        Assert.Equal("PAC_HTML", result.ErrorCode);
        Assert.Contains("no respondió correctamente", result.Message ?? "");
    }

    [Fact]
    public async Task GetEmitterInfoAsync_DeberiaParsearStatus_DeRespuesta()
    {
        var soapResponse = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body>
    <getResponse>
      <ResellerUser>
        <status>active</status>
        <type_user>O</type_user>
        <credit>5000</credit>
        <consumed>123</consumed>
      </ResellerUser>
    </getResponse>
  </S:Body>
</S:Envelope>";
        var service = CreateService(soapResponse);

        var result = await service.GetEmitterInfoAsync("EKU9003173C9");

        Assert.True(result.Success);
        Assert.Equal("active", result.Status);
        Assert.Equal('O', result.TypeUser);
        Assert.Equal(5000, result.CreditsRemaining);
        Assert.Equal(123, result.CreditsConsumedMonth);
    }

    [Fact]
    public async Task AssignCreditsAsync_DeberiaRechazarCreditosCero()
    {
        var service = CreateService("<unused/>");

        var result = await service.AssignCreditsAsync("EKU9003173C9", 0);

        Assert.False(result.Success);
        Assert.Contains("> 0", result.Message ?? "");
    }

    [Fact]
    public async Task UpdateEmitterAsync_DeberiaConstruirEnvelopeConCsdVacioSiNoSeProvee()
    {
        // Just verify no crash + result parses
        var soapResponse = @"<?xml version=""1.0""?>
<S:Envelope xmlns:S=""http://schemas.xmlsoap.org/soap/envelope/"">
  <S:Body><editResponse><return><success>true</success><message>Status updated</message></return></editResponse></S:Body>
</S:Envelope>";
        var service = CreateService(soapResponse);

        // Solo cambiar status, sin tocar CSD
        var result = await service.UpdateEmitterAsync(new UpdateEmitterRequest(
            "EKU9003173C9", "suspended", null, null, null));

        Assert.True(result.Success);
    }
}
