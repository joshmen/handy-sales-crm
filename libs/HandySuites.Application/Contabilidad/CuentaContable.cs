namespace HandySuites.Application.Contabilidad;

/// <summary>Tipo de cuenta del catalogo contable.</summary>
public enum TipoCuenta
{
    Activo,
    Pasivo,
    Capital,
    Ingreso,
    Costo,
    Gasto
}

/// <summary>Naturaleza del saldo de la cuenta.</summary>
public enum NaturalezaCuenta
{
    Deudora,
    Acreedora
}

/// <summary>
/// Cuenta del catalogo contable. Definida en codigo (no en DB) — el CORE
/// contable es ON-DEMAND, no persiste polizas.
/// </summary>
public record CuentaContable(
    string Codigo,
    string Nombre,
    TipoCuenta Tipo,
    NaturalezaCuenta Naturaleza,
    string CodigoAgrupadorSat);

/// <summary>
/// Catalogo de cuentas DEFINIDO EN CODIGO (codigo agrupador SAT incluido).
/// Subconjunto minimo necesario para generar los asientos del CORE contable.
/// </summary>
public static class CatalogoCuentas
{
    public const string Bancos = "1110";
    public const string Clientes = "1120";
    public const string Inventario = "1130";
    public const string IvaAcreditable = "1180";
    public const string Proveedores = "2110";
    public const string IvaTrasladado = "2180";
    public const string ResultadoEjercicio = "3300";
    public const string Ventas = "4100";
    public const string CostoVentas = "5100";
    public const string GastosOperacion = "6100";

    public static readonly IReadOnlyList<CuentaContable> Cuentas = new List<CuentaContable>
    {
        new(Bancos,             "Bancos",                   TipoCuenta.Activo,  NaturalezaCuenta.Deudora,   "102.01"),
        new(Clientes,           "Clientes (CxC)",           TipoCuenta.Activo,  NaturalezaCuenta.Deudora,   "105.01"),
        new(Inventario,         "Inventario",               TipoCuenta.Activo,  NaturalezaCuenta.Deudora,   "115.01"),
        new(IvaAcreditable,     "IVA acreditable",          TipoCuenta.Activo,  NaturalezaCuenta.Deudora,   "118.01"),
        new(Proveedores,        "Proveedores (CxP)",        TipoCuenta.Pasivo,  NaturalezaCuenta.Acreedora, "201.01"),
        new(IvaTrasladado,      "IVA trasladado",           TipoCuenta.Pasivo,  NaturalezaCuenta.Acreedora, "208.01"),
        new(ResultadoEjercicio, "Resultado del ejercicio",  TipoCuenta.Capital, NaturalezaCuenta.Acreedora, "305.01"),
        new(Ventas,             "Ventas",                   TipoCuenta.Ingreso, NaturalezaCuenta.Acreedora, "401.01"),
        new(CostoVentas,        "Costo de ventas",          TipoCuenta.Costo,   NaturalezaCuenta.Deudora,   "501.01"),
        new(GastosOperacion,    "Gastos de operacion",      TipoCuenta.Gasto,   NaturalezaCuenta.Deudora,   "601.84"),
    };

    private static readonly Dictionary<string, CuentaContable> _porCodigo =
        Cuentas.ToDictionary(c => c.Codigo);

    public static CuentaContable Get(string codigo) => _porCodigo[codigo];

    public static string Nombre(string codigo) =>
        _porCodigo.TryGetValue(codigo, out var c) ? c.Nombre : codigo;

    public static NaturalezaCuenta Naturaleza(string codigo) =>
        _porCodigo.TryGetValue(codigo, out var c) ? c.Naturaleza : NaturalezaCuenta.Deudora;
}
