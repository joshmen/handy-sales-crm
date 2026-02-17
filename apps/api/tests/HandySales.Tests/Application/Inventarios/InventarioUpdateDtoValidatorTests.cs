using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Inventario.DTOs;

namespace HandySales.Tests.Application.Inventarios
{
    public class InventarioUpdateDtoValidatorTests
    {
        private readonly InventarioUpdateDtoValidator _validator = new();

        [Fact]
        public void CantidadActualNegativa_DeberiaFallar()
        {
            var dto = new InventarioUpdateDto
            {
                CantidadActual = -1,
                StockMinimo = 5,
                StockMaximo = 10
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.CantidadActual);
        }

        [Fact]
        public void StockMaximoMenorQueMinimo_DeberiaFallar()
        {
            var dto = new InventarioUpdateDto
            {
                CantidadActual = 5,
                StockMinimo = 10,
                StockMaximo = 5
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.StockMaximo);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new InventarioUpdateDto
            {
                CantidadActual = 20,
                StockMinimo = 5,
                StockMaximo = 50
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
