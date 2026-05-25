using FluentValidation;
using HandySuites.Application.ListasPrecios.DTOs;

public class ListaPrecioCreateDtoValidator : AbstractValidator<ListaPrecioCreateDto>
{
    public ListaPrecioCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre de la lista de precios es obligatorio.")
            // Audit L-5: cap razonable. Mismo límite que CategoriaCliente/Producto.Nombre.
            .MaximumLength(100).WithMessage("El nombre no puede exceder 100 caracteres.");
    }
}
