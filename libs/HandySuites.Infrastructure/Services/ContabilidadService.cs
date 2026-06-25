using HandySuites.Application.Contabilidad;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Services;

/// <summary>
/// Implementacion del CORE contable ON-DEMAND. Lee operaciones reales del tenant
/// (pedidos no cancelados, cobros, gastos contables) en un rango y construye los
/// asientos de partida doble. A partir de los asientos deriva todos los reportes.
///
/// Reglas de asiento (cada uno cuadra debe == haber por construccion):
///  - Pedido: DEBE 1120 = Total ; HABER 4100 = Subtotal ; HABER 2180 = Impuesto.
///            (+ si costo &gt; 0) DEBE 5100 = Costo ; HABER 1130 = Costo.
///  - Cobro:  DEBE 1110 = Monto ; HABER 1120 = Monto.
///  - Gasto:  DEBE 6100 = Base ; DEBE 1180 = Iva ; HABER 1110 = Base + Iva.
/// </summary>
public class ContabilidadService : IContabilidadService
{
    private readonly HandySuitesDbContext _db;

    public ContabilidadService(HandySuitesDbContext db) => _db = db;

    private static decimal R(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    public async Task<IReadOnlyList<Asiento>> GenerarAsientosAsync(int tenantId, DateTime desde, DateTime hasta)
    {
        var asientos = new List<Asiento>();

        // ── Pedidos NO cancelados en rango ───────────────────────────────────
        var pedidos = await _db.Pedidos
            .IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId
                && p.EliminadoEn == null
                && p.FechaPedido >= desde
                && p.FechaPedido <= hasta
                && p.Estado != EstadoPedido.Cancelado)
            .Select(p => new { p.Id, p.FechaPedido })
            .ToListAsync();

        if (pedidos.Count > 0)
        {
            var pedidoIds = pedidos.Select(p => p.Id).ToList();
            var fechaPorPedido = pedidos.ToDictionary(p => p.Id, p => p.FechaPedido);

            // Detalles de esos pedidos: subtotal (S), impuesto (V) y costo (C).
            var detalles = await _db.DetallePedidos
                .IgnoreQueryFilters()
                .Where(d => d.EliminadoEn == null && pedidoIds.Contains(d.PedidoId))
                .Select(d => new
                {
                    d.PedidoId,
                    d.Subtotal,
                    d.Impuesto,
                    Costo = d.CostoUnitario * d.Cantidad
                })
                .ToListAsync();

            var porPedido = detalles
                .GroupBy(d => d.PedidoId)
                .Select(g => new
                {
                    PedidoId = g.Key,
                    S = g.Sum(x => x.Subtotal),
                    V = g.Sum(x => x.Impuesto),
                    C = g.Sum(x => x.Costo)
                });

            foreach (var p in porPedido)
            {
                var s = R(p.S);
                var v = R(p.V);
                var t = s + v; // s y v ya redondeados → t exacto, asiento cuadra al centavo
                var fecha = fechaPorPedido.GetValueOrDefault(p.PedidoId);

                // Asiento de venta: DEBE 1120 = T ; HABER 4100 = S ; HABER 2180 = V.
                asientos.Add(new Asiento(
                    $"Venta pedido #{p.PedidoId}",
                    fecha,
                    new List<LineaAsiento>
                    {
                        new(CatalogoCuentas.Clientes,      t, 0m),
                        new(CatalogoCuentas.Ventas,        0m, s),
                        new(CatalogoCuentas.IvaTrasladado, 0m, v),
                    }));

                // Asiento de costo (solo si C > 0): DEBE 5100 = C ; HABER 1130 = C.
                var c = R(p.C);
                if (c > 0m)
                {
                    asientos.Add(new Asiento(
                        $"Costo de ventas pedido #{p.PedidoId}",
                        fecha,
                        new List<LineaAsiento>
                        {
                            new(CatalogoCuentas.CostoVentas, c, 0m),
                            new(CatalogoCuentas.Inventario,  0m, c),
                        }));
                }
            }
        }

        // ── Cobros en rango ──────────────────────────────────────────────────
        var cobros = await _db.Cobros
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId
                && c.EliminadoEn == null
                && c.FechaCobro >= desde
                && c.FechaCobro <= hasta)
            .Select(c => new { c.Id, c.Monto, c.FechaCobro })
            .ToListAsync();

