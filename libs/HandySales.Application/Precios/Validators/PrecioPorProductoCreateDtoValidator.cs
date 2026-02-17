using FluentValidation;
using HandySales.Application.Precios.DTOs;

namespace HandySales.Application.Precios.Validators
{
    public class PrecioPorProductoCreateDtoValidator : AbstractValidator<PrecioPorProductoCreateDto>
    {
        public PrecioPorProductoCreateDtoValidator()
        {
            RuleFor(x => x.TenandId)
                .GreaterThan(0).WithMessage("El tenant es obligatorio.");

            RuleFor(x => x.ProductoId)
                .GreaterThan(0).WithMessage("El producto es obligatorio.");

            RuleFor(x => x.ListaPrecioId)
                .GreaterThan(0).WithMessage("La lista de precio es obligatoria.");

            RuleFor(x => x.Precio)
                .GreaterThanOrEqualTo(0).WithMessage("El precio no puede ser negativo.");
        }
    }
}
