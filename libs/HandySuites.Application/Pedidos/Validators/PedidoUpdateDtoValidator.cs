using FluentValidation;
using HandySuites.Application.Pedidos.DTOs;

namespace HandySuites.Application.Pedidos.Validators;

public class PedidoUpdateDtoValidator : AbstractValidator<PedidoUpdateDto>
{
    public PedidoUpdateDtoValidator()
    {
        When(x => x.FechaEntregaEstimada.HasValue, () =>
        {
            RuleFor(x => x.FechaEntregaEstimada)
                .Must(f => f > System.DateTime.UtcNow.AddHours(-1))
                .WithMessage("La fecha de entrega estimada debe ser futura.");
        });

        When(x => x.Latitud.HasValue || x.Longitud.HasValue, () =>
        {
            RuleFor(x => x.Latitud)
                .NotNull().WithMessage("Latitud es requerida cuando se especifica ubicación.")
                .InclusiveBetween(-90, 90).WithMessage("Latitud debe estar entre -90 y 90.");

            RuleFor(x => x.Longitud)
                .NotNull().WithMessage("Longitud es requerida cuando se especifica ubicación.")
                .InclusiveBetween(-180, 180).WithMessage("Longitud debe estar entre -180 y 180.");
        });

        RuleFor(x => x.Notas)
            .MaximumLength(2000).WithMessage("Las notas no pueden exceder 2000 caracteres.");

        RuleFor(x => x.DireccionEntrega)
            .MaximumLength(500).WithMessage("La dirección de entrega no puede exceder 500 caracteres.");

        When(x => x.Detalles is not null && x.Detalles.Count > 0, () =>
        {
            RuleForEach(x => x.Detalles!)
                .SetValidator(new DetallePedidoCreateDtoValidator());
        });
    }
}
