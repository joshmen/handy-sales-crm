namespace HandySales.Application.Ai.Interfaces;

public interface IAiDataContextBuilder
{
    Task<DataContextResult> BuildContextAsync(string prompt, string tipoAccion, int tenantId, int userId);
}

public record DataContextResult(
    string ContextMarkdown,
    List<string> CategoriesUsed,
    int EstimatedTokens
);

[Flags]
public enum DataCategory
{
    None       = 0,
    Ventas     = 1 << 0,
    Clientes   = 1 << 1,
    Productos  = 1 << 2,
    Cobros     = 1 << 3,
    Visitas    = 1 << 4,
    Inventario = 1 << 5,
    Vendedores = 1 << 6,
    Metas      = 1 << 7,
}
