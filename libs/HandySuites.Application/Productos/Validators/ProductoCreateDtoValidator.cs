using FluentValidation;
using HandySuites.Application.Productos.DTOs;

public class ProductoCreateDtoValidator : AbstractValidator<ProductoCreateDto>
{
    public ProductoCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre es obligatorio.");

        RuleFor(x => x.CodigoBarra)
            .NotEmpty().WithMessage("El código de barra es obligatorio.");

        RuleFor(x => x.Descripcion)
            .NotEmpty().WithMessage("La descripción es obligatoria.");

        RuleFor(x => x.PrecioBase)
            .GreaterThanOrEqualTo(0).WithMessage("El precio base no puede ser negativo.");

        RuleFor(x => x.FamiliaId)
            .GreaterThan(0).WithMessage("Debe seleccionar una familia válida.");

        RuleFor(x => x.CategoraId)
            .GreaterThan(0).WithMessage("Debe seleccionar una categoría válida.");

        RuleFor(x => x.UnidadMedidaId)
            .GreaterThan(0).WithMessage("Debe seleccionar una unidad de medida válida.");
    }
}
