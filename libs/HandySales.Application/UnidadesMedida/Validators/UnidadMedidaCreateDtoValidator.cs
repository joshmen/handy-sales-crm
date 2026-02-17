using FluentValidation;
using HandySales.Application.UnidadesMedida.DTOs;

public class UnidadMedidaCreateDtoValidator : AbstractValidator<UnidadMedidaCreateDto>
{
    public UnidadMedidaCreateDtoValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre de la unidad es obligatorio.");
    }
}