        foreach (var c in cobros)
        {
            var m = R(c.Monto);
            // DEBE 1110 Bancos = M ; HABER 1120 Clientes = M.
            asientos.Add(new Asiento(
                $"Cobro #{c.Id}",
                c.FechaCobro,
                new List<LineaAsiento>
                {
                    new(CatalogoCuentas.Bancos,   m, 0m),
                    new(CatalogoCuentas.Clientes, 0m, m),
                }));
        }

        // ── Gastos contables en rango ────────────────────────────────────────
        var gastos = await _db.GastosContables
            .IgnoreQueryFilters()
            .Where(g => g.TenantId == tenantId
                && g.EliminadoEn == null
                && g.Fecha >= desde
                && g.Fecha <= hasta)
            .Select(g => new { g.Id, g.Base, g.Iva, g.Fecha })
            .ToListAsync();

        foreach (var g in gastos)
        {
            var b = R(g.Base);
            var i = R(g.Iva);
            var tot = b + i; // b e i ya redondeados → tot exacto, asiento cuadra al centavo
            // DEBE 6100 Gastos = B ; DEBE 1180 IVA acreditable = I ; HABER 1110 Bancos = B + I.
            asientos.Add(new Asiento(
                $"Gasto #{g.Id}",
                g.Fecha,
                new List<LineaAsiento>
                {
                    new(CatalogoCuentas.GastosOperacion, b, 0m),
                    new(CatalogoCuentas.IvaAcreditable,  i, 0m),
                    new(CatalogoCuentas.Bancos,          0m, tot),
                }));
        }

