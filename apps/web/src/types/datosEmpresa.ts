export interface DatosEmpresa {
  id: number;
  tenantId: number;
  razonSocial?: string;
  identificadorFiscal?: string;
  tipoIdentificadorFiscal?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  sitioWeb?: string;
  descripcion?: string;
}

export interface DatosEmpresaUpdate {
  razonSocial?: string;
  identificadorFiscal?: string;
  tipoIdentificadorFiscal?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  sitioWeb?: string;
  descripcion?: string;
}
