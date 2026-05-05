using FluentValidation;
using HandySuites.Application.Usuarios.DTOs;
using HandySuites.Domain.Common;

namespace HandySuites.Application.Usuarios.Validators;

/// <summary>
/// Reglas condicionales según <see cref="CrearUsuarioDto.SinEmail"/>:
///
/// - <c>SinEmail=false</c> (invite link, default): Email required + formato.
///   Password debe estar null/empty (si admin lo manda, error 400 — patrón
///   anti-leak: admin nunca debe tipear el password de otro usuario).
/// - <c>SinEmail=true</c> (vendedor de campo sin email): Email opcional.
///   Password required + reglas fuertes (8+ chars, mayús, minús, número).
///
/// Implementado con el patrón idiomático de FluentValidation:
/// `When(predicate, () => { ... }).Otherwise(() => { ... })` para agrupar
/// reglas mutuamente exclusivas (validado por context7 review).
///
/// Rol: whitelist contra <see cref="RoleNames"/>. La verificación adicional
/// "el caller PUEDE asignar este rol" vive en el service via
/// <see cref="RoleHierarchy.CanCreateRole"/>.
/// </summary>
public class CrearUsuarioDtoValidator : AbstractValidator<CrearUsuarioDto>
{
    private static readonly string[] ValidRoles =
    {
        RoleNames.SuperAdmin,
        RoleNames.Admin,
        RoleNames.Supervisor,
        RoleNames.Viewer,
        RoleNames.Vendedor,
    };

    public CrearUsuarioDtoValidator()
    {
        // Reglas comunes a ambos branches.
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.");

        RuleFor(x => x.Rol)
            .NotEmpty().WithMessage("El rol es obligatorio.")
            .Must(r => ValidRoles.Contains(r))
            .WithMessage("El rol no es válido. Valores aceptados: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR.");

        // Telefono opcional con regex permisivo (consistente con UsuarioUpdateDtoValidator).
        RuleFor(x => x.Telefono)
            .Matches(@"^\+?[\d\s\-\(\)]{7,20}$")
            .WithMessage("El teléfono debe contener entre 7 y 20 caracteres (dígitos, espacios, paréntesis o guiones).")
            .When(x => !string.IsNullOrWhiteSpace(x.Telefono));

        // Branch SinEmail=true (vendedor de campo): email opcional pero si
        // viene debe ser válido; password required + strong.
        When(x => x.SinEmail, () =>
        {
            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("El formato del correo electrónico es inválido.")
                .MaximumLength(255).WithMessage("El correo electrónico no debe exceder los 255 caracteres.")
                .When(x => !string.IsNullOrWhiteSpace(x.Email));

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("La contraseña temporal es obligatoria cuando se crea un usuario sin email.")
                .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
                .Matches(@"[a-z]").WithMessage("La contraseña debe contener al menos una letra minúscula.")
                .Matches(@"[A-Z]").WithMessage("La contraseña debe contener al menos una letra mayúscula.")
                .Matches(@"\d").WithMessage("La contraseña debe contener al menos un número.");
        }).Otherwise(() =>
        {
            // Invite-link flow (default + recommended): email required + formato.
            // Password DEBE estar vacío — el usuario lo establecerá vía /set-password.
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
                .EmailAddress().WithMessage("El formato del correo electrónico es inválido.")
                .MaximumLength(255).WithMessage("El correo electrónico no debe exceder los 255 caracteres.");

            RuleFor(x => x.Password)
                .Empty().WithMessage("No envíes contraseña — el usuario la establecerá vía la invitación por email.");
        });
    }
}
