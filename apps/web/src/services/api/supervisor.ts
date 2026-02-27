import api from '@/lib/api';

export interface SupervisorVendedor {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  avatarUrl: string | null;
}

export interface SupervisorDashboard {
  totalVendedores: number;
  pedidosHoy: number;
  pedidosMes: number;
  totalClientes: number;
  ventasMes: number;
}

export const supervisorService = {
  getMisVendedores: async (): Promise<SupervisorVendedor[]> => {
    const { data } = await api.get('/supervisores/mis-vendedores');
    return data;
  },

  getVendedoresDeSupervisor: async (supervisorId: number): Promise<SupervisorVendedor[]> => {
    const { data } = await api.get(`/supervisores/${supervisorId}/vendedores`);
    return data;
  },

  asignarVendedores: async (supervisorId: number, vendedorIds: number[]): Promise<{ message: string; asignados: number }> => {
    const { data } = await api.post(`/supervisores/${supervisorId}/asignar`, { vendedorIds });
    return data;
  },

  desasignarVendedor: async (supervisorId: number, vendedorId: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/supervisores/${supervisorId}/vendedores/${vendedorId}`);
    return data;
  },

  getDashboard: async (): Promise<SupervisorDashboard> => {
    const { data } = await api.get('/supervisores/dashboard');
    return data;
  },

  getVendedoresDisponibles: async (): Promise<SupervisorVendedor[]> => {
    const { data } = await api.get('/supervisores/vendedores-disponibles');
    return data;
  },
};
