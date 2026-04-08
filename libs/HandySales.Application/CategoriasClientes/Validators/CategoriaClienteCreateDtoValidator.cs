using FluentValidation;
using HandySuites.Application.CategoriasClientes.DTOs;

namespace HandySuites.Application.CategoriasClientes.Validators;

public class CategoriaClienteCreateDtoValidator : AbstractValidator<CategoriaClienteCreateDto>
{
    public CategoriaClienteCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre de la categoría es obligatorio.");
    }
}