        return asientos;
    }

    // ── Helpers de agregacion ────────────────────────────────────────────────

    /// <summary>Suma Debe y Haber por cuenta a partir de un conjunto de asientos.</summary>
    private static Dictionary<string, (decimal Debe, decimal Haber)> AgruparPorCuenta(IEnumerable<Asiento> asientos)
    {
        var acc = new Dictionary<string, (decimal Debe, decimal Haber)>();
        foreach (var a in asientos)
            foreach (var l in a.Lineas)
            {
                acc.TryGetValue(l.Cuenta, out var prev);
                acc[l.Cuenta] = (prev.Debe + l.Debe, prev.Haber + l.Haber);
            }
        return acc;
    }

    /// <summary>Saldo segun naturaleza: Deudora = debe - haber ; Acreedora = haber - debe.</summary>
    private static decimal Saldo(string cuenta, decimal debe, decimal haber) =>
        CatalogoCuentas.Naturaleza(cuenta) == NaturalezaCuenta.Deudora
            ? R(debe - haber)
            : R(haber - debe);

    private async Task<Dictionary<string, (decimal Debe, decimal Haber)>> SaldosRangoAsync(
        int tenantId, DateTime desde, DateTime hasta)
    {
        var asientos = await GenerarAsientosAsync(tenantId, desde, hasta);
        return AgruparPorCuenta(asientos);
    }

    // ── Balanza de comprobacion ──────────────────────────────────────────────

    public async Task<BalanzaResult> GenerarBalanzaAsync(int tenantId, DateTime desde, DateTime hasta)
    {
        var porCuenta = await SaldosRangoAsync(tenantId, desde, hasta);

        // Mantener el orden del catalogo; solo cuentas con movimiento.
        var filas = CatalogoCuentas.Cuentas
            .Where(c => porCuenta.ContainsKey(c.Codigo))
            .Select(c =>
            {
                var (debe, haber) = porCuenta[c.Codigo];
                return new BalanzaFila(c.Codigo, c.Nombre, R(debe), R(haber));
            })
            .ToList();

        var totalDebe = R(filas.Sum(f => f.Debe));
        var totalHaber = R(filas.Sum(f => f.Haber));

        return new BalanzaResult(filas, totalDebe, totalHaber, totalDebe == totalHaber);
    }

    // ── Estado de Resultados ─────────────────────────────────────────────────

    public async Task<EstadoResultadosResult> GenerarEstadoResultadosAsync(int tenantId, DateTime desde, DateTime hasta)
    {
        var porCuenta = await SaldosRangoAsync(tenantId, desde, hasta);

        decimal SaldoDe(string cuenta)
        {
            if (!porCuenta.TryGetValue(cuenta, out var v)) return 0m;
            return Saldo(cuenta, v.Debe, v.Haber);
        }

        var ventasNetas = SaldoDe(CatalogoCuentas.Ventas);         // acreedor
        var costoVentas = SaldoDe(CatalogoCuentas.CostoVentas);    // deudor
        var utilidadBruta = R(ventasNetas - costoVentas);

        // Desglose de gastos por categoria (desde GastoContable en rango).
        var gastosPorCategoria = await _db.GastosContables
            .IgnoreQueryFilters()
            .Where(g => g.TenantId == tenantId
                && g.EliminadoEn == null
                && g.Fecha >= desde
                && g.Fecha <= hasta)
            .GroupBy(g => g.Categoria)
            .Select(g => new { Categoria = g.Key, Monto = g.Sum(x => x.Base) })
            .ToListAsync();

        var gastos = gastosPorCategoria
            .Select(g => new GastoCategoriaFila(g.Categoria, R(g.Monto)))
            .OrderByDescending(g => g.Monto)
            .ToList();

        var totalGastos = SaldoDe(CatalogoCuentas.GastosOperacion); // = sum(Base) por construccion
        var utilidadOperacion = R(utilidadBruta - totalGastos);
        var utilidadNeta = utilidadOperacion; // sin ISR por ahora

        double Pct(decimal v) => ventasNetas != 0m ? Math.Round((double)(v / ventasNetas * 100m), 1) : 0d;

        var vertical = new VerticalResult(
            CostoVentas: Pct(costoVentas),
            UtilidadBruta: Pct(utilidadBruta),
            Gastos: Pct(totalGastos),
            UtilidadOperacion: Pct(utilidadOperacion),
            UtilidadNeta: Pct(utilidadNeta));

        return new EstadoResultadosResult(
            ventasNetas, costoVentas, utilidadBruta,
            gastos, R(totalGastos), utilidadOperacion, utilidadNeta, vertical);
    }

    // ── Balance General ──────────────────────────────────────────────────────

    public async Task<BalanceGeneralResult> GenerarBalanceGeneralAsync(int tenantId, DateTime hasta)
    {
        // desde = inicio de tiempo (acumulado historico hasta el corte). Usamos un
        // piso muy atras (no DateTime.MinValue, que con Kind=Unspecified puede dar
        // problemas de comparacion) — cubre cualquier dato real del tenant.
        var desde = new DateTime(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var porCuenta = await SaldosRangoAsync(tenantId, desde, hasta);

        decimal SaldoDe(string cuenta)
        {
            if (!porCuenta.TryGetValue(cuenta, out var v)) return 0m;
            return Saldo(cuenta, v.Debe, v.Haber);
        }

        BalanceCuentaFila Fila(string cuenta) =>
            new(cuenta, CatalogoCuentas.Nombre(cuenta), SaldoDe(cuenta));

        var activoCodigos = new[] { CatalogoCuentas.Bancos, CatalogoCuentas.Clientes, CatalogoCuentas.Inventario, CatalogoCuentas.IvaAcreditable };
        var pasivoCodigos = new[] { CatalogoCuentas.Proveedores, CatalogoCuentas.IvaTrasladado };

        var activo = activoCodigos.Select(Fila).ToList();
        var pasivo = pasivoCodigos.Select(Fila).ToList();

        // Capital: 3300 Resultado del ejercicio = utilidad neta del periodo (acumulada al corte).
        var ventasNetas = SaldoDe(CatalogoCuentas.Ventas);
        var costoVentas = SaldoDe(CatalogoCuentas.CostoVentas);
        var gastos = SaldoDe(CatalogoCuentas.GastosOperacion);
        var utilidadNeta = R(ventasNetas - costoVentas - gastos);

        var capital = new List<BalanceCuentaFila>
        {
            new(CatalogoCuentas.ResultadoEjercicio, CatalogoCuentas.Nombre(CatalogoCuentas.ResultadoEjercicio), utilidadNeta)
        };

        var totalActivo = R(activo.Sum(a => a.Monto));
        var totalPasivo = R(pasivo.Sum(p => p.Monto));
        var totalCapital = R(capital.Sum(c => c.Monto));
        var totalPasivoCapital = R(totalPasivo + totalCapital);

        return new BalanceGeneralResult(
            activo, totalActivo,
            pasivo, totalPasivo,
            capital, totalCapital,
            totalPasivoCapital,
            totalActivo == totalPasivoCapital);
    }

    // ── Reporte IVA ──────────────────────────────────────────────────────────

    public async Task<ReporteIvaResult> GenerarReporteIvaAsync(int tenantId, DateTime desde, DateTime hasta)
    {
        var porCuenta = await SaldosRangoAsync(tenantId, desde, hasta);

        decimal SaldoDe(string cuenta)
        {
            if (!porCuenta.TryGetValue(cuenta, out var v)) return 0m;
            return Saldo(cuenta, v.Debe, v.Haber);
        }

        var trasladado = SaldoDe(CatalogoCuentas.IvaTrasladado);  // acreedor
        var acreditable = SaldoDe(CatalogoCuentas.IvaAcreditable); // deudor
        var saldo = R(trasladado - acreditable);

        var ventasGravadas = SaldoDe(CatalogoCuentas.Ventas);
        var comprasGravadas = SaldoDe(CatalogoCuentas.GastosOperacion);

        return new ReporteIvaResult(
            R(trasladado), R(acreditable), saldo, saldo > 0m,
            R(ventasGravadas), R(comprasGravadas));
    }

    // ── DIOT ─────────────────────────────────────────────────────────────────

    public async Task<DiotResult> GenerarDiotAsync(int tenantId, DateTime desde, DateTime hasta)
    {
        const string RfcExtranjero = "XEXX010101000";

        var gastos = await _db.GastosContables
            .IgnoreQueryFilters()
            .Where(g => g.TenantId == tenantId
                && g.EliminadoEn == null
                && g.Fecha >= desde
                && g.Fecha <= hasta)
            .Select(g => new { g.ProveedorRfc, g.ProveedorNombre, g.Base, g.Iva })
            .ToListAsync();

        var proveedores = gastos
            .GroupBy(g => new { Rfc = g.ProveedorRfc ?? "", Nombre = g.ProveedorNombre ?? "" })
            .Select(g =>
            {
                var rfc = g.Key.Rfc;
                var tipoTercero = rfc == RfcExtranjero ? "05 Extranjero" : "04 Proveedor nacional";
                return new DiotProveedorFila(
                    rfc,
                    g.Key.Nombre,
                    tipoTercero,
                    R(g.Sum(x => x.Base)),
                    R(g.Sum(x => x.Iva)));
            })
            .OrderByDescending(p => p.Base)
            .ToList();

        return new DiotResult(
            proveedores,
            R(proveedores.Sum(p => p.Base)),
            R(proveedores.Sum(p => p.IvaPagado)));
    }
}
