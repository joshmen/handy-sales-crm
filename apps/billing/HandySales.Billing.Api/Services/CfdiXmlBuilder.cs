using System.Globalization;
using System.Text;
using System.Xml;
using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Services;

/// <summary>
/// Generates CFDI 4.0 XML (Anexo 20) from a Factura entity.
/// Output: unsigned XML string (without Sello, NoCertificado, or TFD complement).
/// </summary>
public class CfdiXmlBuilder : ICfdiXmlBuilder
{
    private const string CfdiNamespace = "http://www.sat.gob.mx/cfd/4";
    private const string XsiNamespace = "http://www.w3.org/2001/XMLSchema-instance";
    private const string SchemaLocation = "http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd";

    public string BuildXml(Factura factura, ConfiguracionFiscal config)
    {
        var settings = new XmlWriterSettings
        {
            Indent = false, // SAT XML must not have extra whitespace
            Encoding = System.Text.Encoding.UTF8,
            OmitXmlDeclaration = false
        };

        // Use Utf8StringWriter to produce UTF-8 declaration (StringWriter forces UTF-16)
        using var sw = new Utf8StringWriter();
        using (var writer = XmlWriter.Create(sw, settings))
        {
            writer.WriteStartDocument();
            WriteComprobante(writer, factura, config);
            writer.WriteEndDocument();
        }

        return sw.ToString();
    }

    private void WriteComprobante(XmlWriter w, Factura factura, ConfiguracionFiscal config)
    {
        w.WriteStartElement("cfdi", "Comprobante", CfdiNamespace);
        w.WriteAttributeString("xmlns", "xsi", null, XsiNamespace);
        w.WriteAttributeString("xsi", "schemaLocation", XsiNamespace, SchemaLocation);
        w.WriteAttributeString("Version", "4.0");

        // Serie y Folio
        if (!string.IsNullOrEmpty(factura.Serie))
            w.WriteAttributeString("Serie", factura.Serie);
        w.WriteAttributeString("Folio", factura.Folio.ToString());

        // Fecha en formato SAT: yyyy-MM-ddTHH:mm:ss (hora centro de México)
        var mexicoTz = TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City");
        var fechaMexico = TimeZoneInfo.ConvertTimeFromUtc(
            factura.FechaEmision.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(factura.FechaEmision, DateTimeKind.Utc)
                : factura.FechaEmision.ToUniversalTime(),
            mexicoTz);
        w.WriteAttributeString("Fecha", fechaMexico.ToString("yyyy-MM-ddTHH:mm:ss"));

        // Sello y NoCertificado — placeholders, CfdiSigner fills them in
        w.WriteAttributeString("Sello", "");
        w.WriteAttributeString("NoCertificado", "");
        w.WriteAttributeString("Certificado", "");

        // Forma y Método de pago
        if (!string.IsNullOrEmpty(factura.FormaPago))
            w.WriteAttributeString("FormaPago", factura.FormaPago);
        if (!string.IsNullOrEmpty(factura.MetodoPago))
            w.WriteAttributeString("MetodoPago", factura.MetodoPago);

        // Condiciones de pago (optional)
        w.WriteAttributeString("TipoDeComprobante", factura.TipoComprobante);

        // Exportación (01 = No aplica)
        w.WriteAttributeString("Exportacion", "01");

        // Lugar de expedición (C.P. del emisor)
        w.WriteAttributeString("LugarExpedicion", config.CodigoPostal ?? "00000");

        // Moneda
        w.WriteAttributeString("Moneda", factura.Moneda);
        if (factura.Moneda != "MXN" && factura.TipoCambio != 1)
            w.WriteAttributeString("TipoCambio", FormatDecimal(factura.TipoCambio, 6));

        // Montos
        w.WriteAttributeString("SubTotal", FormatDecimal(factura.Subtotal));
        if (factura.Descuento > 0)
            w.WriteAttributeString("Descuento", FormatDecimal(factura.Descuento));
        w.WriteAttributeString("Total", FormatDecimal(factura.Total));

        // Emisor
        WriteEmisor(w, factura, config);

        // Receptor
        WriteReceptor(w, factura);

        // Conceptos
        WriteConceptos(w, factura);

        // Impuestos (totales del comprobante)
        WriteImpuestosTotales(w, factura);

        w.WriteEndElement(); // Comprobante
    }

    private void WriteEmisor(XmlWriter w, Factura factura, ConfiguracionFiscal config)
    {
        w.WriteStartElement("cfdi", "Emisor", CfdiNamespace);
        w.WriteAttributeString("Rfc", factura.EmisorRfc);
        w.WriteAttributeString("Nombre", factura.EmisorNombre);
        w.WriteAttributeString("RegimenFiscal", factura.EmisorRegimenFiscal ?? config.RegimenFiscal ?? "601");
        w.WriteEndElement();
    }

