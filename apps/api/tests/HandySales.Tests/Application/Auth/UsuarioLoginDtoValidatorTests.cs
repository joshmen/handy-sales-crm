using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Usuarios.Validators;

namespace HandySales.Tests.Application.Usuarios
{
    public class UsuarioLoginDtoValidatorTests
    {
        private readonly UsuarioLoginDtoValidator _validator = new();

        [Fact]
        public void emailVacio_DeberiaFallar()
        {
            var dto = new UsuarioLoginDto
            {
                email = "",
                password = "password123"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.email);
        }

        [Fact]
        public void emailInvalido_DeberiaFallar()
        {
            var dto = new UsuarioLoginDto
            {
                email = "correo_invalido",
                password = "password123"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.email);
        }

        [Fact]
        public void passwordVacio_DeberiaFallar()
        {
            var dto = new UsuarioLoginDto
            {
                email = "user@demo.com",
                password = ""
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.password);
        }

        [Fact]
        public void passwordMuyCorto_DeberiaFallar()
        {
            var dto = new UsuarioLoginDto
            {
                email = "user@demo.com",
                password = "123"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.password);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new UsuarioLoginDto
            {
                email = "user@demo.com",
                password = "segura123"
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
