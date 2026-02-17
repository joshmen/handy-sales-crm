using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.CategoriasClientes.DTOs;
using HandySales.Application.CategoriasClientes.Validators;

namespace HandySales.Tests.Application.CategoriasClientes
{
    public class CategoriaClienteCreateDtoValidatorTests
    {
        private readonly CategoriaClienteCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new CategoriaClienteCreateDto
            {
                Nombre = "",
                Descripcion = "Clientes minoristas"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void NombreValido_DeberiaPasar()
        {
            var dto = new CategoriaClienteCreateDto
            {
                Nombre = "Mayorista",
                Descripcion = "Clientes con alto volumen"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
