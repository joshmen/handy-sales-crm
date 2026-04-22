using FluentValidation;
using HandySuites.Application.Precios.DTOs;

namespace HandySuites.Application.Precios.Validators
{
    public class PrecioPorProductoCreateDtoValidator : AbstractValidator<PrecioPorProductoCreateDto>
    {
        public PrecioPorProductoCreateDtoValidator()
        {
            // NOTE: TenandId es dead code (el tenant se inyecta desde CurrentTenant en el service).
            // No lo validamos porque el frontend nunca lo envía.

            RuleFor(x => x.ProductoId)
                .GreaterThan(0).WithMessage("El producto es obligatorio.");

            RuleFor(x => x.ListaPrecioId)
                .GreaterThan(0).WithMessage("La lista de precio es obligatoria.");

            RuleFor(x => x.Precio)
                .GreaterThanOrEqualTo(0).WithMessage("El precio no puede ser negativo.");
        }
    }
}
