using System.ComponentModel.DataAnnotations;

namespace HandySales.Application.DatosFacturacion.DTOs
{
    public class CreateDatosFacturacionRequest
    {
        [Required(ErrorMessage = "El RFC es obligatorio")]
        [StringLength(13, MinimumLength = 12, ErrorMessage = "El RFC debe tener entre 12 y 13 caracteres")]
        public string RFC { get; set; } = string.Empty;

        [Required(ErrorMessage = "La razón social es obligatoria")]
        [StringLength(200, ErrorMessage = "La razón social no puede exceder 200 caracteres")]
        public string RazonSocial { get; set; } = string.Empty;

        [StringLength(100, ErrorMessage = "El nombre comercial no puede exceder 100 caracteres")]
        public string? NombreComercial { get; set; }

        [Required(ErrorMessage = "La calle es obligatoria")]
        [StringLength(100, ErrorMessage = "La calle no puede exceder 100 caracteres")]
        public string Calle { get; set; } = string.Empty;

        [StringLength(10, ErrorMessage = "El número exterior no puede exceder 10 caracteres")]
        public string? NumeroExterior { get; set; }

        [StringLength(10, ErrorMessage = "El número interior no puede exceder 10 caracteres")]
        public string? NumeroInterior { get; set; }

        [Required(ErrorMessage = "La colonia es obligatoria")]
        [StringLength(100, ErrorMessage = "La colonia no puede exceder 100 caracteres")]
        public string Colonia { get; set; } = string.Empty;

        [Required(ErrorMessage = "El municipio es obligatorio")]
        [StringLength(100, ErrorMessage = "El municipio no puede exceder 100 caracteres")]
        public string Municipio { get; set; } = string.Empty;

        [Required(ErrorMessage = "El estado es obligatorio")]
        [StringLength(100, ErrorMessage = "El estado no puede exceder 100 caracteres")]
        public string Estado { get; set; } = string.Empty;

        [Required(ErrorMessage = "El código postal es obligatorio")]
        [StringLength(5, MinimumLength = 5, ErrorMessage = "El código postal debe tener 5 dígitos")]
        [RegularExpression(@"^\d{5}$", ErrorMessage = "El código postal debe contener solo números")]
        public string CodigoPostal { get; set; } = string.Empty;

        [Required(ErrorMessage = "El país es obligatorio")]
        [StringLength(50, ErrorMessage = "El país no puede exceder 50 caracteres")]
        public string Pais { get; set; } = "México";

        [Required(ErrorMessage = "El régimen fiscal es obligatorio")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "El régimen fiscal debe tener 3 caracteres")]
        public string RegimenFiscal { get; set; } = string.Empty;

        [Required(ErrorMessage = "El uso del CFDI es obligatorio")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "El uso del CFDI debe tener 3 caracteres")]
        public string UsoCFDI { get; set; } = "G03";

        [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido")]
        [StringLength(100, ErrorMessage = "El correo electrónico no puede exceder 100 caracteres")]
        public string? CorreoElectronico { get; set; }

        [Phone(ErrorMessage = "El formato del teléfono no es válido")]
        [StringLength(20, ErrorMessage = "El teléfono no puede exceder 20 caracteres")]
        public string? Telefono { get; set; }

        public string? CertificadoCSD { get; set; }
        public string? LlaveCSD { get; set; }
        public string? PasswordCSD { get; set; }
        public string? LogoFactura { get; set; }

        [StringLength(10, ErrorMessage = "La serie no puede exceder 10 caracteres")]
        public string? Serie { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "El folio inicial debe ser mayor a 0")]
        public int FolioInicial { get; set; } = 1;

        [Range(1, int.MaxValue, ErrorMessage = "El folio actual debe ser mayor a 0")]
        public int FolioActual { get; set; } = 1;

        public bool FacturacionActiva { get; set; } = false;

        [Required(ErrorMessage = "La versión del CFDI es obligatoria")]
        [StringLength(5, ErrorMessage = "La versión del CFDI no puede exceder 5 caracteres")]
        public string VersionCFDI { get; set; } = "4.0";

        [StringLength(5, MinimumLength = 5, ErrorMessage = "El lugar de expedición debe ser un código postal de 5 dígitos")]
        public string? LugarExpedicion { get; set; }

        [StringLength(100, ErrorMessage = "El nombre del PAC no puede exceder 100 caracteres")]
        public string? NombrePAC { get; set; }

        [StringLength(100, ErrorMessage = "El usuario del PAC no puede exceder 100 caracteres")]
        public string? UsuarioPAC { get; set; }

        public string? PasswordPAC { get; set; }

        [Url(ErrorMessage = "La URL de timbrado del PAC no es válida")]
        public string? URLPACTimbrado { get; set; }

        [Url(ErrorMessage = "La URL de cancelación del PAC no es válida")]
        public string? URLPACCancelacion { get; set; }

        [Required(ErrorMessage = "El tipo de comprobante predeterminado es obligatorio")]
        [StringLength(1, MinimumLength = 1, ErrorMessage = "El tipo de comprobante debe tener 1 caracter")]
        public string TipoComprobantePredeterminado { get; set; } = "I";

        [Required(ErrorMessage = "La forma de pago predeterminada es obligatoria")]
        [StringLength(2, MinimumLength = 2, ErrorMessage = "La forma de pago debe tener 2 caracteres")]
        public string FormaPagoPredeterminada { get; set; } = "01";

        [Required(ErrorMessage = "El método de pago predeterminado es obligatorio")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "El método de pago debe tener 3 caracteres")]
        public string MetodoPagoPredeterminado { get; set; } = "PUE";

        [Required(ErrorMessage = "La moneda predeterminada es obligatoria")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "La moneda debe tener 3 caracteres")]
        public string MonedaPredeterminada { get; set; } = "MXN";
    }
}