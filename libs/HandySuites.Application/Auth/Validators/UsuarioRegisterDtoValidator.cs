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

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("La contraseña es obligatoria.")
                .MinimumLength(6).WithMessage("La contraseña debe tener al menos 6 caracteres.");

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
