using FluentValidation;
using HandySales.Application.Promociones.DTOs;

public class PromocionCreateDtoValidator : AbstractValidator<PromocionCreateDto>
{
    public PromocionCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre es obligatorio.");

        RuleFor(x => x.ProductoIds)
            .NotEmpty().WithMessage("Debe seleccionar al menos un producto.");

        RuleFor(x => x.DescuentoPorcentaje)
            .InclusiveBetween(0, 100).WithMessage("El descuento debe ser entre 0 y 100.");

        RuleFor(x => x.FechaInicio)
            .NotEmpty().WithMessage("La fecha de inicio es obligatoria.");

        RuleFor(x => x.FechaFin)
            .NotEmpty().WithMessage("La fecha de fin es obligatoria.")
            .GreaterThan(x => x.FechaInicio)
            .WithMessage("La fecha fin debe ser posterior a la fecha de inicio.");
    }
}
