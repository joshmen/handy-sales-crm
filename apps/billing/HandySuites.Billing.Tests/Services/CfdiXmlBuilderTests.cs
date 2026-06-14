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
    /// <summary>
    /// Regression: with multiple lines whose per-line rounding produces a fractional-cent
    /// discrepancy vs. the stored factura.TotalImpuestosTrasladados, the XML header
    /// TotalImpuestosTrasladados must equal the sum of the <Traslado> Importe children —
    /// not the stored field — so the SAT does not reject with CFDI40135.
    /// </summary>
    [Fact]
    public void BuildXml_TotalImpuestosTrasladados_MatchesSumOfTrasladoNodes_WhenRoundingDrifts()
    {
        // 3 lines at amounts whose IVA rounds inconsistently at the line level.
        // e.g. 33.33 * 0.16 = 5.3328 → rounds to 5.33; 33.33+33.34 = 66.67 * 0.16 = 10.6672 → 10.67
        // Stored total (order-level): 100.00 * 0.16 = 16.00
        // Per-line sum: 5.33 + 5.33 + 5.34 = 16.00  (this specific split happens to match, but the
        // structure guarantees it regardless — the test asserts header == desglose, not a hardcoded value)
        // We force a known discrepancy: use 3 lines of 10.001 each, so per-line IVA = 1.60 * 3 = 4.80,
        // but if the stored field is set to 4.81 (simulating the saved-at-order-level value), the header
        // must still output 4.80 (from the desglose).
        var sut = new CfdiXmlBuilder();

        // Amounts: 10.00 each line → IVA per line = Math.Round(10.00 * 0.16, 2) = 1.60 × 3 = 4.80
        // Deliberately set TotalImpuestosTrasladados to a slightly different value (as if calculated upstream)
        var (factura, config) = BuildMinimalValidPair(f =>
        {
            f.Detalles = new List<DetalleFactura>
            {
                new DetalleFactura { Id = 1, NumeroLinea = 1, ClaveProdServ = "01010101", ClaveUnidad = "H87",
                    Cantidad = 1m, Descripcion = "Linea 1", ValorUnitario = 10.00m, Importe = 10.00m,
                    Descuento = 0m, ObjetoImp = "02" },
                new DetalleFactura { Id = 2, NumeroLinea = 2, ClaveProdServ = "01010101", ClaveUnidad = "H87",
                    Cantidad = 1m, Descripcion = "Linea 2", ValorUnitario = 10.00m, Importe = 10.00m,
                    Descuento = 0m, ObjetoImp = "02" },
                new DetalleFactura { Id = 3, NumeroLinea = 3, ClaveProdServ = "01010101", ClaveUnidad = "H87",
                    Cantidad = 1m, Descripcion = "Linea 3", ValorUnitario = 10.00m, Importe = 10.00m,
                    Descuento = 0m, ObjetoImp = "02" }
            };
            f.Impuestos = new List<ImpuestoFactura>(); // empty → builder generates IVA per line
            f.Subtotal = 30.00m;
            f.Total = 34.81m; // intentionally reflects the "stored" wrong total
            f.TotalImpuestosTrasladados = 4.81m; // stored value differs from per-line sum (4.80)
            f.TotalImpuestosRetenidos = 0m;
        });

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);
        var nsmgr = NsMgr(doc);

        // 1. Read the header TotalImpuestosTrasladados attribute
        var impuestosNode = doc.SelectSingleNode("//cfdi:Impuestos[not(parent::cfdi:Concepto)]", nsmgr) as XmlElement;
        Assert.NotNull(impuestosNode);
        var headerTotal = impuestosNode!.GetAttribute("TotalImpuestosTrasladados");
        Assert.False(string.IsNullOrEmpty(headerTotal), "TotalImpuestosTrasladados attribute must exist");

        // 2. Sum the Importe attributes of each <Traslado> child node (the desglose)
        var trasladoNodes = doc.SelectNodes(
            "//cfdi:Impuestos[not(parent::cfdi:Concepto)]/cfdi:Traslados/cfdi:Traslado",
            nsmgr);
        Assert.NotNull(trasladoNodes);
        Assert.True(trasladoNodes!.Count > 0, "At least one Traslado node must exist in header Impuestos");

        var desgloseSum = 0m;
        foreach (XmlElement traslado in trasladoNodes)
        {
            var importeStr = traslado.GetAttribute("Importe");
            Assert.False(string.IsNullOrEmpty(importeStr));
            desgloseSum += decimal.Parse(importeStr, System.Globalization.CultureInfo.InvariantCulture);
        }

        // 3. Header must equal desglose sum (not the stored 4.81)
        Assert.Equal(desgloseSum.ToString("F2", System.Globalization.CultureInfo.InvariantCulture), headerTotal);
        // Confirm header is 4.80, not 4.81
        Assert.Equal("4.80", headerTotal);
    }

    // ---- Test 11
    /// <summary>
    /// Simple single-line case: TotalImpuestosTrasladados still matches the desglose (no regression).
    /// </summary>
    [Fact]
    public void BuildXml_TotalImpuestosTrasladados_MatchesSumOfTrasladoNodes_SingleLine()
    {
        var sut = new CfdiXmlBuilder();
        var (factura, config) = BuildMinimalValidPair(); // 1 line, 100.00, IVA 16.00, stored = 16.00

        var xml = sut.BuildXml(factura, config);
        var doc = LoadXml(xml);
        var nsmgr = NsMgr(doc);

        var impuestosNode = doc.SelectSingleNode("//cfdi:Impuestos[not(parent::cfdi:Concepto)]", nsmgr) as XmlElement;
        Assert.NotNull(impuestosNode);
        var headerTotal = impuestosNode!.GetAttribute("TotalImpuestosTrasladados");
        Assert.Equal("16.00", headerTotal);

        var trasladoNodes = doc.SelectNodes(
            "//cfdi:Impuestos[not(parent::cfdi:Concepto)]/cfdi:Traslados/cfdi:Traslado",
            nsmgr);
        Assert.NotNull(trasladoNodes);
        Assert.Equal(1, trasladoNodes!.Count);
        var importeStr = ((XmlElement)trasladoNodes[0]!).GetAttribute("Importe");
        Assert.Equal(headerTotal, importeStr);
    }

    // ---- Test 12
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
