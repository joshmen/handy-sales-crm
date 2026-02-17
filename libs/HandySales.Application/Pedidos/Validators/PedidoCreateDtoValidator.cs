using FluentValidation;
using HandySales.Application.Pedidos.DTOs;

namespace HandySales.Application.Pedidos.Validators;

public class PedidoCreateDtoValidator : AbstractValidator<PedidoCreateDto>
{
    public PedidoCreateDtoValidator()
    {
        RuleFor(x => x.ClienteId)
            .GreaterThan(0).WithMessage("Debe seleccionar un cliente válido.");

        RuleFor(x => x.Detalles)
            .NotEmpty().WithMessage("El pedido debe contener al menos un producto.")
            .Must(d => d != null && d.Count > 0).WithMessage("El pedido debe contener al menos un producto.");

        RuleForEach(x => x.Detalles)
            .SetValidator(new DetallePedidoCreateDtoValidator());

        When(x => x.FechaEntregaEstimada.HasValue, () =>
        {
            RuleFor(x => x.FechaEntregaEstimada)
                .Must(f => f > DateTime.UtcNow.AddHours(-1))
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
    }
}

public class DetallePedidoCreateDtoValidator : AbstractValidator<DetallePedidoCreateDto>
{
    public DetallePedidoCreateDtoValidator()
    {
        RuleFor(x => x.ProductoId)
            .GreaterThan(0).WithMessage("Debe seleccionar un producto válido.");

        RuleFor(x => x.Cantidad)
            .GreaterThan(0).WithMessage("La cantidad debe ser mayor a cero.")
            .LessThanOrEqualTo(99999).WithMessage("La cantidad no puede exceder 99,999 unidades.");

        When(x => x.PrecioUnitario.HasValue, () =>
        {
            RuleFor(x => x.PrecioUnitario)
                .GreaterThanOrEqualTo(0).WithMessage("El precio unitario no puede ser negativo.");
        });

        When(x => x.Descuento.HasValue, () =>
        {
            RuleFor(x => x.Descuento)
                .InclusiveBetween(0, 100).WithMessage("El descuento debe estar entre 0 y 100%.");
        });
    }
}
