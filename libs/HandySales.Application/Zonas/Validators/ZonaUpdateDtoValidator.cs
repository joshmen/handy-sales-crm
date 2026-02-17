using FluentValidation;
using HandySales.Application.Zonas.DTOs;

namespace HandySales.Application.Zonas.Validators
{
    public class ZonaUpdateDtoValidator : AbstractValidator<UpdateZonaDto>
    {
        public ZonaUpdateDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("El ID debe ser mayor a cero.");

            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.")
                .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.");

            RuleFor(x => x.Descripcion)
                .MaximumLength(255).WithMessage("La descripción no debe exceder los 255 caracteres.")
                .When(x => !string.IsNullOrWhiteSpace(x.Descripcion));
        }
    }
}
