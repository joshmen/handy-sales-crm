using System.Xml;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Unit tests for CfdiXmlBuilder — pure XML generator (no external deps).
/// CfdiXmlBuilder has a single public method: BuildXml(Factura, ConfiguracionFiscal).
/// Tests verify CFDI 4.0 (Anexo 20) attributes/elements are present and correct.
/// </summary>
public class CfdiXmlBuilderTests
{
    private const string CfdiNs = "http://www.sat.gob.mx/cfd/4";

    private static (Factura factura, ConfiguracionFiscal config) BuildMinimalValidPair(
        Action<Factura>? customizeFactura = null,
        Action<ConfiguracionFiscal>? customizeConfig = null)
    {
        var factura = new Factura
        {
            TenantId = "tenant-1",
            Serie = "A",
            Folio = 123,
            FechaEmision = new DateTime(2026, 06, 07, 15, 30, 00, DateTimeKind.Utc),
            TipoComprobante = "I",
            MetodoPago = "PUE",
            FormaPago = "03",
            UsoCfdi = "G03",
            EmisorRfc = "EKU9003173C9",
            EmisorNombre = "ESCUELA KEMPER URGATE",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "URE180429TM6",
            ReceptorNombre = "UNIVERSIDAD ROBOTICA ESPANOLA",
            ReceptorUsoCfdi = "G03",
            ReceptorDomicilioFiscal = "65000",
            ReceptorRegimenFiscal = "601",
            Moneda = "MXN",
            TipoCambio = 1,
            Subtotal = 100m,
            Descuento = 0m,
            Total = 116m,
            TotalImpuestosTrasladados = 16m,
            TotalImpuestosRetenidos = 0m,
            Detalles = new List<DetalleFactura>
            {
                new DetalleFactura
                {
                    Id = 1,
                    NumeroLinea = 1,
                    ClaveProdServ = "01010101",
                    ClaveUnidad = "H87",
                    Cantidad = 1m,
                    Descripcion = "Producto de prueba",
                    ValorUnitario = 100m,
                    Importe = 100m,
                    Descuento = 0m,
                    ObjetoImp = "02"
                }
            },
            Impuestos = new List<ImpuestoFactura>()
        };

        var config = new ConfiguracionFiscal
        {
            TenantId = "tenant-1",
            EmpresaId = 1,
            RegimenFiscal = "601",
            Rfc = "EKU9003173C9",
            RazonSocial = "ESCUELA KEMPER URGATE",
            CodigoPostal = "65000",
            Pais = "México",
            Moneda = "MXN"
        };

        customizeFactura?.Invoke(factura);
        customizeConfig?.Invoke(config);

        return (factura, config);
    }

    private static XmlDocument LoadXml(string xml)
    {
        var doc = new XmlDocument();
        doc.LoadXml(xml);
        return doc;
    }

    private static XmlNamespaceManager NsMgr(XmlDocument doc)
    {
        var nsmgr = new XmlNamespaceManager(doc.NameTable);
        nsmgr.AddNamespace("cfdi", CfdiNs);
        return nsmgr;
    }

    // ---- Test 1
    [Fact]
    public void BuildXml_ReturnsXmlWithVersion4()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair();

        var xml = sut.BuildXml(factura, config);

