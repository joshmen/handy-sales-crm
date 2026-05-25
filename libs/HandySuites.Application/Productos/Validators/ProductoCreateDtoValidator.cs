using FluentValidation;
using HandySuites.Application.Productos.DTOs;

public class ProductoCreateDtoValidator : AbstractValidator<ProductoCreateDto>
{
    public ProductoCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre es obligatorio.");

        RuleFor(x => x.CodigoBarra)
            .NotEmpty().WithMessage("El código de barra es obligatorio.")
            // Audit L-3: códigos típicos EAN-13/UPC-A/Code128 entran en 50 chars.
            // Cap superior previene strings absurdamente largos en BD.
            .MaximumLength(50).WithMessage("El código de barra no puede exceder 50 caracteres.");

        RuleFor(x => x.Descripcion)
            .NotEmpty().WithMessage("La descripción es obligatoria.");

        RuleFor(x => x.PrecioBase)
            .GreaterThanOrEqualTo(0).WithMessage("El precio base no puede ser negativo.")
            // Audit L-4: cap superior $10M MXN razonable para items físicos en CRM
            // (un servicio puede pasar pero usa otro flujo). Previene overflows /
            // typos catastróficos (10000 → 10000000 por error).
            .LessThanOrEqualTo(10_000_000m).WithMessage("El precio base no puede exceder $10,000,000.");

        RuleFor(x => x.FamiliaId)
            .GreaterThan(0).WithMessage("Debe seleccionar una familia válida.");

        RuleFor(x => x.CategoraId)
            .GreaterThan(0).WithMessage("Debe seleccionar una categoría válida.");

        RuleFor(x => x.UnidadMedidaId)
            .GreaterThan(0).WithMessage("Debe seleccionar una unidad de medida válida.");
    }
}
