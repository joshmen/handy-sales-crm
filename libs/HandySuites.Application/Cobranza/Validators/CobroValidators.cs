using FluentValidation;
using HandySuites.Application.Cobranza.DTOs;

namespace HandySuites.Application.Cobranza.Validators;

public class CobroCreateDtoValidator : AbstractValidator<CobroCreateDto>
{
    public CobroCreateDtoValidator()
    {
        RuleFor(x => x.ClienteId)
            .GreaterThan(0).WithMessage("El cliente es requerido");

        RuleFor(x => x.Monto)
            .GreaterThan(0).WithMessage("El monto debe ser mayor a 0")
            .LessThanOrEqualTo(99_999_999.99m).WithMessage("El monto excede el máximo permitido");

        RuleFor(x => x.MetodoPago)
            .InclusiveBetween(0, 5).WithMessage("Método de pago inválido");

        RuleFor(x => x.Referencia)
            .MaximumLength(200).WithMessage("La referencia no debe exceder 200 caracteres")
            .When(x => x.Referencia != null);

        RuleFor(x => x.Notas)
            .MaximumLength(1000).WithMessage("Las notas no deben exceder 1000 caracteres")
            .When(x => x.Notas != null);
    }
}

public class CobroUpdateDtoValidator : AbstractValidator<CobroUpdateDto>
{
    public CobroUpdateDtoValidator()
    {
        RuleFor(x => x.Monto)
            .GreaterThan(0).WithMessage("El monto debe ser mayor a 0")
            .LessThanOrEqualTo(99_999_999.99m).WithMessage("El monto excede el máximo permitido");

        RuleFor(x => x.MetodoPago)
            .InclusiveBetween(0, 5).WithMessage("Método de pago inválido");

        RuleFor(x => x.Referencia)
            .MaximumLength(200).WithMessage("La referencia no debe exceder 200 caracteres")
            .When(x => x.Referencia != null);

        RuleFor(x => x.Notas)
            .MaximumLength(1000).WithMessage("Las notas no deben exceder 1000 caracteres")
            .When(x => x.Notas != null);
    }
}
