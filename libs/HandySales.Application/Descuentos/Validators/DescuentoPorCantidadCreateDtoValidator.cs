using FluentValidation;
using HandySales.Application.Descuentos.DTOs;

namespace HandySales.Application.Descuentos.Validators
{
    public class DescuentoPorCantidadCreateDtoValidator : AbstractValidator<DescuentoPorCantidadCreateDto>
    {
        public DescuentoPorCantidadCreateDtoValidator()
        {
            RuleFor(x => x.TipoAplicacion)
                .Must(t => t == "Producto" || t == "Global")
                .WithMessage("El tipo de aplicación debe ser 'Producto' o 'Global'.");

            // Cuando es tipo Producto, ProductoId debe ser > 0
            RuleFor(x => x.ProductoId)
                .NotNull()
                .When(x => x.TipoAplicacion == "Producto")
                .WithMessage("El producto es obligatorio para descuentos por producto.");

            RuleFor(x => x.ProductoId)
                .GreaterThan(0)
                .When(x => x.TipoAplicacion == "Producto" && x.ProductoId.HasValue)
                .WithMessage("El ID del producto debe ser mayor a cero.");

            // Cuando es tipo Global, ProductoId debe ser null
            RuleFor(x => x.ProductoId)
                .Null()
                .When(x => x.TipoAplicacion == "Global")
                .WithMessage("El descuento global no debe tener producto asignado.");

            RuleFor(x => x.CantidadMinima)
                .GreaterThan(0).WithMessage("La cantidad mínima debe ser mayor a cero.");

            RuleFor(x => x.DescuentoPorcentaje)
                .InclusiveBetween(0.01m, 100).WithMessage("El descuento debe estar entre 0.01 y 100%.");
        }
    }
}
