using FluentValidation.TestHelper;
using HandySuites.Application.CategoriasProductos.DTOs;
using HandySuites.Application.CategoriasProductos.Validators;
using Xunit;

namespace HandySuites.Tests.Application.CategoriasProductos
{
    public class CategoriaProductoCreateDtoValidatorTests
    {
        private readonly CategoriaProductoCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = "",
                Descripcion = "Descripción válida"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void NombreDemasiadoLargo_DeberiaFallar()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = new string('a', 101),
                Descripcion = "Descripción válida"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void DescripcionDemasiadoLarga_DeberiaFallar()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = "Nombre válido",
                Descripcion = new string('b', 256)
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Descripcion);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = "Alimentos",
                Descripcion = "Categoría de productos comestibles"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }

        [Fact]
        public void DescripcionNula_DeberiaPasar()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = "Papelería",
                Descripcion = null
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveValidationErrorFor(x => x.Descripcion);
        }
    }
}
