using HandySales.Billing.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HandySales.Billing.Api.Services;

public class InvoicePdfService : IInvoicePdfService
{
    public byte[] GeneratePdf(Factura factura, ConfiguracionFiscal? config)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.MarginTop(1.5f, Unit.Centimetre);
                page.MarginBottom(1.5f, Unit.Centimetre);
                page.MarginHorizontal(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Element(header => ComposeHeader(header, factura, config));
                page.Content().Element(content => ComposeContent(content, factura));
                page.Footer().Element(footer => ComposeFooter(footer));
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, Factura factura, ConfiguracionFiscal? config)
    {
        container.Column(column =>
        {
            // Watermark for non-timbrada invoices
            if (factura.Estado == "PENDIENTE")
            {
                column.Item().Background(Colors.Yellow.Lighten4).Padding(4).AlignCenter()
                    .Text("BORRADOR — SIN VALIDEZ FISCAL")
                    .FontSize(10).Bold().FontColor(Colors.Orange.Darken2);
            }
            else if (factura.Estado == "CANCELADA")
            {
                column.Item().Background(Colors.Red.Lighten4).Padding(4).AlignCenter()
                    .Text("CANCELADA")
                    .FontSize(10).Bold().FontColor(Colors.Red.Darken2);
            }

            column.Item().PaddingTop(8).Row(row =>
            {
                // Left: Emisor info
                row.RelativeItem(3).Column(col =>
                {
                    col.Item().Text(factura.EmisorNombre).FontSize(14).Bold();
                    col.Item().Text($"RFC: {factura.EmisorRfc}").FontSize(10);

                    if (!string.IsNullOrEmpty(factura.EmisorRegimenFiscal))
                        col.Item().Text($"Régimen: {factura.EmisorRegimenFiscal}").FontSize(8).FontColor(Colors.Grey.Darken1);

                    if (config != null)
                    {
                        if (!string.IsNullOrEmpty(config.CodigoPostal))
                            col.Item().Text($"C.P.: {config.CodigoPostal}").FontSize(8).FontColor(Colors.Grey.Darken1);

                        if (!string.IsNullOrEmpty(config.DireccionFiscal))
                            col.Item().Text(config.DireccionFiscal).FontSize(8).FontColor(Colors.Grey.Darken1);
                    }
                });

                // Right: Invoice identification
                row.RelativeItem(2).Border(1).BorderColor(Colors.Grey.Lighten1)
                    .Padding(8).Column(col =>
                    {
                        col.Item().AlignCenter().Text("CFDI — Comprobante Fiscal Digital")
                            .FontSize(8).Bold().FontColor(Colors.Blue.Darken2);

                        col.Item().PaddingTop(4).AlignCenter()
                            .Text($"{factura.Serie ?? ""}-{factura.Folio}")
                            .FontSize(16).Bold();

                        col.Item().PaddingTop(2).AlignCenter()
                            .Text($"Fecha: {factura.FechaEmision:dd/MM/yyyy HH:mm}")
                            .FontSize(8);

                        if (!string.IsNullOrEmpty(factura.Uuid))
                        {
                            col.Item().PaddingTop(2).AlignCenter()
                                .Text($"UUID: {factura.Uuid}")
                                .FontSize(7).FontColor(Colors.Grey.Darken1);
                        }

                        col.Item().PaddingTop(2).AlignCenter()
                            .Text($"Tipo: {GetTipoComprobanteLabel(factura.TipoComprobante)}")
                            .FontSize(8);
                    });
            });

            // Receptor section
            column.Item().PaddingTop(10).Background(Colors.Grey.Lighten4).Padding(8).Column(col =>
            {
                col.Item().Text("RECEPTOR").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);

                col.Item().PaddingTop(2).Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text($"{factura.ReceptorNombre}").FontSize(10).Bold();
                        c.Item().Text($"RFC: {factura.ReceptorRfc}").FontSize(9);
                    });

                    row.RelativeItem().Column(c =>
                    {
                        if (!string.IsNullOrEmpty(factura.ReceptorUsoCfdi))
                            c.Item().Text($"Uso CFDI: {factura.ReceptorUsoCfdi}").FontSize(8);
                        if (!string.IsNullOrEmpty(factura.ReceptorDomicilioFiscal))
                            c.Item().Text($"C.P.: {factura.ReceptorDomicilioFiscal}").FontSize(8);
                        if (!string.IsNullOrEmpty(factura.ReceptorRegimenFiscal))
                            c.Item().Text($"Régimen: {factura.ReceptorRegimenFiscal}").FontSize(8);
                    });
                });
            });

            // Metadata row
            column.Item().PaddingTop(6).Row(row =>
            {
                void AddMeta(string label, string? value)
                {
                    if (string.IsNullOrEmpty(value)) return;
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text(label).FontSize(7).FontColor(Colors.Grey.Darken1);
                        c.Item().Text(value).FontSize(8).Bold();
                    });
                }

                AddMeta("Método Pago", factura.MetodoPago);
                AddMeta("Forma Pago", factura.FormaPago);
                AddMeta("Moneda", factura.Moneda);
                if (factura.TipoCambio != 1)
                    AddMeta("Tipo Cambio", factura.TipoCambio.ToString("N4"));
            });

            column.Item().PaddingTop(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
        });
    }

    private void ComposeContent(IContainer container, Factura factura)
    {
        container.PaddingTop(6).Column(column =>
        {
            // Line items table
            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(25);   // #
                    columns.ConstantColumn(70);   // Clave ProdServ
                    columns.RelativeColumn(3);    // Descripción
                    columns.ConstantColumn(50);   // Unidad
                    columns.ConstantColumn(55);   // Cantidad
                    columns.ConstantColumn(70);   // Precio
                    columns.ConstantColumn(70);   // Importe
                    columns.ConstantColumn(60);   // Descuento
                });

                // Header
                table.Header(header =>
                {
                    var headerStyle = TextStyle.Default.FontSize(8).Bold().FontColor(Colors.White);

                    void HeaderCell(IContainer c, string text, bool alignRight = false)
                    {
                        var cell = c.Background(Colors.Blue.Darken2).Padding(4);
                        if (alignRight)
                            cell.AlignRight().Text(text).Style(headerStyle);
                        else
                            cell.Text(text).Style(headerStyle);
                    }

                    HeaderCell(header.Cell(), "#");
                    HeaderCell(header.Cell(), "Clave");
                    HeaderCell(header.Cell(), "Descripción");
                    HeaderCell(header.Cell(), "Unidad");
                    HeaderCell(header.Cell(), "Cantidad", true);
                    HeaderCell(header.Cell(), "Precio", true);
                    HeaderCell(header.Cell(), "Importe", true);
                    HeaderCell(header.Cell(), "Desc.", true);
                });

                // Rows
                var detalles = factura.Detalles?.OrderBy(d => d.NumeroLinea).ToList() ?? new();
                for (int i = 0; i < detalles.Count; i++)
                {
                    var d = detalles[i];
                    var bgColor = i % 2 == 0 ? Colors.White : Colors.Grey.Lighten4;
                    var cellStyle = TextStyle.Default.FontSize(8);

                    void DataCell(IContainer c, string text, bool alignRight = false)
                    {
                        var cell = c.Background(bgColor).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3);
                        if (alignRight)
                            cell.AlignRight().Text(text).Style(cellStyle);
                        else
                            cell.Text(text).Style(cellStyle);
                    }

                    DataCell(table.Cell(), (i + 1).ToString());
                    DataCell(table.Cell(), d.ClaveProdServ);
                    DataCell(table.Cell(), d.Descripcion);
                    DataCell(table.Cell(), d.Unidad ?? d.ClaveUnidad ?? "");
                    DataCell(table.Cell(), d.Cantidad.ToString("N2"), true);
                    DataCell(table.Cell(), $"${d.ValorUnitario:N2}", true);
                    DataCell(table.Cell(), $"${d.Importe:N2}", true);
                    DataCell(table.Cell(), d.Descuento > 0 ? $"${d.Descuento:N2}" : "", true);
                }
            });

            // Totals section
            column.Item().PaddingTop(10).Row(row =>
            {
                // Left: QR placeholder + notes
                row.RelativeItem(3).Column(col =>
                {
                    if (factura.Estado == "TIMBRADA" || !string.IsNullOrEmpty(factura.Uuid))
                    {
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten1)
                            .Width(100).Height(100).AlignCenter().AlignMiddle()
                            .Text("QR Code\nPendiente\nintegración PAC")
                            .FontSize(8).FontColor(Colors.Grey.Medium).Italic();
                    }

                    if (!string.IsNullOrEmpty(factura.Observaciones))
                    {
                        col.Item().PaddingTop(6).Text(text =>
                        {
                            text.Span("Observaciones: ").FontSize(8).Bold();
                            text.Span(factura.Observaciones).FontSize(8);
                        });
                    }
                });

                // Right: Totals
                row.RelativeItem(2).Column(col =>
                {
                    void TotalRow(string label, decimal value, bool bold = false, bool isTotal = false)
                    {
                        col.Item().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                            .Padding(3).Row(r =>
                            {
                                var style = TextStyle.Default.FontSize(bold ? 10 : 9);
                                if (bold) style = style.Bold();

                                r.RelativeItem().AlignRight().PaddingRight(8)
                                    .Text(label).Style(style);
                                r.ConstantItem(90).AlignRight()
                                    .Text($"${value:N2} {factura.Moneda}").Style(style);
                            });

                        if (isTotal)
                        {
                            col.Item().Background(Colors.Blue.Darken2).Padding(4).Row(r =>
                            {
                                var style = TextStyle.Default.FontSize(11).Bold().FontColor(Colors.White);
                                r.RelativeItem().AlignRight().PaddingRight(8)
                                    .Text("TOTAL").Style(style);
                                r.ConstantItem(90).AlignRight()
                                    .Text($"${value:N2}").Style(style);
                            });
                        }
                    }

                    TotalRow("Subtotal", factura.Subtotal);

                    if (factura.Descuento > 0)
                        TotalRow("Descuento", factura.Descuento);

                    if (factura.TotalImpuestosTrasladados > 0)
                        TotalRow("IVA Trasladado", factura.TotalImpuestosTrasladados);

                    if (factura.TotalImpuestosRetenidos > 0)
                        TotalRow("Retenciones", factura.TotalImpuestosRetenidos);

                    TotalRow("Total", factura.Total, bold: true, isTotal: true);
                });
            });

            // Fiscal stamp section (only for TIMBRADA)
            if (factura.Estado == "TIMBRADA" && !string.IsNullOrEmpty(factura.Uuid))
            {
                column.Item().PaddingTop(12).Border(1).BorderColor(Colors.Grey.Lighten1)
                    .Padding(8).Column(col =>
                    {
                        col.Item().Text("SELLO FISCAL DIGITAL").FontSize(8).Bold()
                            .FontColor(Colors.Blue.Darken2);

                        col.Item().PaddingTop(4).Text(text =>
                        {
                            text.Span("UUID: ").FontSize(7).Bold();
                            text.Span(factura.Uuid).FontSize(7);
                        });

                        if (factura.FechaTimbrado.HasValue)
                        {
                            col.Item().Text(text =>
                            {
                                text.Span("Fecha Timbrado: ").FontSize(7).Bold();
                                text.Span(factura.FechaTimbrado.Value.ToString("dd/MM/yyyy HH:mm:ss")).FontSize(7);
                            });
                        }

                        if (!string.IsNullOrEmpty(factura.CertificadoSat))
                        {
                            col.Item().Text(text =>
                            {
                                text.Span("No. Certificado SAT: ").FontSize(7).Bold();
                                text.Span(factura.CertificadoSat).FontSize(7);
                            });
                        }

                        if (!string.IsNullOrEmpty(factura.SelloCfdi))
                        {
                            col.Item().PaddingTop(2).Text(text =>
                            {
                                text.Span("Sello CFDI: ").FontSize(6).Bold();
                                text.Span(TruncateSeal(factura.SelloCfdi)).FontSize(6)
                                    .FontColor(Colors.Grey.Darken1);
                            });
                        }

                        if (!string.IsNullOrEmpty(factura.SelloSat))
                        {
                            col.Item().Text(text =>
                            {
                                text.Span("Sello SAT: ").FontSize(6).Bold();
                                text.Span(TruncateSeal(factura.SelloSat)).FontSize(6)
                                    .FontColor(Colors.Grey.Darken1);
                            });
                        }
                    });
            }
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);

            column.Item().PaddingTop(4).Text(
                "Este documento es una representación impresa de un CFDI. " +
                "Efectos fiscales al pago — Art. 29 y 29-A del Código Fiscal de la Federación.")
                .FontSize(6).FontColor(Colors.Grey.Darken1).Italic();

            column.Item().PaddingTop(2).AlignCenter()
                .Text(text =>
                {
                    text.Span("Generado por ").FontSize(6).FontColor(Colors.Grey.Medium);
                    text.Span("Handy Suites").FontSize(6).Bold().FontColor(Colors.Grey.Darken1);
                    text.Span(" — handysuites.com").FontSize(6).FontColor(Colors.Grey.Medium);
                });

            column.Item().PaddingTop(2).AlignRight()
                .Text(text =>
                {
                    text.Span("Página ").FontSize(7);
                    text.CurrentPageNumber().FontSize(7);
                    text.Span(" de ").FontSize(7);
                    text.TotalPages().FontSize(7);
                });
        });
    }

    private static string GetTipoComprobanteLabel(string tipo) => tipo switch
    {
        "I" => "Ingreso",
        "E" => "Egreso",
        "T" => "Traslado",
        "N" => "Nómina",
        "P" => "Pago",
        _ => tipo
    };

    private static string TruncateSeal(string seal)
    {
        if (seal.Length <= 80) return seal;
        return seal[..40] + "..." + seal[^40..];
    }
}
