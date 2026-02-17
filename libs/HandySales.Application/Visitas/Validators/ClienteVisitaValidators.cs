using FluentValidation;
using HandySales.Application.Visitas.DTOs;

namespace HandySales.Application.Visitas.Validators;

public class ClienteVisitaCreateDtoValidator : AbstractValidator<ClienteVisitaCreateDto>
{
    public ClienteVisitaCreateDtoValidator()
    {
        RuleFor(x => x.ClienteId)
            .GreaterThan(0).WithMessage("Debe seleccionar un cliente válido.");

        When(x => x.FechaProgramada.HasValue, () =>
        {
            RuleFor(x => x.FechaProgramada)
                .Must(f => f > DateTime.UtcNow.AddHours(-1))
                .WithMessage("La fecha programada debe ser futura.");
        });

        RuleFor(x => x.Notas)
            .MaximumLength(2000).WithMessage("Las notas no pueden exceder 2000 caracteres.");
    }
}

public class CheckInDtoValidator : AbstractValidator<CheckInDto>
{
    public CheckInDtoValidator()
    {
        RuleFor(x => x.Latitud)
            .InclusiveBetween(-90, 90).WithMessage("Latitud debe estar entre -90 y 90 grados.");

        RuleFor(x => x.Longitud)
            .InclusiveBetween(-180, 180).WithMessage("Longitud debe estar entre -180 y 180 grados.");

        RuleFor(x => x.Notas)
            .MaximumLength(2000).WithMessage("Las notas no pueden exceder 2000 caracteres.");
    }
}

public class CheckOutDtoValidator : AbstractValidator<CheckOutDto>
{
    public CheckOutDtoValidator()
    {
        RuleFor(x => x.Resultado)
            .IsInEnum().WithMessage("Debe seleccionar un resultado válido.");

        When(x => x.Latitud.HasValue, () =>
        {
            RuleFor(x => x.Latitud)
                .InclusiveBetween(-90, 90).WithMessage("Latitud debe estar entre -90 y 90 grados.");
        });

        When(x => x.Longitud.HasValue, () =>
        {
            RuleFor(x => x.Longitud)
                .InclusiveBetween(-180, 180).WithMessage("Longitud debe estar entre -180 y 180 grados.");
        });

        RuleFor(x => x.Notas)
            .MaximumLength(2000).WithMessage("Las notas no pueden exceder 2000 caracteres.");

        RuleFor(x => x.NotasPrivadas)
            .MaximumLength(2000).WithMessage("Las notas privadas no pueden exceder 2000 caracteres.");

        When(x => x.Fotos != null && x.Fotos.Any(), () =>
        {
            RuleFor(x => x.Fotos)
                .Must(f => f!.Count <= 10).WithMessage("No se pueden adjuntar más de 10 fotos.")
                .Must(f => f!.All(url => Uri.IsWellFormedUriString(url, UriKind.Absolute) || url.StartsWith("data:")))
                .WithMessage("Las URLs de fotos deben ser válidas.");
        });

        When(x => x.PedidoId.HasValue, () =>
        {
            RuleFor(x => x.PedidoId)
                .GreaterThan(0).WithMessage("El ID del pedido debe ser válido.");
        });
    }
}