    private void WriteReceptor(XmlWriter w, Factura factura)
    {
        w.WriteStartElement("cfdi", "Receptor", CfdiNamespace);
        w.WriteAttributeString("Rfc", factura.ReceptorRfc);
        w.WriteAttributeString("Nombre", factura.ReceptorNombre);

        // Domicilio fiscal del receptor (C.P.) — required in CFDI 4.0
        w.WriteAttributeString("DomicilioFiscalReceptor", factura.ReceptorDomicilioFiscal ?? "00000");

        // Régimen fiscal del receptor — required in CFDI 4.0
        w.WriteAttributeString("RegimenFiscalReceptor", factura.ReceptorRegimenFiscal ?? "616");

        // Uso CFDI
        w.WriteAttributeString("UsoCFDI", factura.ReceptorUsoCfdi ?? factura.UsoCfdi ?? "G03");

        w.WriteEndElement();
    }

    private void WriteConceptos(XmlWriter w, Factura factura)
    {
        w.WriteStartElement("cfdi", "Conceptos", CfdiNamespace);

        var detalles = factura.Detalles?.OrderBy(d => d.NumeroLinea).ToList() ?? new();
        foreach (var d in detalles)
        {
            w.WriteStartElement("cfdi", "Concepto", CfdiNamespace);
            w.WriteAttributeString("ClaveProdServ", d.ClaveProdServ);

            if (!string.IsNullOrEmpty(d.NoIdentificacion))
                w.WriteAttributeString("NoIdentificacion", d.NoIdentificacion);

            w.WriteAttributeString("Cantidad", FormatDecimal(d.Cantidad, 6));
            w.WriteAttributeString("ClaveUnidad", d.ClaveUnidad ?? "H87"); // H87 = Pieza (default)

            if (!string.IsNullOrEmpty(d.Unidad))
                w.WriteAttributeString("Unidad", d.Unidad);

            w.WriteAttributeString("Descripcion", d.Descripcion);
            w.WriteAttributeString("ValorUnitario", FormatDecimal(d.ValorUnitario));
            w.WriteAttributeString("Importe", FormatDecimal(d.Importe));

            if (d.Descuento > 0)
                w.WriteAttributeString("Descuento", FormatDecimal(d.Descuento));

            // ObjetoImp: 01=No es objeto, 02=Sí es objeto, 03=Sí objeto no obligado
            w.WriteAttributeString("ObjetoImp", d.ObjetoImp);

            // Write per-concept taxes if ObjetoImp = "02"
            if (d.ObjetoImp == "02")
            {
                WriteConceptoImpuestos(w, d, factura);
            }

            w.WriteEndElement(); // Concepto
        }

        w.WriteEndElement(); // Conceptos
    }

    private void WriteConceptoImpuestos(XmlWriter w, DetalleFactura detalle, Factura factura)
    {
        // Get taxes for this specific line item
        var impuestosLinea = factura.Impuestos?
            .Where(i => i.DetalleFacturaId == detalle.Id)
            .ToList() ?? new();

        // If no per-line taxes, generate default IVA 16%
        if (impuestosLinea.Count == 0)
        {
            var baseImporte = detalle.Importe - detalle.Descuento;
            impuestosLinea.Add(new ImpuestoFactura
            {
                Tipo = "TRASLADO",
                Impuesto = "002",       // IVA
                TipoFactor = "Tasa",
                TasaOCuota = 0.160000m,
                Base = baseImporte,
                Importe = Math.Round(baseImporte * 0.16m, 2, MidpointRounding.ToEven)
            });
        }

        w.WriteStartElement("cfdi", "Impuestos", CfdiNamespace);

        var traslados = impuestosLinea.Where(i => i.Tipo == "TRASLADO").ToList();
        if (traslados.Count > 0)
        {
            w.WriteStartElement("cfdi", "Traslados", CfdiNamespace);
            foreach (var t in traslados)
            {
                w.WriteStartElement("cfdi", "Traslado", CfdiNamespace);
                w.WriteAttributeString("Base", FormatDecimal(t.Base));
                w.WriteAttributeString("Impuesto", t.Impuesto);
                w.WriteAttributeString("TipoFactor", t.TipoFactor);
                if (t.TipoFactor != "Exento")
                {
                    w.WriteAttributeString("TasaOCuota", FormatDecimal(t.TasaOCuota ?? 0, 6));
                    w.WriteAttributeString("Importe", FormatDecimal(t.Importe ?? 0));
                }
                w.WriteEndElement();
            }
            w.WriteEndElement(); // Traslados
        }

        var retenciones = impuestosLinea.Where(i => i.Tipo == "RETENCION").ToList();
        if (retenciones.Count > 0)
        {
            w.WriteStartElement("cfdi", "Retenciones", CfdiNamespace);
            foreach (var r in retenciones)
            {
                w.WriteStartElement("cfdi", "Retencion", CfdiNamespace);
                w.WriteAttributeString("Base", FormatDecimal(r.Base));
                w.WriteAttributeString("Impuesto", r.Impuesto);
                w.WriteAttributeString("TipoFactor", r.TipoFactor);
                w.WriteAttributeString("TasaOCuota", FormatDecimal(r.TasaOCuota ?? 0, 6));
                w.WriteAttributeString("Importe", FormatDecimal(r.Importe ?? 0));
                w.WriteEndElement();
            }
            w.WriteEndElement(); // Retenciones
        }

        w.WriteEndElement(); // Impuestos
    }

