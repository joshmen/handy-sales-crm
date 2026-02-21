import { api } from '@/lib/api';
import type { DatosEmpresa, DatosEmpresaUpdate } from '@/types/datosEmpresa';

export const datosEmpresaService = {
  get: () => api.get<DatosEmpresa>('/api/datos-empresa').then(r => r.data),
  update: (data: DatosEmpresaUpdate) => api.put<DatosEmpresa>('/api/datos-empresa', data).then(r => r.data),
};
