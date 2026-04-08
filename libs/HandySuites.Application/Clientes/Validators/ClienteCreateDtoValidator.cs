using FluentValidation;
using HandySuites.Application.Clientes.DTOs;

namespace HandySuites.Application.Clientes.Validators
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
                .EmailAddress().WithMessage("El formato del correo es inválido.")
                .When(x => !string.IsNullOrEmpty(x.Correo));

            RuleFor(x => x.Telefono)
                .Matches(@"^\d{10}$").WithMessage("El teléfono debe tener exactamente 10 dígitos.")
                .When(x => !string.IsNullOrEmpty(x.Telefono));

            RuleFor(x => x.Direccion)
                .NotEmpty().WithMessage("La dirección es obligatoria.");

            RuleFor(x => x.NumeroExterior)
                .NotEmpty().WithMessage("El número exterior es obligatorio.")
                .MaximumLength(20).WithMessage("El número exterior no puede exceder 20 caracteres.");

            RuleFor(x => x.CategoriaClienteId)
                .GreaterThan(0).WithMessage("Debe seleccionar una categoría válida.");

            RuleFor(x => x.IdZona)
                .GreaterThan(0).WithMessage("Debe seleccionar una zona válida.");

            // Campos numéricos
            RuleFor(x => x.Descuento)
                .InclusiveBetween(0, 100).WithMessage("El descuento debe estar entre 0 y 100.");

            RuleFor(x => x.Saldo)
                .GreaterThanOrEqualTo(0).WithMessage("El saldo no puede ser negativo.");

            RuleFor(x => x.LimiteCredito)
                .GreaterThanOrEqualTo(0).WithMessage("El límite de crédito no puede ser negativo.");

            RuleFor(x => x.VentaMinimaEfectiva)
                .GreaterThanOrEqualTo(0).WithMessage("La venta mínima efectiva no puede ser negativa.");

            RuleFor(x => x.DiasCredito)
                .GreaterThanOrEqualTo(0).WithMessage("Los días de crédito no pueden ser negativos.");

            // Contacto
            RuleFor(x => x.Encargado)
                .MaximumLength(255).WithMessage("El encargado no puede exceder 255 caracteres.")
                .When(x => !string.IsNullOrEmpty(x.Encargado));

            // Datos fiscales: obligatorios solo cuando Facturable=true
            When(x => x.Facturable, () =>
            {
                RuleFor(x => x.RazonSocial)
                    .NotEmpty().WithMessage("La razón social es obligatoria para clientes facturables.")
                    .MaximumLength(300).WithMessage("La razón social no puede exceder 300 caracteres.");

                RuleFor(x => x.CodigoPostalFiscal)
                    .NotEmpty().WithMessage("El código postal fiscal es obligatorio para clientes facturables.")
                    .Matches(@"^\d{5}$").WithMessage("El código postal fiscal debe tener exactamente 5 dígitos.");

                RuleFor(x => x.RegimenFiscal)
                    .NotEmpty().WithMessage("El régimen fiscal es obligatorio para clientes facturables.")
                    .Matches(@"^\d{3}$").WithMessage("El régimen fiscal debe ser un código de 3 dígitos.");
            });

            RuleFor(x => x.CodigoPostalFiscal)
                .Matches(@"^\d{5}$").WithMessage("El código postal fiscal debe tener exactamente 5 dígitos.")
                .When(x => !string.IsNullOrEmpty(x.CodigoPostalFiscal) && !x.Facturable);

            RuleFor(x => x.RegimenFiscal)
                .Matches(@"^\d{3}$").WithMessage("El régimen fiscal debe ser un código de 3 dígitos.")
                .When(x => !string.IsNullOrEmpty(x.RegimenFiscal) && !x.Facturable);
        }
    }
}
