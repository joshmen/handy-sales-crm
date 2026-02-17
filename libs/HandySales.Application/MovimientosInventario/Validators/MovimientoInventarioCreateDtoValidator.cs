using FluentValidation;
using HandySales.Application.MovimientosInventario.DTOs;

namespace HandySales.Application.MovimientosInventario.Validators;

public class MovimientoInventarioCreateDtoValidator : AbstractValidator<MovimientoInventarioCreateDto>
{
    public MovimientoInventarioCreateDtoValidator()
    {
        RuleFor(x => x.ProductoId)
            .GreaterThan(0)
            .WithMessage("El producto es requerido");

        RuleFor(x => x.TipoMovimiento)
            .NotEmpty()
            .WithMessage("El tipo de movimiento es requerido")
            .Must(tipo => new[] { "ENTRADA", "SALIDA", "AJUSTE" }.Contains(tipo.ToUpperInvariant()))
            .WithMessage("El tipo de movimiento debe ser ENTRADA, SALIDA o AJUSTE");

        RuleFor(x => x.Cantidad)
            .GreaterThan(0)
            .WithMessage("La cantidad debe ser mayor a 0");

        RuleFor(x => x.Motivo)
            .MaximumLength(50)
            .WithMessage("El motivo no puede exceder 50 caracteres");

        RuleFor(x => x.Comentario)
            .MaximumLength(500)
            .WithMessage("El comentario no puede exceder 500 caracteres");
    }
}
