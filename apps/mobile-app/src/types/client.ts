export interface MobileCliente {
  id: number;
  nombre: string;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  idZona: number;
  categoriaClienteId: number;
  latitud?: number;
  longitud?: number;
  vendedorId?: number;
  activo: boolean;
  zonaNombre?: string;
  categoriaNombre?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface ClienteCreateRequest {
  nombre: string;
  rfc?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  idZona?: number;
  categoriaClienteId?: number;
  latitud?: number;
  longitud?: number;
}
