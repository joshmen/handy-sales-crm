using FluentValidation.TestHelper;
using HandySales.Application.FamiliasProductos.DTOs;
using HandySales.Application.FamiliasProductos.Validators;
using Xunit;

namespace HandySales.Tests.Application.FamiliasProductos
{
    public class FamiliaProductoCreateDtoValidatorTests
    {
        private readonly FamiliaProductoCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "",
                Descripcion = "Algo"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void NombreMuyLargo_DeberiaFallar()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = new string('A', 101),
                Descripcion = "Algo"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void DescripcionMuyLarga_DeberiaFallar()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia",
                Descripcion = new string('B', 256)
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Descripcion);
        }

        [Fact]
        public void TenantIdInvalido_DeberiaFallar()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 0,
                Nombre = "Familia",
                Descripcion = "Algo"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.TenandId);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia válida",
                Descripcion = "Una descripción razonable"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
