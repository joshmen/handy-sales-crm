using FluentValidation;
using HandySales.Application.Inventario.DTOs;

public class InventarioUpdateDtoValidator : AbstractValidator<InventarioUpdateDto>
{
    public InventarioUpdateDtoValidator()
    {
        RuleFor(x => x.CantidadActual)
            .GreaterThanOrEqualTo(0).WithMessage("Cantidad actual no puede ser negativa.");

        RuleFor(x => x.StockMinimo)
            .GreaterThanOrEqualTo(0).WithMessage("Stock mínimo no puede ser negativo.");

        RuleFor(x => x.StockMaximo)
            .GreaterThanOrEqualTo(x => x.StockMinimo)
            .WithMessage("Stock máximo debe ser mayor o igual al mínimo.");
    }
}
