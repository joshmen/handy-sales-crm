using Xunit;
using FluentValidation.TestHelper;
using HandySuites.Application.CategoriasClientes.DTOs;
using HandySuites.Application.CategoriasClientes.Validators;

namespace HandySuites.Tests.Application.CategoriasClientes
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
