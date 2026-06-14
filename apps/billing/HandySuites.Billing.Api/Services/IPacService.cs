using HandySuites.Billing.Api.Models;

namespace HandySuites.Billing.Api.Services;

public interface IPacService
{
    /// <summary>
    /// Sends a pre-signed XML to the PAC for timbrado (stamping).
    /// Returns the timbrado result with UUID, SelloSAT, and timbrado XML.
    /// </summary>
    Task<TimbradoResult> TimbrarAsync(string xmlPreFirmado, ConfiguracionFiscal config);

    /// <summary>
    /// Cancels a previously timbrado invoice.
    /// Motivo: "01"=Con relación, "02"=Sin relación, "03"=No se llevó a cabo, "04"=Operación nominativa
    /// </summary>
    Task<CancelacionResult> CancelarAsync(string uuid, string rfcEmisor, string motivo,
        string? folioSustitucion, ConfiguracionFiscal config);

    // ─── Timbrado: resiliencia (Fase B) ───

    /// <summary>
    /// `stamped`: recupera el resultado de un CFDI previamente timbrado enviando el MISMO
    /// XML pre-firmado. El sello RSA es determinista, así que reconstruir el XML produce un
    /// documento byte-idéntico al original. Sirve para recuperar el UUID cuando `stamp` falló
    /// por red/timeout pero Finkok sí timbró (evita timbrados huérfanos y dobles).
    /// </summary>
    Task<TimbradoResult> StampedAsync(string xmlPreFirmado, ConfiguracionFiscal config);

    /// <summary>
    /// `quick_stamp`: timbrado de mayor throughput (omite la verificación previa de duplicado).
    /// Mismo contrato de respuesta que `stamp`.
    /// </summary>
    Task<TimbradoResult> QuickStampAsync(string xmlPreFirmado, ConfiguracionFiscal config);

    // ─── Utilerías (Fase C) ───

    /// <summary>
    /// `get_xml`: recupera el XML timbrado desde Finkok por UUID. Fallback cuando el XML
    /// local/blob se perdió. invoiceType "I" = emitidas (el tenant es emisor).
    /// </summary>
    Task<GetXmlResult> GetXmlFromFinkokAsync(string uuid, string rfcEmisor, ConfiguracionFiscal config);

    /// <summary>
    /// Checks the current status of an invoice with the SAT.
    /// </summary>
    Task<ConsultaResult> ConsultarEstatusAsync(string uuid, string rfcEmisor, ConfiguracionFiscal config);

    /// <summary>
    /// Gets the full SAT status of an invoice (cancelado, cancelable, en proceso, etc.)
    /// Used to determine if cancellation is possible before sending the request.
    /// </summary>
    Task<SatStatusResult> GetSatStatusAsync(string uuid, string rfcEmisor, string rfcReceptor, decimal total, ConfiguracionFiscal config);

    // ─── Cancelación bilateral (Fase A) — el tenant como RECEPTOR ───

    /// <summary>
    /// `get_pending`: lista los UUID de CFDI donde este RFC es RECEPTOR y tiene una
    /// solicitud de cancelación pendiente de aceptar/rechazar (plazo SAT 72h).
    /// </summary>
    Task<PendingCancellationsResult> GetPendingCancellationsAsync(string rfcReceptor, ConfiguracionFiscal config);

    /// <summary>
    /// `accept_reject`: el receptor acepta o rechaza una solicitud de cancelación.
    /// Requiere los bytes del CSD (cer/key) del receptor para firmar la respuesta.
    /// </summary>
    Task<AcceptRejectResult> AcceptRejectCancellationAsync(string uuid, bool aceptar, string rfcReceptor,
        byte[] cerBytes, byte[] keyBytes, ConfiguracionFiscal config);

    /// <summary>
    /// `get_receipt`: obtiene el acuse asociado a un UUID. type: "C"=cancelación.
    /// </summary>
    Task<ReceiptResult> GetReceiptAsync(string uuid, string rfcEmisor, string type, ConfiguracionFiscal config);

    /// <summary>
    /// `get_related`: obtiene los UUID relacionados (padres/hijos por sustitución) de un UUID.
    /// Requiere los bytes del CSD (cer/key) del emisor.
    /// </summary>
    Task<RelatedResult> GetRelatedAsync(string uuid, string rfcEmisor, string rfcReceptor,
        byte[] cerBytes, byte[] keyBytes, ConfiguracionFiscal config);
}

public class GetXmlResult
{
    public bool Success { get; set; }
    public string? Xml { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PendingCancellationsResult
{
    public bool Success { get; set; }
    public List<string> Uuids { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public class AcceptRejectResult
{
    public bool Success { get; set; }
    public string? Estatus { get; set; }    // resultado de la operación (códigos Finkok)
    public string? AcuseXml { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ReceiptResult
{
    public bool Success { get; set; }
    public string? Receipt { get; set; }    // acuse (XML o base64 según type)
    public string? ErrorMessage { get; set; }
}

public class RelatedResult
{
    public bool Success { get; set; }
    public List<string> Relacionados { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public class SatStatusResult
{
    public bool Success { get; set; }
    public string? CodigoEstatus { get; set; } // "S - Comprobante obtenido satisfactoriamente"
    public string? Estado { get; set; }         // "Vigente", "Cancelado", "No Encontrado"
    public string? EsCancelable { get; set; }   // "Cancelable sin aceptación", "Cancelable con aceptación", "No cancelable"
    public string? EstatusCancelacion { get; set; } // "En proceso", "Cancelado", "Plazo vencido"
    public string? ErrorMessage { get; set; }
}

public class TimbradoResult
{
    public bool Success { get; set; }
    public string? Uuid { get; set; }
    public string? XmlTimbrado { get; set; }
    public string? SelloSat { get; set; }
    public string? CadenaOriginalSat { get; set; }
    public string? NoCertificadoSat { get; set; }
    public DateTime? FechaTimbrado { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
}

public class CancelacionResult
{
    public bool Success { get; set; }
    public string? EstadoCancelacion { get; set; } // CANCELADA, EN_PROCESO, RECHAZADA
    public string? AcuseXml { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ConsultaResult
{
    public bool Success { get; set; }
    public string? Estado { get; set; } // Vigente, Cancelado, No Encontrado
    public string? EsCancelable { get; set; }
    public string? EstatusCancelacion { get; set; }
    public string? ErrorMessage { get; set; }
}