    private void WriteImpuestosTotales(XmlWriter w, Factura factura)
    {
        if (factura.TotalImpuestosTrasladados == 0 && factura.TotalImpuestosRetenidos == 0)
            return;

        // Collect all per-concept taxes (same logic as WriteConceptoImpuestos)
        var allTaxes = new List<ImpuestoFactura>();
        if (factura.Impuestos != null && factura.Impuestos.Count > 0)
        {
            allTaxes.AddRange(factura.Impuestos);
        }
        else
        {
            // Generate default IVA 16% per-concept if no explicit taxes
            var detalles = factura.Detalles?.Where(d => d.ObjetoImp == "02").ToList() ?? new();
            foreach (var d in detalles)
            {
                var baseImporte = d.Importe - d.Descuento;
                allTaxes.Add(new ImpuestoFactura
                {
                    Tipo = "TRASLADO",
                    Impuesto = "002",
                    TipoFactor = "Tasa",
                    TasaOCuota = 0.160000m,
                    Base = baseImporte,
                    Importe = Math.Round(baseImporte * 0.16m, 2, MidpointRounding.ToEven)
                });
            }
        }

        w.WriteStartElement("cfdi", "Impuestos", CfdiNamespace);

        if (factura.TotalImpuestosRetenidos > 0)
            w.WriteAttributeString("TotalImpuestosRetenidos", FormatDecimal(factura.TotalImpuestosRetenidos));

        if (factura.TotalImpuestosTrasladados > 0)
            w.WriteAttributeString("TotalImpuestosTrasladados", FormatDecimal(factura.TotalImpuestosTrasladados));

        // Aggregate traslados by (Impuesto, TipoFactor, TasaOCuota)
        var allTraslados = allTaxes
            .Where(i => i.Tipo == "TRASLADO")
            .GroupBy(i => new { i.Impuesto, i.TipoFactor, i.TasaOCuota })
            .ToList();

        if (allTraslados.Count > 0)
        {
            w.WriteStartElement("cfdi", "Traslados", CfdiNamespace);
            foreach (var group in allTraslados)
            {
                w.WriteStartElement("cfdi", "Traslado", CfdiNamespace);
                w.WriteAttributeString("Base", FormatDecimal(group.Sum(g => g.Base)));
                w.WriteAttributeString("Impuesto", group.Key.Impuesto);
                w.WriteAttributeString("TipoFactor", group.Key.TipoFactor);
                if (group.Key.TipoFactor != "Exento")
                {
                    w.WriteAttributeString("TasaOCuota", FormatDecimal(group.Key.TasaOCuota ?? 0, 6));
                    w.WriteAttributeString("Importe", FormatDecimal(group.Sum(g => g.Importe ?? 0)));
                }
                w.WriteEndElement();
            }
            w.WriteEndElement(); // Traslados
        }

        // Aggregate retenciones by (Impuesto)
        var allRetenciones = allTaxes
            .Where(i => i.Tipo == "RETENCION")
            .GroupBy(i => i.Impuesto)
            .ToList();

        if (allRetenciones.Count > 0)
        {
            w.WriteStartElement("cfdi", "Retenciones", CfdiNamespace);
            foreach (var group in allRetenciones)
            {
                w.WriteStartElement("cfdi", "Retencion", CfdiNamespace);
                w.WriteAttributeString("Impuesto", group.Key);
                w.WriteAttributeString("Importe", FormatDecimal(group.Sum(g => g.Importe ?? 0)));
                w.WriteEndElement();
            }
            w.WriteEndElement(); // Retenciones
        }

        w.WriteEndElement(); // Impuestos
    }

    /// <summary>
    /// Formats a decimal value with banker's rounding to the specified number of decimal places.
    /// SAT requires minimum 2 decimals for amounts, 6 for rates.
    /// </summary>
    private static string FormatDecimal(decimal value, int decimals = 2)
    {
        var rounded = Math.Round(value, decimals, MidpointRounding.ToEven);
        return rounded.ToString($"F{decimals}", CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// StringWriter that reports UTF-8 encoding (instead of default UTF-16).
    /// </summary>
    private sealed class Utf8StringWriter : StringWriter
    {
        public override Encoding Encoding => Encoding.UTF8;
    }
}
