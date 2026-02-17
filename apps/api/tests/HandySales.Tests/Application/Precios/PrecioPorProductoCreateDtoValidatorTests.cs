using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Precios.DTOs;
using HandySales.Application.Precios.Validators;

namespace HandySales.Tests.Application.Precios
{
    public class PrecioPorProductoCreateDtoValidatorTests
    {
        private readonly PrecioPorProductoCreateDtoValidator _validator = new();

        [Fact]
        public void PrecioNegativo_DeberiaFallar()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 1,
                ListaPrecioId = 1,
                Precio = -10
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Precio);
        }

        [Fact]
        public void ProductoIdInvalido_DeberiaFallar()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 0,
                ListaPrecioId = 1,
                Precio = 100
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.ProductoId);
        }

        [Fact]
        public void ListaPrecioIdInvalido_DeberiaFallar()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 1,
                ListaPrecioId = 0,
                Precio = 100
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.ListaPrecioId);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 1,
                ListaPrecioId = 2,
                Precio = 250.50m
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
