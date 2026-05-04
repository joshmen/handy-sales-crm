using FluentValidation;
using HandySuites.Domain.Common;

namespace HandySuites.Application.Usuarios.Validators
{
    public class UsuarioUpdateDtoValidator : AbstractValidator<UsuarioUpdateDto>
    {
        // Whitelist de roles válidos. Mantener en sync con RoleNames.
        private static readonly string[] ValidRoles =
        {
            RoleNames.SuperAdmin,
            RoleNames.Admin,
            RoleNames.Supervisor,
            RoleNames.Viewer,
            RoleNames.Vendedor,
        };

        public UsuarioUpdateDtoValidator()
        {
            // Email: opcional desde 2026-05-04. Si viene, valida formato.
            // Antes era required y rechazaba con 400 al editar desde web Equipo
            // que solo manda {nombre, rol, activo, telefono}.
            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("El formato del correo electrónico es inválido.")
                .MaximumLength(255).WithMessage("El correo electrónico no debe exceder los 255 caracteres.")
                .When(x => !string.IsNullOrWhiteSpace(x.Email));

            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.")
                .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.")
                .Matches(@"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$").WithMessage("El nombre solo puede contener letras y espacios.");

            RuleFor(x => x.Password)
                .MinimumLength(6).WithMessage("La contraseña debe tener al menos 6 caracteres.")
                .Matches(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)").WithMessage("La contraseña debe contener al menos una minúscula, una mayúscula y un número.")
                .When(x => !string.IsNullOrWhiteSpace(x.Password));

            // Rol opcional. Si viene, debe ser uno de los válidos.
            RuleFor(x => x.Rol)
                .Must(rol => rol == null || ValidRoles.Contains(rol))
                .WithMessage("El rol no es válido. Valores aceptados: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR.")
                .When(x => !string.IsNullOrWhiteSpace(x.Rol));

            // Teléfono opcional. Acepta dígitos + separadores comunes ("(",
            // ")", "-", " ") y opcional "+" inicial. Permite formatos
            // internacionales como "+52 (55) 1234-5678" o nacionales "5512345678".
            RuleFor(x => x.Telefono)
                .Matches(@"^\+?[\d\s\-\(\)]{7,20}$")
                .WithMessage("El teléfono debe contener entre 7 y 20 caracteres (dígitos, espacios, paréntesis o guiones).")
                .When(x => !string.IsNullOrWhiteSpace(x.Telefono));

            // AvatarUrl opcional. Si viene, validar URL bien formada.
            RuleFor(x => x.AvatarUrl)
                .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var u) &&
                             (u.Scheme == "https" || u.Scheme == "http"))
                .WithMessage("El URL del avatar debe ser absoluto (http/https).")
                .MaximumLength(500).WithMessage("El URL del avatar no debe exceder los 500 caracteres.")
                .When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl));
        }
    }
}
