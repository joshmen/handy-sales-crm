using FluentValidation;
using HandySuites.Application.Vehiculos.DTOs;

namespace HandySuites.Application.Vehiculos.Validators
{
    public class VehiculoUpdateDtoValidator : AbstractValidator<UpdateVehiculoDto>
    {
        public VehiculoUpdateDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("El ID debe ser mayor a cero.");

            RuleFor(x => x.Placa)
                .NotEmpty().WithMessage("La placa es obligatoria.")
                .MaximumLength(20).WithMessage("La placa no debe exceder los 20 caracteres.");

            RuleFor(x => x.CapacidadUnidades)
                .GreaterThanOrEqualTo(0).WithMessage("La capacidad no puede ser negativa.");

            RuleFor(x => x.Kilometraje)
                .GreaterThanOrEqualTo(0).WithMessage("El kilometraje no puede ser negativo.")
                .When(x => x.Kilometraje.HasValue);
        }
    }
}
