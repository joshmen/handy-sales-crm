using FluentValidation;
using HandySales.Application.Zonas.DTOs;

namespace HandySales.Application.Zonas.Validators
{
    public class ZonaCreateDtoValidator : AbstractValidator<CreateZonaDto>
    {
        public ZonaCreateDtoValidator()
        {
            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre de la zona es obligatorio.");
        }
    }
}
