using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Clientes.DTOs;
using HandySales.Application.Clientes.Validators;

namespace HandySales.Tests.Application.Clientes
{
    public class ClienteCreateDtoValidatorTests
    {
        private readonly ClienteCreateDtoValidator _validator = new();

        private ClienteCreateDto CrearDtoValido() => new ClienteCreateDto
        {
            TenandId = 1,
            Nombre = "Cliente válido",
            RFC = "ABC123456DEF",
            Correo = "cliente@valido.com",
            Telefono = "5512345678",
            Direccion = "Calle Falsa 123",
            IdZona = 1,
            CategoriaClienteId = 1
        };

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.Nombre = "";
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void RFCInvalido_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.RFC = "123";
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.RFC);
        }

        [Fact]
        public void CorreoInvalido_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.Correo = "noesuncorreo";
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Correo);
        }

        [Fact]
        public void TelefonoInvalido_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.Telefono = "123";
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Telefono);
        }

        [Fact]
        public void DireccionVacia_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.Direccion = "";
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Direccion);
        }

        [Fact]
        public void CategoriaClienteIdInvalido_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.CategoriaClienteId = 0;
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.CategoriaClienteId);
        }

        [Fact]
        public void IdZonaInvalido_DeberiaFallar()
        {
            var dto = CrearDtoValido();
            dto.IdZona = 0;
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.IdZona);
        }

        [Fact]
        public void DatosValidos_DeberianPasar()
        {
            var dto = CrearDtoValido();
            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
