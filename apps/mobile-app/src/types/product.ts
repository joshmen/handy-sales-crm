export interface MobileProducto {
  id: number;
  nombre: string;
  codigoBarra: string;
  descripcion?: string;
  imagenUrl?: string;
  familiaId?: number;
  categoriaId?: number;
  unidadMedidaId?: number;
  precioBase: number;
  activo: boolean;
  familiaNombre?: string;
  categoriaNombre?: string;
  unidadNombre?: string;
  cantidadActual?: number;
  stockMinimo?: number;
}

export interface ProductStock {
  productoId: number;
  stock: number;
  disponible: boolean;
  minimo: number;
  enAlerta: boolean;
}
