using FluentValidation;
using HandySuites.Shared.Validation;

namespace HandySuites.Application.Usuarios.Validators
{
    public class UsuarioRegisterDtoValidator : AbstractValidator<UsuarioRegisterDto>
    {
        public UsuarioRegisterDtoValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
                .EmailAddress().WithMessage("El formato del correo electrónico es inválido.");

            // Sprint correctivo 2026-06-06: OWASP password complexity.
            //   - 12+ chars (era 6, bruteforce GPU mata 8 chars de mixed case
            //     en <1 dia).
            //   - Al menos 1 minuscula, 1 mayuscula, 1 digito.
            //   - Maximum 128 chars (DoS preventivo de BCrypt sobre input gigante).
            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("La contraseña es obligatoria.")
                .MinimumLength(12).WithMessage("La contraseña debe tener al menos 12 caracteres.")
                .MaximumLength(128).WithMessage("La contraseña no debe exceder 128 caracteres.")
                .Matches("[a-z]").WithMessage("La contraseña debe incluir al menos una letra minúscula.")
                .Matches("[A-Z]").WithMessage("La contraseña debe incluir al menos una letra mayúscula.")
                .Matches("[0-9]").WithMessage("La contraseña debe incluir al menos un dígito.");

            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.");

            RuleFor(x => x.NombreEmpresa)
                .NotEmpty().WithMessage("El nombre de la empresa es obligatorio.");

            RuleFor(x => x.IdentificadorFiscal)
                .MaximumLength(20).WithMessage("El identificador fiscal no debe exceder los 20 caracteres.")
                .Must((dto, id) => FiscalIdValidator.Validate(id, dto.TipoIdentificadorFiscal) == null)
                .WithMessage(dto => FiscalIdValidator.Validate(dto.IdentificadorFiscal, dto.TipoIdentificadorFiscal) ?? "")
                .When(x => !string.IsNullOrWhiteSpace(x.IdentificadorFiscal));

            RuleFor(x => x.Contacto)
                .MaximumLength(100).WithMessage("El nombre de contacto no debe exceder los 100 caracteres.")
                .When(x => !string.IsNullOrWhiteSpace(x.Contacto));
        }
    }
}
