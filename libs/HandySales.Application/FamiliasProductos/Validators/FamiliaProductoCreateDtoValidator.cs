using FluentValidation;
using HandySales.Application.FamiliasProductos.DTOs;

namespace HandySales.Application.FamiliasProductos.Validators
{
    public class FamiliaProductoCreateDtoValidator : AbstractValidator<FamiliaProductoCreateDto>
    {
        public FamiliaProductoCreateDtoValidator()
        {
            // TenantId se obtiene del JWT, no se valida desde el DTO

            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.")
                .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.");

            RuleFor(x => x.Descripcion)
                .MaximumLength(255).WithMessage("La descripción no debe exceder los 255 caracteres.");
        }
    }
}
