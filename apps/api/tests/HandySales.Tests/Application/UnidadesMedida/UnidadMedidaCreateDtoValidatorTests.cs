using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.UnidadesMedida.DTOs;

namespace HandySales.Tests.Application.UnidadesMedida
{
    public class UnidadMedidaCreateDtoValidatorTests
    {
        private readonly UnidadMedidaCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = ""
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void NombreValido_DeberiaPasar()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = "Kilogramo"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
