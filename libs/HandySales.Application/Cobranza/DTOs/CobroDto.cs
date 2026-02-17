namespace HandySales.Application.Cobranza.DTOs;

public class CobroDto
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public string NumeroPedido { get; set; } = null!;
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
    int PedidoId,
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
    public List<EstadoCuentaPedidoDto> Pedidos { get; set; } = new();
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