        Assert.False(string.IsNullOrWhiteSpace(xml));
        var doc = LoadXml(xml);
        Assert.NotNull(doc.DocumentElement);
        Assert.Equal("Comprobante", doc.DocumentElement!.LocalName);
        Assert.Equal(CfdiNs, doc.DocumentElement.NamespaceURI);
        Assert.Equal("4.0", doc.DocumentElement.GetAttribute("Version"));
    }

    // ---- Test 2
    [Fact]
    public void BuildXml_IncludesSerieAndFolio()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair(f =>
        {
            f.Serie = "FX";
            f.Folio = 9876;
        });

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);

        Assert.Equal("FX", doc.DocumentElement!.GetAttribute("Serie"));
        Assert.Equal("9876", doc.DocumentElement.GetAttribute("Folio"));
    }

    // ---- Test 3
    [Fact]
    public void BuildXml_EmitsEmisorWithRfcAndNombre()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair();

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);
        var nsmgr = NsMgr(doc);

        var emisor = doc.SelectSingleNode("//cfdi:Emisor", nsmgr) as XmlElement;
        Assert.NotNull(emisor);
        Assert.Equal("EKU9003173C9", emisor!.GetAttribute("Rfc"));
        Assert.Equal("ESCUELA KEMPER URGATE", emisor.GetAttribute("Nombre"));
        Assert.Equal("601", emisor.GetAttribute("RegimenFiscal"));
    }

    // ---- Test 4
    [Fact]
    public void BuildXml_EmitsReceptorWithRequiredCfdi40Fields()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair();

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);
        var nsmgr = NsMgr(doc);

        var receptor = doc.SelectSingleNode("//cfdi:Receptor", nsmgr) as XmlElement;
        Assert.NotNull(receptor);
        Assert.Equal("URE180429TM6", receptor!.GetAttribute("Rfc"));
        Assert.Equal("UNIVERSIDAD ROBOTICA ESPANOLA", receptor.GetAttribute("Nombre"));
        Assert.Equal("65000", receptor.GetAttribute("DomicilioFiscalReceptor"));
        Assert.Equal("601", receptor.GetAttribute("RegimenFiscalReceptor"));
        Assert.Equal("G03", receptor.GetAttribute("UsoCFDI"));
    }

    // ---- Test 5
    [Fact]
    public void BuildXml_ThrowsWhenReceptorDomicilioFiscalIsNull()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair(f => f.ReceptorDomicilioFiscal = null);

        var ex = Record.Exception(() => sut.BuildXml(factura, config));
        // SUT may throw InvalidOperationException directly or wrap via XmlWriter
        Assert.NotNull(ex);
    }

    // ---- Test 6
    [Fact]
    public void BuildXml_ThrowsWhenReceptorRegimenFiscalIsNull()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair(f => f.ReceptorRegimenFiscal = null);

        var ex = Record.Exception(() => sut.BuildXml(factura, config));
        Assert.NotNull(ex);
    }

    // ---- Test 7
    [Fact]
    public void BuildXml_WritesConceptosOrderedByNumeroLinea()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair(f =>
        {
            f.Detalles = new List<DetalleFactura>
            {
                new DetalleFactura
                {
                    Id = 10, NumeroLinea = 2, ClaveProdServ = "BBB",
                    ClaveUnidad = "H87", Cantidad = 1m,
                    Descripcion = "Segundo", ValorUnitario = 50m,
                    Importe = 50m, ObjetoImp = "02"
                },
                new DetalleFactura
                {
                    Id = 11, NumeroLinea = 1, ClaveProdServ = "AAA",
                    ClaveUnidad = "H87", Cantidad = 1m,
                    Descripcion = "Primero", ValorUnitario = 50m,
                    Importe = 50m, ObjetoImp = "02"
                }
            };
            f.Subtotal = 100m;
            f.Total = 116m;
            f.TotalImpuestosTrasladados = 16m;
        });

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);
        var nsmgr = NsMgr(doc);

        var conceptos = doc.SelectNodes("//cfdi:Concepto", nsmgr);
        Assert.NotNull(conceptos);
        Assert.Equal(2, conceptos!.Count);
        Assert.Equal("AAA", ((XmlElement)conceptos[0]!).GetAttribute("ClaveProdServ"));
        Assert.Equal("BBB", ((XmlElement)conceptos[1]!).GetAttribute("ClaveProdServ"));
    }

    // ---- Test 8
    [Fact]
    public void BuildXml_GeneratesDefaultIva16WhenObjetoImp02AndNoTaxes()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair();

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);
        var nsmgr = NsMgr(doc);

        // Per-concept Traslado should exist with Impuesto 002 (IVA)
        var traslado = doc.SelectSingleNode(
            "//cfdi:Concepto/cfdi:Impuestos/cfdi:Traslados/cfdi:Traslado",
            nsmgr) as XmlElement;

        Assert.NotNull(traslado);
        Assert.Equal("002", traslado!.GetAttribute("Impuesto"));
        Assert.Equal("Tasa", traslado.GetAttribute("TipoFactor"));
        Assert.Equal("0.160000", traslado.GetAttribute("TasaOCuota"));
        Assert.Equal("16.00", traslado.GetAttribute("Importe"));
    }

    // ---- Test 9
    [Fact]
    public void BuildXml_OmitsDescuentoAttributeWhenZero_IncludesWhenPositive()
    {
        var sut = new CfdiXmlBuilder();

        // Case A: Descuento = 0 — attribute should not appear at Comprobante level
        var (facturaZero, configZero) = BuildMinimalValidPair(f => f.Descuento = 0m);
        var xmlZero = sut.BuildXml(facturaZero, configZero);
        var docZero = LoadXml(xmlZero);
        Assert.False(docZero.DocumentElement!.HasAttribute("Descuento"));

        // Case B: Descuento > 0 — attribute MUST appear and be formatted to 2 decimals
        var (facturaPos, configPos) = BuildMinimalValidPair(f =>
        {
            f.Descuento = 10m;
            f.Subtotal = 100m;
            f.Total = 104.40m;
            f.TotalImpuestosTrasladados = 14.40m;
        });
        var xmlPos = sut.BuildXml(facturaPos, configPos);
        var docPos = LoadXml(xmlPos);
        Assert.Equal("10.00", docPos.DocumentElement!.GetAttribute("Descuento"));
    }

    // ---- Test 10
    [Fact]
    public void BuildXml_UsesLugarExpedicionFromConfigCodigoPostal_AndFallsBackTo00000()
    {
        var sut = new CfdiXmlBuilder();

        // Case A: config has CP — must use it
        var (facturaWithCp, configWithCp) = BuildMinimalValidPair(
            customizeConfig: c => c.CodigoPostal = "44100");
        var xmlA = sut.BuildXml(facturaWithCp, configWithCp);
        var docA = LoadXml(xmlA);
        Assert.Equal("44100", docA.DocumentElement!.GetAttribute("LugarExpedicion"));

        // Case B: config CP is null — must fallback to "00000"
        var (facturaNoCp, configNoCp) = BuildMinimalValidPair(
            customizeConfig: c => c.CodigoPostal = null);
        var xmlB = sut.BuildXml(facturaNoCp, configNoCp);
        var docB = LoadXml(xmlB);
        Assert.Equal("00000", docB.DocumentElement!.GetAttribute("LugarExpedicion"));
    }
}
