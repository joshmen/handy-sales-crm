using FluentValidation;
using HandySales.Application.Inventario.DTOs;

public class InventarioCreateDtoValidator : AbstractValidator<InventarioCreateDto>
{
    public InventarioCreateDtoValidator()
    {
        RuleFor(x => x.ProductoId)
                .GreaterThan(0).WithMessage("El producto es obligatorio.");

        RuleFor(x => x.CantidadActual)
            .GreaterThanOrEqualTo(0).WithMessage("Cantidad actual no puede ser negativa.");

        RuleFor(x => x.StockMinimo)
            .GreaterThanOrEqualTo(0).WithMessage("Stock mínimo no puede ser negativo.");

        RuleFor(x => x.StockMaximo)
            .GreaterThanOrEqualTo(x => x.StockMinimo)
            .WithMessage("Stock máximo debe ser mayor o igual al mínimo.");
    }
}
