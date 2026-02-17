using FluentValidation;
using HandySales.Application.CategoriasProductos.DTOs;

namespace HandySales.Application.CategoriasProductos.Validators
{
    public class CategoriaProductoCreateDtoValidator : AbstractValidator<CategoriaProductoCreateDto>
    {
        public CategoriaProductoCreateDtoValidator()
        {
            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.")
                .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.");

            RuleFor(x => x.Descripcion)
                .MaximumLength(255).WithMessage("La descripción no debe exceder los 255 caracteres.")
                .When(x => !string.IsNullOrWhiteSpace(x.Descripcion));
        }
    }
}
