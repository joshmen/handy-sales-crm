using FluentValidation;
using HandySales.Application.Usuarios.DTOs;

namespace HandySales.Application.Usuarios.Validators;

public class CrearUsuarioDtoValidator : AbstractValidator<CrearUsuarioDto>
{
    public CrearUsuarioDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
            .EmailAddress().WithMessage("El formato del correo electrónico es inválido.")
            .MaximumLength(255).WithMessage("El correo electrónico no debe exceder los 255 caracteres.");

        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(100).WithMessage("El nombre no debe exceder los 100 caracteres.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña es obligatoria.")
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
            .Matches(@"[a-z]").WithMessage("La contraseña debe contener al menos una letra minúscula.")
            .Matches(@"[A-Z]").WithMessage("La contraseña debe contener al menos una letra mayúscula.")
            .Matches(@"\d").WithMessage("La contraseña debe contener al menos un número.");

        RuleFor(x => x.Rol)
            .NotEmpty().WithMessage("El rol es obligatorio.");
    }
}
