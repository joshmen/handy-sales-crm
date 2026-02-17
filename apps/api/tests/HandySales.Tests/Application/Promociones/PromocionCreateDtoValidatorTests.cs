using Xunit;
using FluentValidation.TestHelper;
using HandySales.Application.Promociones.DTOs;
using System;

namespace HandySales.Tests.Application.Promociones
{
    public class PromocionCreateDtoValidatorTests
    {
        private readonly PromocionCreateDtoValidator _validator = new();

        [Fact]
        public void NombreVacio_DeberiaFallar()
        {
            var dto = new PromocionCreateDto { Nombre = "" };
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.Nombre);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-5)]
        public void ProductoIdInvalido_DeberiaFallar(int productoId)
        {
            var dto = new PromocionCreateDto { ProductoId = productoId };
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.ProductoId);
        }

        [Theory]
        [InlineData(-10)]
        [InlineData(150)]
        public void DescuentoPorcentajeFueraDeRango_DeberiaFallar(decimal descuento)
        {
            var dto = new PromocionCreateDto { DescuentoPorcentaje = descuento };
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.DescuentoPorcentaje);
        }

        [Fact]
        public void FechaInicioVacia_DeberiaFallar()
        {
            var dto = new PromocionCreateDto { FechaInicio = default };
            var result = _validator.TestValidate(dto);
            result.ShouldHaveValidationErrorFor(x => x.FechaInicio);
        }

        [Fact]
        public void DatosValidos_DeberiaPasar()
        {
            var dto = new PromocionCreateDto
            {
                Nombre = "Promo verano",
                ProductoId = 1,
                DescuentoPorcentaje = 15,
                FechaInicio = DateTime.Today,
                FechaFin = DateTime.Now.AddMonths(1),
                Descripcion = "descripción",
                TenandId = 1
            };

            var result = _validator.TestValidate(dto);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
