using FluentValidation;
using HandySales.Application.Notifications.DTOs;

namespace HandySales.Application.Notifications.Validators;

public class SendNotificationDtoValidator : AbstractValidator<SendNotificationDto>
{
    private static readonly string[] ValidTypes = { "General", "Order", "Route", "Visit", "Alert", "System" };

    public SendNotificationDtoValidator()
    {
        RuleFor(x => x.UsuarioId)
            .GreaterThan(0).WithMessage("Debe seleccionar un usuario válido.");

        RuleFor(x => x.Titulo)
            .NotEmpty().WithMessage("El título es obligatorio.")
            .MaximumLength(200).WithMessage("El título no puede exceder 200 caracteres.");

        RuleFor(x => x.Mensaje)
            .NotEmpty().WithMessage("El mensaje es obligatorio.")
            .MaximumLength(1000).WithMessage("El mensaje no puede exceder 1000 caracteres.");

        RuleFor(x => x.Tipo)
            .NotEmpty().WithMessage("El tipo es obligatorio.")
            .Must(t => ValidTypes.Contains(t))
            .WithMessage($"El tipo debe ser uno de: {string.Join(", ", ValidTypes)}");
    }
}

public class BroadcastNotificationDtoValidator : AbstractValidator<BroadcastNotificationDto>
{
    private static readonly string[] ValidTypes = { "General", "Order", "Route", "Visit", "Alert", "System" };

    public BroadcastNotificationDtoValidator()
    {
        RuleFor(x => x.Titulo)
            .NotEmpty().WithMessage("El título es obligatorio.")
            .MaximumLength(200).WithMessage("El título no puede exceder 200 caracteres.");

        RuleFor(x => x.Mensaje)
            .NotEmpty().WithMessage("El mensaje es obligatorio.")
            .MaximumLength(1000).WithMessage("El mensaje no puede exceder 1000 caracteres.");

        RuleFor(x => x.Tipo)
            .NotEmpty().WithMessage("El tipo es obligatorio.")
            .Must(t => ValidTypes.Contains(t))
            .WithMessage($"El tipo debe ser uno de: {string.Join(", ", ValidTypes)}");

        When(x => x.UsuarioIds != null && x.UsuarioIds.Any(), () =>
        {
            RuleFor(x => x.UsuarioIds)
                .Must(ids => ids!.All(id => id > 0))
                .WithMessage("Todos los IDs de usuario deben ser válidos.");
        });

        When(x => x.ZonaId.HasValue, () =>
        {
            RuleFor(x => x.ZonaId)
                .GreaterThan(0).WithMessage("El ID de zona debe ser válido.");
        });
    }
}

public class RegisterPushTokenDtoValidator : AbstractValidator<RegisterPushTokenDto>
{
    public RegisterPushTokenDtoValidator()
    {
        RuleFor(x => x.PushToken)
            .NotEmpty().WithMessage("El token de push es obligatorio.")
            .MaximumLength(500).WithMessage("El token no puede exceder 500 caracteres.");

        RuleFor(x => x.SessionId)
            .GreaterThan(0).WithMessage("Debe especificar un ID de sesión válido.");
    }
}
