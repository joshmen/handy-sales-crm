import { api, handleApiError } from '@/lib/api';

// ============ TIPOS (reflejan los DTOs del backend en camelCase) ============

/**
 * Fila de la matriz de feature flags por modulo, con disponibilidad por tier
 * y la cantidad de overrides por tenant aplicados.
 * Backend: ModuloMatrizDto.
 */
export interface ModuloMatrizDto {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  disponibleBasico: boolean;
  disponiblePro: boolean;
  disponibleEnterprise: boolean;
  orden: number;
  activo: boolean;
  overridesCount: number;
}

/** Override de modulo por tenant. Backend: ModuloOverrideDto. */
export interface ModuloOverrideDto {
  id: number;
  moduloPlataformaId: number;
  tenantId: number;
  habilitado: boolean;
  motivo?: string | null;
}

/** Modulo completo con sus overrides. Backend: ModuloDto. */
export interface ModuloDto {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  disponibleBasico: boolean;
  disponiblePro: boolean;
  disponibleEnterprise: boolean;
  orden: number;
  activo: boolean;
  overrides: ModuloOverrideDto[];
}

/** Backend: ActualizarModuloDto. */
export interface ActualizarModuloDto {
  disponibleBasico: boolean;
  disponiblePro: boolean;
  disponibleEnterprise: boolean;
  nombre: string;
  descripcion?: string | null;
}

/** Backend: CrearModuloDto. */
export interface CrearModuloDto {
  clave: string;
  nombre: string;
  descripcion?: string | null;
  disponibleBasico: boolean;
  disponiblePro: boolean;
  disponibleEnterprise: boolean;
  orden: number;
}

/** Backend: CrearOverrideDto. */
export interface CrearOverrideDto {
  moduloPlataformaId: number;
  tenantId: number;
  habilitado: boolean;
  motivo?: string | null;
}

// ============ SERVICIO ============

class ModulesAdminService {
  private basePath = '/api/superadmin/feature-flags';

  /** Lista la matriz de modulos / feature flags. */
  async getMatriz(): Promise<ModuloMatrizDto[]> {
    try {
      const res = await api.get<ModuloMatrizDto[]>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Obtiene un modulo por ID con sus overrides. */
  async getById(id: number): Promise<ModuloDto> {
    try {
      const res = await api.get<ModuloDto>(`${this.basePath}/${id}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Crea un nuevo modulo de plataforma. */
  async create(dto: CrearModuloDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(this.basePath, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Actualiza disponibilidad por tier, nombre y descripcion de un modulo. */
  async update(id: number, dto: ActualizarModuloDto): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Elimina (soft-delete) un modulo de plataforma. */
  async remove(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Lista todos los overrides de modulo por tenant. */
  async getOverrides(): Promise<ModuloOverrideDto[]> {
    try {
      const res = await api.get<ModuloOverrideDto[]>(`${this.basePath}/overrides`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Crea un override de modulo para un tenant. */
  async createOverride(dto: CrearOverrideDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(`${this.basePath}/overrides`, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /** Elimina (soft-delete) un override de modulo. */
  async removeOverride(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/overrides/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const modulesAdminService = new ModulesAdminService();
