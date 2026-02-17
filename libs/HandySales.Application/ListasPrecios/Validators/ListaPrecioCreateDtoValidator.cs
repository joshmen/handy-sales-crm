using FluentValidation;
using HandySales.Application.ListasPrecios.DTOs;

public class ListaPrecioCreateDtoValidator : AbstractValidator<ListaPrecioCreateDto>
{
    public ListaPrecioCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre de la lista de precios es obligatorio.");
    }
}
