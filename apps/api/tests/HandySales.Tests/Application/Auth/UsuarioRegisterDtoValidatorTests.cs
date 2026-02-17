using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Usuarios.Validators;

namespace HandySales.Tests.Application.Usuarios
{
    public class UsuarioRegisterDtoValidatorTests
    {
        private readonly UsuarioRegisterDtoValidator _validator = new();

        [Fact]
        public void EmailVacio_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "",
                Password = "password123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Email);
        }

        [Fact]
        public void PasswordMuyCorto_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Password);
        }

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "",
                NombreEmpresa = "Empresa SA"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Fact]
        public void NombreEmpresaVacio_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = ""
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.NombreEmpresa);
        }

        [Fact]
        public void RFCMayorALimite_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA",
                RFC = new string('X', 14) // Excede 13 caracteres
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.RFC);
        }

        [Fact]
        public void ContactoMayorALimite_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA",
                Contacto = new string('C', 101)
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Contacto);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan Pérez",
                NombreEmpresa = "Empresa SA",
                RFC = "ABC1234567890",
                Contacto = "Persona contacto"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
