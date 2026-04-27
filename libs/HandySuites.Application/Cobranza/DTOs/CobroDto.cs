namespace HandySuites.Application.Cobranza.DTOs;

public class CobroDto
{
    public int Id { get; set; }
    public int? PedidoId { get; set; }
    public string? NumeroPedido { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNombre { get; set; } = null!;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = null!;
    public decimal Monto { get; set; }
    public int MetodoPago { get; set; }
    public string MetodoPagoNombre { get; set; } = null!;
    public DateTime FechaCobro { get; set; }
    public string? Referencia { get; set; }
    public string? Notas { get; set; }
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
}

public record CobroCreateDto(
    int? PedidoId,
    int ClienteId,
    decimal Monto,
    int MetodoPago,
    DateTime? FechaCobro,
    string? Referencia,
    string? Notas
);

public record CobroUpdateDto(
    decimal Monto,
    int MetodoPago,
    DateTime? FechaCobro,
    string? Referencia,
    string? Notas
);

public class SaldoClienteDto
{
    public int ClienteId { get; set; }
    public string ClienteNombre { get; set; } = null!;
    public decimal TotalFacturado { get; set; }
    public decimal TotalCobrado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public int PedidosPendientes { get; set; }
}

public class ResumenCarteraDto
{
    public decimal TotalFacturado { get; set; }
    public decimal TotalCobrado { get; set; }
    public decimal TotalPendiente { get; set; }
    public int ClientesConSaldo { get; set; }
}

public class EstadoCuentaDto
{
    public int ClienteId { get; set; }
    public string ClienteNombre { get; set; } = null!;
    public decimal TotalFacturado { get; set; }
    public decimal TotalCobrado { get; set; }
    public decimal SaldoPendiente { get; set; }

    /// <summary>Estructura jerárquica usada por la web (admin dashboard).</summary>
    public List<EstadoCuentaPedidoDto> Pedidos { get; set; } = new();

    /// <summary>
    /// Lista plana de movimientos (facturas + cobros) en orden cronológico con saldo running.
    /// La consume el mobile app (pantalla estado-cuenta). Se computa a partir de Pedidos+Cobros
    /// en el repository — no se persiste como entidad propia. Antes mobile recibía el response
    /// sin este campo y Zod fallaba con "expected array, received undefined".
    /// </summary>
    public List<EstadoCuentaMovimientoDto> Movimientos { get; set; } = new();
}

public class EstadoCuentaMovimientoDto
{
    /// <summary>
    /// Id sintético único en la lista. Para "factura" = pedidoId (rango natural &lt; 1M).
    /// Para "cobro" = 1_000_000 + cobroId. Esto evita colisión en el FlatList.keyExtractor
    /// del mobile cuando un pedido y un cobro coinciden numéricamente.
    /// </summary>
    public int Id { get; set; }

    /// <summary>"factura" o "cobro" — define el ícono y signo en la UI mobile.</summary>
    public string Tipo { get; set; } = null!;

    public DateTime Fecha { get; set; }
    public string Concepto { get; set; } = null!;
    public decimal Monto { get; set; }

    /// <summary>Saldo cumulativo después de este movimiento (running balance).</summary>
    public decimal Saldo { get; set; }
}

public class EstadoCuentaPedidoDto
{
    public int PedidoId { get; set; }
    public string NumeroPedido { get; set; } = null!;
    public DateTime FechaPedido { get; set; }
    public decimal Total { get; set; }
    public decimal Cobrado { get; set; }
    public decimal Saldo { get; set; }
    public List<CobroResumenDto> Cobros { get; set; } = new();
}

public class CobroResumenDto
{
    public int Id { get; set; }
    public decimal Monto { get; set; }
    public int MetodoPago { get; set; }
    public string MetodoPagoNombre { get; set; } = null!;
    public DateTime FechaCobro { get; set; }
    public string? Referencia { get; set; }
}
