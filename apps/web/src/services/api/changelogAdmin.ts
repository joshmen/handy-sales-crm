import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

/** Tipo de novedad. El backend serializa el enum C# como NUMERO (int). */
export enum TipoNovedad {
  Nuevo = 0,
  Mejora = 1,
  Fix = 2,
}

/** Estado de la novedad. El backend serializa el enum C# como NUMERO (int). */
export enum EstadoNovedad {
  Borrador = 0,
  Publicado = 1,
}

export const TIPO_NOVEDAD_OPTIONS: { value: TipoNovedad; label: string }[] = [
  { value: TipoNovedad.Nuevo, label: 'Nuevo' },
  { value: TipoNovedad.Mejora, label: 'Mejora' },
  { value: TipoNovedad.Fix, label: 'Fix' },
];

/** Refleja NovedadDto (camelCase, enums como number). */
export interface NovedadDto {
  id: number;
  versionEtiqueta: string;
  tipo: number;
  fecha: string;
  titulo: string;
  descripcion: string;
  audiencia: string | null;
  estado: number;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string | null;
}

/** Refleja CrearNovedadDto. */
export interface CrearNovedadDto {
  versionEtiqueta: string;
  tipo: number;
  fecha: string;
  titulo: string;
  descripcion: string;
  audiencia: string | null;
  estado: number;
}

/** Refleja ActualizarNovedadDto. */
export interface ActualizarNovedadDto {
  versionEtiqueta: string;
  tipo: number;
  fecha: string;
  titulo: string;
  descripcion: string;
  audiencia: string | null;
  estado: number;
}

// ============ SERVICIO ============

class ChangelogAdminService {
  private basePath = '/api/superadmin/changelog';

  async getAll(): Promise<NovedadDto[]> {
    try {
      const res = await api.get<NovedadDto[]>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async create(dto: CrearNovedadDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(this.basePath, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async update(id: number, dto: ActualizarNovedadDto): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async publicar(id: number): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/publicar`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const changelogAdminService = new ChangelogAdminService();
