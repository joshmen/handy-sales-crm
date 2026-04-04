import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export type TipoCupon =
  | 'MesesGratis'
  | 'UpgradePlan'
  | 'DescuentoPorcentaje'
  | 'PlanGratisPermanente';

export const TIPO_CUPON_OPTIONS: { value: TipoCupon; label: string }[] = [
  { value: 'MesesGratis', label: 'Meses Gratis' },
  { value: 'UpgradePlan', label: 'Upgrade de Plan' },
  { value: 'DescuentoPorcentaje', label: 'Descuento Porcentaje' },
  { value: 'PlanGratisPermanente', label: 'Plan Gratis Permanente' },
];

export interface CuponAdminDto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoCupon;
  mesesGratis: number | null;
  planObjetivo: string | null;
  mesesUpgrade: number | null;
  descuentoPorcentaje: number | null;
  maxUsos: number;
  usosActuales: number;
  fechaExpiracion: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface CuponCreateDto {
  nombre: string;
  tipo: TipoCupon;
  mesesGratis?: number | null;
  planObjetivo?: string | null;
  mesesUpgrade?: number | null;
  descuentoPorcentaje?: number | null;
  maxUsos?: number | null;
  fechaExpiracion?: string | null;
}

export interface CuponUpdateDto {
  nombre?: string | null;
  maxUsos?: number | null;
  fechaExpiracion?: string | null;
  activo?: boolean | null;
}

// ============ SERVICIO ============

class CuponAdminService {
  private basePath = '/api/superadmin/cupones';

  async getAll(): Promise<CuponAdminDto[]> {
    try {
      const res = await api.get<CuponAdminDto[]>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async create(dto: CuponCreateDto): Promise<{ id: number; codigo: string }> {
    try {
      const res = await api.post<{ id: number; codigo: string }>(this.basePath, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async update(id: number, dto: CuponUpdateDto): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, dto);
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

export const cuponAdminService = new CuponAdminService();
