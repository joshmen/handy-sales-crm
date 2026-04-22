using Xunit;
using FluentValidation.TestHelper;
using HandySuites.Application.Productos.DTOs;

namespace HandySuites.Tests.Application.Productos
{
    public class ProductoCreateDtoValidatorTests
    {
        private readonly ProductoCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "",
                CodigoBarra = "123",
                Descripcion = "Producto prueba",
                PrecioBase = 10
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void PrecioNegativo_DeberiaFallar()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "Producto",
                CodigoBarra = "123",
                Descripcion = "Producto prueba",
                PrecioBase = -5
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.PrecioBase);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "Producto válido",
                CodigoBarra = "123456",
                Descripcion = "Detalle",
                PrecioBase = 99.99m,
                FamiliaId = 1,
                CategoraId = 1,
                UnidadMedidaId = 1
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
