using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Descuentos.DTOs;
using HandySales.Application.Descuentos.Validators;


namespace HandySales.Tests.Application.Descuentos
{
    public class DescuentoPorCantidadCreateDtoValidatorTests
    {
        private readonly DescuentoPorCantidadCreateDtoValidator _validator = new();

        [Fact]
        public void ProductoIdInvalido_DeberiaFallar()
        {
            var dto = new DescuentoPorCantidadCreateDto
            {
                ProductoId = 0,
                CantidadMinima = 10,
                DescuentoPorcentaje = 5,
                TipoAplicacion = "Producto"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.ProductoId);
        }

        [Fact]
        public void DescuentoMayor100_DeberiaFallar()
        {
            var dto = new DescuentoPorCantidadCreateDto
            {
                ProductoId = 1,
                CantidadMinima = 5,
                DescuentoPorcentaje = 150,
                TipoAplicacion = "Producto"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.DescuentoPorcentaje);
        }

        [Fact]
        public void TipoAplicacionInvalido_DeberiaFallar()
        {
            var dto = new DescuentoPorCantidadCreateDto
            {
                ProductoId = 1,
                CantidadMinima = 5,
                DescuentoPorcentaje = 10,
                TipoAplicacion = "Desconocido"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.TipoAplicacion);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new DescuentoPorCantidadCreateDto
            {
                ProductoId = 10,
                CantidadMinima = 3,
                DescuentoPorcentaje = 10,
                TipoAplicacion = "Producto"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
