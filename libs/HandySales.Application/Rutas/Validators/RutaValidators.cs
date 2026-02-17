using FluentValidation;
using HandySales.Application.Rutas.DTOs;

namespace HandySales.Application.Rutas.Validators;

public class RutaVendedorCreateDtoValidator : AbstractValidator<RutaVendedorCreateDto>
{
    public RutaVendedorCreateDtoValidator()
    {
        RuleFor(x => x.UsuarioId)
            .GreaterThan(0).WithMessage("Debe seleccionar un vendedor válido.");

        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre de la ruta es obligatorio.")
            .MaximumLength(200).WithMessage("El nombre no puede exceder 200 caracteres.");

        RuleFor(x => x.Descripcion)
            .MaximumLength(500).WithMessage("La descripción no puede exceder 500 caracteres.");

        RuleFor(x => x.Fecha)
            .Must(f => f >= DateTime.UtcNow.Date.AddDays(-1))
            .WithMessage("La fecha de la ruta no puede ser en el pasado.");

        When(x => x.HoraInicioEstimada.HasValue && x.HoraFinEstimada.HasValue, () =>
        {
            RuleFor(x => x)
                .Must(x => x.HoraFinEstimada > x.HoraInicioEstimada)
                .WithMessage("La hora de fin debe ser posterior a la hora de inicio.");
        });

        RuleFor(x => x.Notas)
            .MaximumLength(2000).WithMessage("Las notas no pueden exceder 2000 caracteres.");

        When(x => x.Detalles != null && x.Detalles.Any(), () =>
        {
            RuleForEach(x => x.Detalles)
                .SetValidator(new RutaDetalleCreateDtoValidator());

            RuleFor(x => x.Detalles)
                .Must(HaveUniqueOrderValues).WithMessage("Los valores de orden de visita deben ser únicos.")
                .Must(HaveUniqueClients).WithMessage("No puede haber clientes duplicados en la ruta.");
        });
    }

    private bool HaveUniqueOrderValues(List<RutaDetalleCreateDto>? detalles)
    {
        if (detalles == null) return true;
        var orders = detalles.Select(d => d.OrdenVisita).ToList();
        return orders.Count == orders.Distinct().Count();
    }

    private bool HaveUniqueClients(List<RutaDetalleCreateDto>? detalles)
    {
        if (detalles == null) return true;
        var clientIds = detalles.Select(d => d.ClienteId).ToList();
        return clientIds.Count == clientIds.Distinct().Count();
    }
}

public class RutaDetalleCreateDtoValidator : AbstractValidator<RutaDetalleCreateDto>
{
    public RutaDetalleCreateDtoValidator()
    {
        RuleFor(x => x.ClienteId)
            .GreaterThan(0).WithMessage("Debe seleccionar un cliente válido.");

        RuleFor(x => x.OrdenVisita)
            .GreaterThanOrEqualTo(1).WithMessage("El orden de visita debe ser al menos 1.")
            .LessThanOrEqualTo(100).WithMessage("El orden de visita no puede exceder 100.");

        When(x => x.DuracionEstimadaMinutos.HasValue, () =>
        {
            RuleFor(x => x.DuracionEstimadaMinutos)
                .InclusiveBetween(1, 480).WithMessage("La duración estimada debe ser entre 1 y 480 minutos (8 horas).");
        });

        RuleFor(x => x.Notas)
            .MaximumLength(500).WithMessage("Las notas no pueden exceder 500 caracteres.");
    }
}

public class RutaVendedorUpdateDtoValidator : AbstractValidator<RutaVendedorUpdateDto>
{
    public RutaVendedorUpdateDtoValidator()
    {
        When(x => x.Nombre != null, () =>
        {
            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre de la ruta no puede estar vacío.")
                .MaximumLength(200).WithMessage("El nombre no puede exceder 200 caracteres.");
        });

        RuleFor(x => x.Descripcion)
            .MaximumLength(500).WithMessage("La descripción no puede exceder 500 caracteres.");

        When(x => x.Fecha.HasValue, () =>
        {
            RuleFor(x => x.Fecha)
                .Must(f => f >= DateTime.UtcNow.Date.AddDays(-1))
                .WithMessage("La fecha de la ruta no puede ser en el pasado.");
        });

        When(x => x.HoraInicioEstimada.HasValue && x.HoraFinEstimada.HasValue, () =>
        {
            RuleFor(x => x)
                .Must(x => x.HoraFinEstimada > x.HoraInicioEstimada)
                .WithMessage("La hora de fin debe ser posterior a la hora de inicio.");
        });

        RuleFor(x => x.Notas)
            .MaximumLength(2000).WithMessage("Las notas no pueden exceder 2000 caracteres.");
    }
}

public class IniciarRutaDtoValidator : AbstractValidator<IniciarRutaDto>
{
    public IniciarRutaDtoValidator()
    {
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
    }
}

public class LlegarParadaDtoValidator : AbstractValidator<LlegarParadaDto>
{
    public LlegarParadaDtoValidator()
    {
        RuleFor(x => x.Latitud)
            .InclusiveBetween(-90, 90).WithMessage("Latitud debe estar entre -90 y 90 grados.");

        RuleFor(x => x.Longitud)
            .InclusiveBetween(-180, 180).WithMessage("Longitud debe estar entre -180 y 180 grados.");
    }
}
