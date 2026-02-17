using FluentValidation;
using HandySales.Application.Clientes.DTOs;

namespace HandySales.Application.Clientes.Validators
{
    public class ClienteCreateDtoValidator : AbstractValidator<ClienteCreateDto>
    {
        public ClienteCreateDtoValidator()
        {
            RuleFor(x => x.Nombre)
                .NotEmpty().WithMessage("El nombre es obligatorio.");

            RuleFor(x => x.RFC)
                .Length(12, 13).WithMessage("El RFC debe tener entre 12 y 13 caracteres.")
                .When(x => !string.IsNullOrEmpty(x.RFC));

            RuleFor(x => x.Correo)
                .NotEmpty().WithMessage("El correo es obligatorio.")
                .EmailAddress().WithMessage("El formato del correo es inválido.");

            RuleFor(x => x.Telefono)
                .NotEmpty().WithMessage("El teléfono es obligatorio.")
                .Matches(@"^\d{10}$").WithMessage("El teléfono debe tener exactamente 10 dígitos.");

            RuleFor(x => x.Direccion)
                .NotEmpty().WithMessage("La dirección es obligatoria.");

            RuleFor(x => x.CategoriaClienteId)
                .GreaterThan(0).WithMessage("Debe seleccionar una categoría válida.");

            RuleFor(x => x.IdZona)
                .GreaterThan(0).WithMessage("Debe seleccionar una zona válida.");
        }
    }
}
