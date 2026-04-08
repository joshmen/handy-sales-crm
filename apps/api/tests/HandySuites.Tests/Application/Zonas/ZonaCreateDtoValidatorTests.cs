using Xunit;
using FluentValidation.TestHelper;
using HandySuites.Application.Zonas.DTOs;
using HandySuites.Application.Zonas.Validators;

namespace HandySuites.Tests.Application.Zonas
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
