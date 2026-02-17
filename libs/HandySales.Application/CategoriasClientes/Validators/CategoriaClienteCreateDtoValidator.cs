using FluentValidation;
using HandySales.Application.CategoriasClientes.DTOs;

namespace HandySales.Application.CategoriasClientes.Validators;

public class CategoriaClienteCreateDtoValidator : AbstractValidator<CategoriaClienteCreateDto>
{
    public CategoriaClienteCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre de la categoría es obligatorio.");
    }
}
