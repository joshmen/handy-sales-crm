using FluentValidation;

namespace HandySales.Application.Usuarios.Validators
{
    public class UsuarioLoginDtoValidator : AbstractValidator<UsuarioLoginDto>
    {
        public UsuarioLoginDtoValidator()
        {
            RuleFor(x => x.email)
                .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
                .EmailAddress().WithMessage("El formato del correo electrónico es inválido.");

            RuleFor(x => x.password)
                .NotEmpty().WithMessage("La contraseña es obligatoria.")
                .MinimumLength(6).WithMessage("La contraseña debe tener al menos 6 caracteres.");
        }
    }
}
