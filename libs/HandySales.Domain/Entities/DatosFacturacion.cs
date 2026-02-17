using HandySales.Domain.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace HandySales.Domain.Entities
{
    /// <summary>
    /// Entidad para almacenar los datos de facturación requeridos por el SAT México (CFDI 4.0)
    /// </summary>
    public class DatosFacturacion : AuditableEntity
    {
        public int Id { get; set; }
        
        // Datos del contribuyente
        [Required]
        [StringLength(13)]
        public string RFC { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200)]
        public string RazonSocial { get; set; } = string.Empty;
        
        [StringLength(200)]
        public string NombreComercial { get; set; } = string.Empty;
        
        // Domicilio fiscal
        [Required]
        [StringLength(200)]
        public string Calle { get; set; } = string.Empty;
        
        [StringLength(10)]
        public string NumeroExterior { get; set; } = string.Empty;
        
        [StringLength(10)]
        public string NumeroInterior { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Colonia { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Municipio { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Estado { get; set; } = string.Empty;
        
        [Required]
        [StringLength(5)]
        public string CodigoPostal { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string Pais { get; set; } = "México";
        
        // Régimen fiscal
        [Required]
        [StringLength(3)]
        public string RegimenFiscal { get; set; } = string.Empty;
        // Catálogo de régimen fiscal SAT:
        // 601 - General de Ley Personas Morales
        // 603 - Personas Morales con Fines no Lucrativos
        // 605 - Sueldos y Salarios e Ingresos Asimilados a Salarios
        // 606 - Arrendamiento
        // 607 - Régimen de Enajenación o Adquisición de Bienes
        // 608 - Demás ingresos
        // 609 - Consolidación
        // 610 - Residentes en el Extranjero sin Establecimiento Permanente en México
        // 611 - Ingresos por Dividendos (socios y accionistas)
        // 612 - Personas Físicas con Actividades Empresariales y Profesionales
        // 614 - Ingresos por intereses
        // 615 - Régimen de los ingresos por obtención de premios
        // 616 - Sin obligaciones fiscales
        // 620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos
        // 621 - Incorporación Fiscal
        // 622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
        // 623 - Opcional para Grupos de Sociedades
        // 624 - Coordinados
        // 625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas
        // 626 - Régimen Simplificado de Confianza
        
        // Uso del CFDI predeterminado
        [StringLength(3)]
        public string UsoCFDI { get; set; } = "G03"; // Gastos en general
        // Catálogo de uso CFDI:
        // G01 - Adquisición de mercancías
        // G02 - Devoluciones, descuentos o bonificaciones
        // G03 - Gastos en general
        // I01 - Construcciones
        // I02 - Mobiliario y equipo de oficina por inversiones
        // I03 - Equipo de transporte
        // I04 - Equipo de cómputo y accesorios
        // I05 - Dados, troqueles, moldes, matrices y herramental
        // I06 - Comunicaciones telefónicas
        // I07 - Comunicaciones satelitales
        // I08 - Otra maquinaria y equipo
        // D01 - Honorarios médicos, dentales y gastos hospitalarios
        // D02 - Gastos médicos por incapacidad o discapacidad
        // D03 - Gastos funerales
        // D04 - Donativos
        // D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)
        // D06 - Aportaciones voluntarias al SAR
        // D07 - Primas por seguros de gastos médicos
        // D08 - Gastos de transportación escolar obligatoria
        // D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones
        // D10 - Pagos por servicios educativos (colegiaturas)
        // P01 - Por definir
        
        // Datos de contacto
        [EmailAddress]
        [StringLength(100)]
        public string CorreoElectronico { get; set; } = string.Empty;
        
        [Phone]
        [StringLength(20)]
        public string Telefono { get; set; } = string.Empty;
        
        // Certificados (rutas o IDs de archivos)
        [StringLength(500)]
        public string CertificadoCSD { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string LlaveCSD { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string PasswordCSD { get; set; } = string.Empty;
        
        // Logo para facturas
        [StringLength(500)]
        public string LogoFactura { get; set; } = string.Empty;
        
        // Serie y folio inicial
        [StringLength(10)]
        public string Serie { get; set; } = string.Empty;
        
        public int FolioInicial { get; set; } = 1;
        
        public int FolioActual { get; set; } = 1;
        
        // Relación con el tenant
        public int TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }
        
        // Configuraciones adicionales
        public bool FacturacionActiva { get; set; } = false;
        
        [StringLength(50)]
        public string VersionCFDI { get; set; } = "4.0";
        
        [StringLength(20)]
        public string LugarExpedicion { get; set; } = string.Empty; // Código postal del lugar de expedición
        
        // Datos del PAC (Proveedor Autorizado de Certificación)
        [StringLength(100)]
        public string NombrePAC { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string UsuarioPAC { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string PasswordPAC { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string URLPACTimbrado { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string URLPACCancelacion { get; set; } = string.Empty;
        
        // Tipo de comprobante predeterminado
        [StringLength(1)]
        public string TipoComprobantePredeterminado { get; set; } = "I"; // I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago
        
        // Forma de pago predeterminada
        [StringLength(2)]
        public string FormaPagoPredeterminada { get; set; } = "01"; // 01=Efectivo, 02=Cheque, 03=Transferencia, 04=Tarjeta de crédito, etc.
        
        // Método de pago predeterminado
        [StringLength(3)]
        public string MetodoPagoPredeterminado { get; set; } = "PUE"; // PUE=Pago en una sola exhibición, PPD=Pago en parcialidades o diferido
        
        // Moneda predeterminada
        [StringLength(3)]
        public string MonedaPredeterminada { get; set; } = "MXN";
    }
}