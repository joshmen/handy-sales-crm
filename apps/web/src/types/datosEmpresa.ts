export interface DatosEmpresa {
  id: number;
  tenantId: number;
  razonSocial?: string;
  rfc?: string;
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
  rfc?: string;
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
