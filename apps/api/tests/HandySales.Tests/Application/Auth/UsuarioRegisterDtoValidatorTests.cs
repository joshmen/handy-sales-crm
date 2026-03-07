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
                IdentificadorFiscal = new string('X', 21) // Excede 20 caracteres
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.IdentificadorFiscal);
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
                IdentificadorFiscal = "XAXX010101000",
                TipoIdentificadorFiscal = "RFC",
                Contacto = "Persona contacto"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }

        [Fact]
        public void IdentificadorFiscalFormatoInvalido_DeberiaFallar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA",
                IdentificadorFiscal = "ABC123", // Invalid RFC format
                TipoIdentificadorFiscal = "RFC"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.IdentificadorFiscal);
        }

        [Fact]
        public void IdentificadorFiscalRFCValido_DeberiaPasar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA",
                IdentificadorFiscal = "XAXX010101000",
                TipoIdentificadorFiscal = "RFC"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveValidationErrorFor(x => x.IdentificadorFiscal);
        }

        [Fact]
        public void IdentificadorFiscalNITValido_DeberiaPasar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA",
                IdentificadorFiscal = "900123456-7",
                TipoIdentificadorFiscal = "NIT"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveValidationErrorFor(x => x.IdentificadorFiscal);
        }

        [Fact]
        public void IdentificadorFiscalVacio_DeberiaPasar()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = "user@demo.com",
                Password = "segura123",
                Nombre = "Juan",
                NombreEmpresa = "Empresa SA",
                IdentificadorFiscal = "",
                TipoIdentificadorFiscal = "RFC"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveValidationErrorFor(x => x.IdentificadorFiscal);
        }
    }
}
