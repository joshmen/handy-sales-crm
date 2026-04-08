using Xunit;
using FluentValidation.TestHelper;
using HandySuites.Application.ListasPrecios.DTOs;
namespace HandySuites.Tests.Application.ListasPrecios
{
    public class ListaPrecioCreateDtoValidatorTests
    {
        private readonly ListaPrecioCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new ListaPrecioCreateDto
            {
                Nombre = "",
                Descripcion = "Lista base"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void NombreValido_DeberiaPasar()
        {
            var dto = new ListaPrecioCreateDto
            {
                Nombre = "Lista General",
                Descripcion = "Aplica a todos los clientes"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
