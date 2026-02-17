using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Zonas.DTOs;
using HandySales.Application.Zonas.Validators;

namespace HandySales.Tests.Application.Zonas
{
    public class ZonaCreateDtoValidatorTests
    {
        private readonly ZonaCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new CreateZonaDto
            {
                Nombre = "",
                Descripcion = "Zona norte"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new CreateZonaDto
            {
                Nombre = "Norte",
                Descripcion = "Zona del norte"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
