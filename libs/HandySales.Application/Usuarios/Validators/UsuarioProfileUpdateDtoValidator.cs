using FluentValidation;
using HandySales.Application.Usuarios.DTOs;

namespace HandySales.Application.Usuarios.Validators
{
    public class UsuarioProfileUpdateDtoValidator : AbstractValidator<UsuarioProfileUpdateDto>
    {
        public UsuarioProfileUpdateDtoValidator()
        {
            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.")
                .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.")
                .Matches(@"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$").WithMessage("El nombre solo puede contener letras y espacios.");

            RuleFor(x => x.CurrentPassword)
                .NotEmpty().WithMessage("La contraseña actual es obligatoria para cambiar la contraseña.")
                .When(x => !string.IsNullOrWhiteSpace(x.NewPassword));

            RuleFor(x => x.NewPassword)
                .NotEmpty().WithMessage("La nueva contraseña es obligatoria.")
                .MinimumLength(6).WithMessage("La nueva contraseña debe tener al menos 6 caracteres.")
                .Matches(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)").WithMessage("La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número.")
                .When(x => !string.IsNullOrWhiteSpace(x.CurrentPassword));

            RuleFor(x => x.NewPassword)
                .NotEqual(x => x.CurrentPassword).WithMessage("La nueva contraseña debe ser diferente a la actual.")
                .When(x => !string.IsNullOrWhiteSpace(x.CurrentPassword) && !string.IsNullOrWhiteSpace(x.NewPassword));
        }
    }
}