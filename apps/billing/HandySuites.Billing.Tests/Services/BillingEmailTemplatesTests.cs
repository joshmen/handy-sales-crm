using HandySuites.Billing.Api.Services;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Tests para BillingEmailTemplates (static class, plantillas HTML para correos).
///
/// Cubre las 3 plantillas:
///   - FacturaEmail (envio CFDI con adjuntos PDF/XML)
///   - FinkokRegistrationSuccess (notificacion alta exitosa)
///   - FinkokRegistrationFailure (notificacion alta fallida)
///
/// Verifica: contenido dinamico, i18n (es/en), branching condicional (adjuntos, razon social, typeUser).
/// </summary>
public class BillingEmailTemplatesTests
{
    // ─── FacturaEmail ──────────────────────────────────────────────────────────

    [Fact]
    public void FacturaEmail_IncludesBothAttachments_WhenPdfAndXmlEnabled()
    {
        var html = BillingEmailTemplates.FacturaEmail(
            serie: "A",
            folio: 123,
            receptorNombre: "Cliente SA",
            emisorNombre: "Jeyma SA",
            total: 1234.56m,
            moneda: "MXN",
            fechaEmision: new DateTime(2026, 6, 5),
            incluyePdf: true,
            incluyeXml: true);

        Assert.Contains("Cliente SA", html);
        Assert.Contains("Jeyma SA", html);
        Assert.Contains("A-123", html);
        Assert.Contains("PDF de la factura", html);
        Assert.Contains("XML (CFDI)", html);
        Assert.Contains("05/06/2026", html);
        Assert.Contains("MXN", html);
        Assert.Contains("1,234.56", html);
    }

    [Fact]
    public void FacturaEmail_OmitsAttachmentsBlock_WhenBothDisabled()
    {
        var html = BillingEmailTemplates.FacturaEmail(
            serie: "B",
            folio: 7,
            receptorNombre: "Receptor",
            emisorNombre: "Emisor",
            total: 100m,
            moneda: "USD",
            fechaEmision: new DateTime(2026, 1, 15),
            incluyePdf: false,
            incluyeXml: false);

        Assert.DoesNotContain("Archivos adjuntos:", html);
        Assert.DoesNotContain("PDF de la factura", html);
        Assert.DoesNotContain("XML (CFDI)", html);
        Assert.Contains("USD", html);
        Assert.Contains("B-7", html);
    }

    [Fact]
    public void FacturaEmail_IncludesOnlyPdf_WhenXmlDisabled()
    {
        var html = BillingEmailTemplates.FacturaEmail(
            serie: "F",
            folio: 1,
            receptorNombre: "R",
            emisorNombre: "E",
            total: 0m,
            moneda: "MXN",
            fechaEmision: DateTime.UtcNow,
            incluyePdf: true,
            incluyeXml: false);

        Assert.Contains("PDF de la factura", html);
        Assert.DoesNotContain("XML (CFDI)", html);
        Assert.Contains("Archivos adjuntos:", html);
    }

    // ─── FinkokRegistrationSuccess ─────────────────────────────────────────────

    [Fact]
    public void FinkokRegistrationSuccess_Spanish_UsesUnlimitedModality_ForTypeUserO()
    {
        var html = BillingEmailTemplates.FinkokRegistrationSuccess(
            rfc: "XAXX010101000",
            razonSocial: "Mi Empresa SA de CV",
            typeUser: 'O',
            lang: "es");

        Assert.Contains("XAXX010101000", html);
        Assert.Contains("Mi Empresa SA de CV", html);
        Assert.Contains("ilimitado", html);
        Assert.Contains("Tu facturación SAT está habilitada", html);
        Assert.Contains("Ir a Facturación", html);
        Assert.DoesNotContain("unlimited", html);
    }

    [Fact]
    public void FinkokRegistrationSuccess_English_UsesPrepaidModality_ForTypeUserP()
    {
        var html = BillingEmailTemplates.FinkokRegistrationSuccess(
            rfc: "ABC123456XY7",
            razonSocial: null,
            typeUser: 'P',
            lang: "en");

        Assert.Contains("ABC123456XY7", html);
        Assert.Contains("prepaid", html);
        Assert.Contains("Your SAT billing is now active", html);
        Assert.Contains("Go to Billing", html);
        Assert.DoesNotContain("ilimitado", html);
    }

    [Fact]
    public void FinkokRegistrationSuccess_OmitsRazonSocialLine_WhenNullOrEmpty()
    {
        var htmlNull = BillingEmailTemplates.FinkokRegistrationSuccess(
            rfc: "XAXX010101000",
            razonSocial: null,
            typeUser: 'O',
            lang: "es");

        var htmlEmpty = BillingEmailTemplates.FinkokRegistrationSuccess(
            rfc: "XAXX010101000",
            razonSocial: "",
            typeUser: 'O',
            lang: "es");

        Assert.DoesNotContain("Razón social:", htmlNull);
        Assert.DoesNotContain("Razón social:", htmlEmpty);
    }

    // ─── FinkokRegistrationFailure ─────────────────────────────────────────────

    [Fact]
    public void FinkokRegistrationFailure_Spanish_IncludesRfcAndErrorAndCausas()
    {
        var html = BillingEmailTemplates.FinkokRegistrationFailure(
            rfc: "XAXX010101000",
            finkokErrorMessage: "Certificate has expired",
            lang: "es");

        Assert.Contains("XAXX010101000", html);
        Assert.Contains("Certificate has expired", html);
        Assert.Contains("No pudimos habilitar tu facturación SAT", html);
        Assert.Contains("Causas comunes:", html);
        Assert.Contains("Certificado CSD caducado", html);
        Assert.Contains("RFC en lista negra del SAT", html);
        Assert.Contains("Contactar soporte", html);
        Assert.Contains("mailto:soporte@handysuites.com", html);
    }

    [Fact]
    public void FinkokRegistrationFailure_English_UsesEnglishCopy()
    {
        var html = BillingEmailTemplates.FinkokRegistrationFailure(
            rfc: "ABC123456XY7",
            finkokErrorMessage: "Invalid CSD",
            lang: "en");

        Assert.Contains("We couldn't enable your SAT billing", html);
        Assert.Contains("Common causes:", html);
        Assert.Contains("Expired CSD certificate", html);
        Assert.Contains("RFC in SAT blacklist", html);
        Assert.Contains("Contact support", html);
        Assert.Contains("Invalid CSD", html);
        Assert.DoesNotContain("Causas comunes:", html);
    }
}
