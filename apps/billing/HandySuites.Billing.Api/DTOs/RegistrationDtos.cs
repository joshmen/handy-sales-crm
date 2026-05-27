namespace HandySuites.Billing.Api.DTOs;

/// <summary>
/// DTOs para el Finkok Registration Web Service.
/// Wraps SOAP operations: add, edit, get, assign (no implementamos customers/switch en este PR).
/// WSDL: https://demo-facturacion.finkok.com/servicios/soap/registration.wsdl
///
/// Audit BILL-1 (2026-05-26): cierra el gap por el cual HandySales nunca registraba
/// los RFC de tenants como emisores en Finkok, causando que el timbrado fallara.
/// </summary>

/// <param name="Rfc">RFC del emisor (tenant) a registrar bajo nuestra cuenta partner</param>
/// <param name="CerBytes">Bytes del archivo .cer (certificado público X.509)</param>
/// <param name="KeyBytes">Bytes del archivo .key (llave privada encriptada PKCS#8)</param>
/// <param name="Passphrase">Password que protege la llave privada</param>
/// <param name="TypeUser">Modelo cobro: 'P'=prepago (asignar créditos via assign), 'O'=ilimitado</param>
public record RegisterEmitterRequest(
    string Rfc,
    byte[] CerBytes,
    byte[] KeyBytes,
    string Passphrase,
    char TypeUser
);

public record RegisterEmitterResult
{
    public bool Success { get; init; }

    /// <summary>True si Finkok respondió que el RFC ya está registrado bajo nuestra cuenta. Usar UpdateEmitterAsync para actualizar CSD.</summary>
    public bool AlreadyExists { get; init; }

    /// <summary>Mensaje devuelto por Finkok (en caso de éxito incluye confirmación, en error incluye razón).</summary>
    public string? Message { get; init; }

    /// <summary>Código error técnico para logs (no mostrar a user final).</summary>
    public string? ErrorCode { get; init; }
}

/// <summary>
/// Update emisor existente. Puede usarse para:
/// 1. Cambiar status (active/suspended/frozen) sin tocar CSD → pasar nulls en Cer/Key/Passphrase
/// 2. Actualizar CSD por renovación (cada 4 años) → pasar nuevos bytes + passphrase
/// </summary>
public record UpdateEmitterRequest(
    string Rfc,
    string Status,                  // "active" | "suspended" | "frozen"
    byte[]? CerBytes,
    byte[]? KeyBytes,
    string? Passphrase
);

public record EmitterInfoResult
{
    public bool Success { get; init; }

    /// <summary>"active" | "suspended" | "frozen" según Finkok. Null si no se pudo obtener.</summary>
    public string? Status { get; init; }

    /// <summary>Créditos prepago restantes. Null si TypeUser=O (ilimitado) o no aplica.</summary>
    public int? CreditsRemaining { get; init; }

    /// <summary>Timbres consumidos en el mes en curso.</summary>
    public int? CreditsConsumedMonth { get; init; }

    /// <summary>'P' = prepago, 'O' = ilimitado.</summary>
    public char? TypeUser { get; init; }

    public string? Message { get; init; }
}

public record AssignCreditsResult
{
    public bool Success { get; init; }

    /// <summary>Total de créditos del emisor DESPUÉS de la asignación.</summary>
    public int? CreditsTotal { get; init; }

    public string? Message { get; init; }
}

/// <summary>
/// Resultado de listar todos los emisores bajo la cuenta partner (operación `customers`).
/// Finkok pagina los resultados — caller puede iterar pasando `page` incremental.
/// </summary>
public record EmittersListResult
{
    public bool Success { get; init; }
    public IReadOnlyList<EmitterSummary> Items { get; init; } = Array.Empty<EmitterSummary>();
    public string? Message { get; init; }
}

/// <summary>Resumen de un emisor — versión liviana para listados.</summary>
public record EmitterSummary(
    string Rfc,
    string? RazonSocial,
    string? Status,
    char? TypeUser,
    int? CreditsRemaining,
    DateTime? RegisteredAt);
