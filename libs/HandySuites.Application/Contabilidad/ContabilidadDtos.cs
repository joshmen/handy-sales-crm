namespace HandySuites.Application.Contabilidad;

// ─────────────────────────────────────────────────────────────────────────────
// Asientos (partida doble) — estructura interna que alimenta todos los reportes.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Una linea de un asiento contable. Exactamente uno de Debe/Haber &gt; 0.</summary>
public record LineaAsiento(string Cuenta, decimal Debe, decimal Haber);

/// <summary>
/// Un asiento contable balanceado (sum(Debe) == sum(Haber)). Generado on-demand
/// a partir de una operacion real (pedido, cobro o gasto).
/// </summary>
public record Asiento(string Concepto, DateTime Fecha, IReadOnlyList<LineaAsiento> Lineas)
{
    public decimal TotalDebe => Lineas.Sum(l => l.Debe);
    public decimal TotalHaber => Lineas.Sum(l => l.Haber);
    public bool Cuadra => Math.Round(TotalDebe, 2) == Math.Round(TotalHaber, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Balanza de comprobacion
// ─────────────────────────────────────────────────────────────────────────────

public record BalanzaFila(string Codigo, string Nombre, decimal Debe, decimal Haber);

public record BalanzaResult(
    IReadOnlyList<BalanzaFila> Filas,
    decimal TotalDebe,
    decimal TotalHaber,
    bool Cuadrada);

// ─────────────────────────────────────────────────────────────────────────────
// Estado de Resultados
// ─────────────────────────────────────────────────────────────────────────────

public record GastoCategoriaFila(string Categoria, decimal Monto);

public record EstadoResultadosResult(
    decimal VentasNetas,
    decimal CostoVentas,
    decimal UtilidadBruta,
    IReadOnlyList<GastoCategoriaFila> Gastos,
    decimal TotalGastos,
    decimal UtilidadOperacion,
    decimal UtilidadNeta,
    VerticalResult Vertical);

/// <summary>Analisis vertical (% sobre ventas netas).</summary>
public record VerticalResult(
    double CostoVentas,
    double UtilidadBruta,
    double Gastos,
    double UtilidadOperacion,
    double UtilidadNeta);

// ─────────────────────────────────────────────────────────────────────────────
// Balance General
// ─────────────────────────────────────────────────────────────────────────────

public record BalanceCuentaFila(string Cuenta, string Nombre, decimal Monto);

public record BalanceGeneralResult(
    IReadOnlyList<BalanceCuentaFila> Activo,
    decimal TotalActivo,
    IReadOnlyList<BalanceCuentaFila> Pasivo,
    decimal TotalPasivo,
    IReadOnlyList<BalanceCuentaFila> Capital,
    decimal TotalCapital,
    decimal TotalPasivoCapital,
    bool Cuadrado);

// ─────────────────────────────────────────────────────────────────────────────
// Reporte IVA
// ─────────────────────────────────────────────────────────────────────────────

public record ReporteIvaResult(
    decimal Trasladado,
    decimal Acreditable,
    decimal Saldo,
    bool ACargo,
    decimal VentasGravadas,
    decimal ComprasGravadas);

// ─────────────────────────────────────────────────────────────────────────────
// DIOT
// ─────────────────────────────────────────────────────────────────────────────

public record DiotProveedorFila(
    string Rfc,
    string Nombre,
    string TipoTercero,
    decimal Base,
    decimal IvaPagado);

public record DiotResult(
    IReadOnlyList<DiotProveedorFila> Proveedores,
    decimal TotalBase,
    decimal TotalIva);
