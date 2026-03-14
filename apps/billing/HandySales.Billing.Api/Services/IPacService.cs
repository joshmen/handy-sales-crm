using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Services;

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

    /// <summary>
    /// Checks the current status of an invoice with the SAT.
    /// </summary>
    Task<ConsultaResult> ConsultarEstatusAsync(string uuid, string rfcEmisor, ConfiguracionFiscal config);
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
